"""
Service layer for the Inventory domain.

Provides atomic stock adjustments and import receipt processing.
All database mutations happen inside @transaction.atomic blocks.
"""

import logging
from django.db import transaction
from django.db.models import F, Sum

from core.exceptions import DomainError, InsufficientStockError, WarehouseAccessDeniedError
from core.permissions import validate_warehouse_access
from .models import Inventory, StockTransaction, StockTransactionType

logger = logging.getLogger(__name__)


def validate_employee_warehouse_access(employee, warehouse_id: int) -> None:
    """
    Validates that the employee belongs to and has permission for the specified warehouse.
    Delegates to centralized core.permissions.validate_warehouse_access.
    """
    validate_warehouse_access(employee, warehouse_id)



def _sync_variant_stock(variant_id: int) -> None:
    from products.models import ProductVariant

    total = (
        Inventory.objects.filter(variant_id=variant_id, is_deleted=False).aggregate(
            total=Sum("available_stock")
        )["total"]
        or 0
    )
    ProductVariant.objects.filter(pk=variant_id).update(stock=total)


@transaction.atomic
def reserve_stock(*, variant_id: int, quantity: int) -> Inventory:
    """Reserve a line from one warehouse and return its inventory record."""
    records = list(
        Inventory.objects.select_for_update()
        .filter(variant_id=variant_id, is_deleted=False)
        .order_by("pk")
    )
    inventory = next((record for record in records if record.available_stock >= quantity), None)
    if inventory is None:
        raise InsufficientStockError(
            f"No warehouse has {quantity} available units for variant {variant_id}."
        )

    inventory.reserved_stock += quantity
    inventory.update_available_stock()
    _sync_variant_stock(variant_id)
    return inventory


@transaction.atomic
def release_reserved_stock(*, inventory_id: int, quantity: int) -> None:
    """Release a reservation when an order is cancelled before dispatch."""
    inventory = Inventory.objects.select_for_update().get(pk=inventory_id)
    if inventory.reserved_stock < quantity:
        raise DomainError("Cannot release more reserved stock than exists.")
    inventory.reserved_stock -= quantity
    inventory.update_available_stock()
    _sync_variant_stock(inventory.variant_id)


@transaction.atomic
def ship_reserved_stock(*, inventory_id: int, quantity: int, employee=None, reference_id="") -> None:
    """Convert a reservation into a shipment and write an audit transaction."""
    inventory = Inventory.objects.select_for_update().get(pk=inventory_id)
    if employee:
        validate_employee_warehouse_access(employee, inventory.warehouse_id)

    if inventory.reserved_stock < quantity or inventory.stock < quantity:
        raise InsufficientStockError("Reserved stock is insufficient for dispatch.")
    inventory.stock -= quantity
    inventory.reserved_stock -= quantity
    inventory.update_available_stock()
    StockTransaction.objects.create(
        inventory=inventory,
        variant=inventory.variant,
        employee=employee,
        type=StockTransactionType.SHIP,
        quantity=-quantity,
        reference_id=reference_id,
        notes="Stock shipped for order",
    )
    _sync_variant_stock(inventory.variant_id)


@transaction.atomic
def return_stock(*, inventory_id: int, quantity: int, employee=None, reference_id="") -> None:
    """Put returned units back into the inventory row that fulfilled the order."""
    inventory = Inventory.objects.select_for_update().get(pk=inventory_id)
    if employee:
        validate_employee_warehouse_access(employee, inventory.warehouse_id)

    inventory.stock += quantity
    inventory.update_available_stock()
    StockTransaction.objects.create(
        inventory=inventory,
        variant=inventory.variant,
        employee=employee,
        type=StockTransactionType.RETURN,
        quantity=quantity,
        reference_id=reference_id,
        notes="Stock returned from customer order",
    )
    _sync_variant_stock(inventory.variant_id)


@transaction.atomic
def adjust_stock(
    *,
    inventory: Inventory,
    quantity: int,
    transaction_type: str,
    employee,
    reference_id: str = "",
    notes: str = "",
) -> StockTransaction:
    """
    Atomically adjust stock for an inventory record and create an audit log entry.

    Args:
        inventory: The Inventory record to adjust.
        quantity: Units to add (positive) or remove (negative).
        transaction_type: A StockTransactionType choice value.
        employee: The User performing the adjustment.
        reference_id: Optional FK reference (order_id, import_id, etc.).
        notes: Human-readable reason for adjustment.

    Returns:
        The newly created StockTransaction record.

    Raises:
        WarehouseAccessDeniedError: If the employee does not belong to this warehouse.
        InsufficientStockError: If removing more units than available.
    """
    # Lock the inventory row to prevent concurrent adjustments
    inv = Inventory.objects.select_for_update().get(pk=inventory.pk)

    if employee:
        validate_employee_warehouse_access(employee, inv.warehouse_id)

    if quantity < 0 and inv.available_stock < abs(quantity):
        logger.warning(
            "Stock adjustment rejected: requested to remove %s from %s (available=%s)",
            abs(quantity),
            inv,
            inv.available_stock,
        )
        raise InsufficientStockError(
            f"Cannot remove {abs(quantity)} units; only {inv.available_stock} available."
        )

    Inventory.objects.filter(pk=inv.pk).update(
        stock=F("stock") + quantity,
        available_stock=F("available_stock") + quantity,
    )
    inv.refresh_from_db()

    tx = StockTransaction.objects.create(
        inventory=inv,
        variant=inv.variant,
        employee=employee,
        type=transaction_type,
        quantity=quantity,
        reference_id=reference_id,
        notes=notes,
    )
    logger.info(
        "Stock adjustment: %s | variant=%s | qty=%s | employee=%s",
        transaction_type,
        inv.variant.sku,
        quantity,
        getattr(employee, "username", employee),
    )
    return tx


@transaction.atomic
def receive_import(*, import_record, received_by) -> None:
    """
    Mark an Import as received, update Inventory for every ImportItem,
    and create a StockTransaction audit record per item.

    Also syncs ProductVariant.stock with the cross-warehouse total.

    Raises:
        WarehouseAccessDeniedError: If the employee is not assigned to the import's warehouse.
        DomainError: If import_record is not in PENDING status.
    """
    from vendors.models import ImportStatus

    if received_by:
        validate_employee_warehouse_access(received_by, import_record.warehouse_id)

    if import_record.status != ImportStatus.PENDING:
        raise DomainError(
            f"Only PENDING imports can be received. Current status: {import_record.status}."
        )

    for item in import_record.items.select_related("variant").all():
        # Get-or-create inventory record for this variant/warehouse pair
        inv, created = Inventory.objects.get_or_create(
            warehouse=import_record.warehouse,
            variant=item.variant,
            defaults={"reorder_level": 10},
        )
        if created:
            logger.info(
                "Created new Inventory record for variant=%s in warehouse=%s",
                item.variant.sku,
                import_record.warehouse.name,
            )

        adjust_stock(
            inventory=inv,
            quantity=item.quantity,
            transaction_type=StockTransactionType.IMPORT,
            employee=received_by,
            reference_id=str(import_record.pk),
            notes=f"Import #{import_record.pk} received",
        )

        # Sync the denormalized ProductVariant.stock with cross-warehouse total
        from products.models import ProductVariant

        total = (
            Inventory.objects.filter(variant=item.variant).aggregate(
                total=Sum("available_stock")
            )["total"]
            or 0
        )
        ProductVariant.objects.filter(pk=item.variant_id).update(stock=total)
        logger.info(
            "ProductVariant %s stock synced to %s (cross-warehouse total)",
            item.variant.sku,
            total,
        )

    import_record.status = ImportStatus.RECEIVED
    import_record.save(update_fields=["status", "updated_at"])
    logger.info(
        "Import #%s marked as RECEIVED (%s items processed)",
        import_record.pk,
        import_record.items.count(),
    )

