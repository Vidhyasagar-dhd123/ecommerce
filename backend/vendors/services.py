"""
Service layer for the Vendors domain.

Handles purchase order creation and import management.
Business logic for inventory updates lives in inventory/services.py.
"""

import logging
from decimal import Decimal
from django.db import transaction

from core.exceptions import DomainError
from .models import Vendor, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Import, ImportItem, ImportStatus

logger = logging.getLogger(__name__)


@transaction.atomic
def create_purchase_order(
    *,
    vendor: Vendor,
    items: list,
    created_by=None,
) -> PurchaseOrder:
    """
    Create a PurchaseOrder with line items.

    Args:
        vendor: The Vendor supplying the goods.
        items: List of dicts with keys: variant_id, quantity, unit_cost.
        created_by: The User creating the PO.

    Returns:
        The newly created PurchaseOrder.

    Raises:
        DomainError: If items list is empty.
    """
    if not items:
        raise DomainError("A Purchase Order must contain at least one item.")

    total_amount = sum(
        Decimal(str(item["unit_cost"])) * item["quantity"] for item in items
    )

    po = PurchaseOrder.objects.create(
        vendor=vendor,
        status=PurchaseOrderStatus.DRAFT,
        total_amount=total_amount,
        created_by=created_by,
    )

    po_items = [
        PurchaseOrderItem(
            purchase_order=po,
            variant_id=item["variant_id"],
            quantity=item["quantity"],
            unit_cost=Decimal(str(item["unit_cost"])),
            total_cost=Decimal(str(item["unit_cost"])) * item["quantity"],
        )
        for item in items
    ]
    PurchaseOrderItem.objects.bulk_create(po_items)

    logger.info(
        "PurchaseOrder #%s created for vendor '%s' (total=%s, items=%s)",
        po.pk,
        vendor.name,
        total_amount,
        len(po_items),
    )
    return po


@transaction.atomic
def create_import(
    *,
    vendor: Vendor,
    warehouse,
    import_date,
    items: list,
    created_by=None,
) -> Import:
    """
    Create an Import record with line items.

    Args:
        vendor: The Vendor delivering the goods.
        warehouse: The Warehouse where goods will be received.
        import_date: Expected or actual date of import.
        items: List of dicts with keys: variant_id, quantity, unit_cost.
        created_by: The User creating the import.

    Returns:
        The newly created Import (status=PENDING).
    """
    if not items:
        raise DomainError("An Import must contain at least one item.")

    total_amount = sum(
        Decimal(str(item["unit_cost"])) * item["quantity"] for item in items
    )

    import_record = Import.objects.create(
        vendor=vendor,
        warehouse=warehouse,
        import_date=import_date,
        status=ImportStatus.PENDING,
        total_amount=total_amount,
        created_by=created_by,
    )

    import_items = [
        ImportItem(
            import_record=import_record,
            variant_id=item["variant_id"],
            quantity=item["quantity"],
            unit_cost=Decimal(str(item["unit_cost"])),
            total_cost=Decimal(str(item["unit_cost"])) * item["quantity"],
        )
        for item in items
    ]
    ImportItem.objects.bulk_create(import_items)

    logger.info(
        "Import #%s created (vendor='%s', warehouse='%s', total=%s, items=%s)",
        import_record.pk,
        vendor.name,
        warehouse.name,
        total_amount,
        len(import_items),
    )
    return import_record
