"""
Service layer for the Orders domain.

Handles atomic checkout, payment linking, invoice generation, stock reservation/restoration,
coupon discount application, and order cancellation.
"""

import uuid
import logging
from decimal import Decimal
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from core.exceptions import (
    CartEmptyError,
    InsufficientStockError,
    OrderCancellationError,
    InvalidStatusTransitionError,
    OrderLockedByOtherWarehouseError,
    OrderAlreadyLockedError,
    WarehouseAccessDeniedError,
)
from cart.models import Cart
from products.models import ProductVariant
from inventory.models import Inventory
from inventory.services import reserve_stock, release_reserved_stock
from promotions.services import (
    get_active_offer_for_product,
    validate_coupon,
    redeem_coupon,
)
from users.models import Address
from .models import Order, OrderItem, Payment, Invoice, OrderStatus, PaymentMethod

logger = logging.getLogger(__name__)


def _generate_invoice_number() -> str:
    """Generate a unique human-readable invoice code."""
    return f"INV-{uuid.uuid4().hex[:10].upper()}"


def validate_order_warehouse_access(order: Order, user) -> None:
    """
    Enforces warehouse-level order isolation.
    - Admins bypass restrictions.
    - Customers can access their own orders.
    - Employees can view any order, but once locked by a warehouse,
      only employees assigned to that warehouse can update/access it.
    """
    if not user or not user.is_authenticated:
        return
    if getattr(user, "is_admin_user", False):
        return
    if getattr(user, "is_customer", False):
        return

    if order.locked_by_warehouse_id:
        profile = getattr(user, "employee_profile", None)
        if not profile or profile.warehouse_id != order.locked_by_warehouse_id:
            locked_wh_name = (
                order.locked_by_warehouse.name
                if order.locked_by_warehouse
                else f"#{order.locked_by_warehouse_id}"
            )
            logger.warning(
                "Order access denied: Employee %s attempted to operate on Order #%s locked by %s",
                getattr(user, "username", user),
                order.pk,
                locked_wh_name,
            )
            raise OrderLockedByOtherWarehouseError(
                f"Order #{order.pk} is locked by warehouse '{locked_wh_name}'."
            )


@transaction.atomic
def lock_order(*, order: Order, employee) -> Order:
    """
    Lock an order to the employee's assigned warehouse.
    Only orders in PENDING status can be locked.
    If already locked by another warehouse, raises OrderAlreadyLockedError.
    If already locked by the same warehouse, refreshes the lock.
    """
    from django.utils import timezone

    locked_order = Order.objects.select_for_update().get(pk=order.pk)

    if locked_order.status != OrderStatus.PENDING:
        raise InvalidStatusTransitionError(
            f"Cannot lock order #{locked_order.pk}: Only orders in PENDING status can be locked."
        )

    if not getattr(employee, "is_admin_user", False):
        profile = getattr(employee, "employee_profile", None)
        if not profile or not profile.warehouse_id:
            raise WarehouseAccessDeniedError(
                "You must be assigned to a warehouse to lock an order."
            )
        target_warehouse = profile.warehouse
    else:
        profile = getattr(employee, "employee_profile", None)
        target_warehouse = (
            profile.warehouse
            if (profile and profile.warehouse)
            else (locked_order.locked_by_warehouse or None)
        )
        if not target_warehouse:
            first_item = (
                locked_order.items.filter(inventory__isnull=False)
                .select_related("inventory__warehouse")
                .first()
            )
            if first_item and first_item.inventory:
                target_warehouse = first_item.inventory.warehouse
            else:
                from inventory.models import Warehouse

                target_warehouse = Warehouse.objects.filter(is_deleted=False).first()

    if (
        locked_order.locked_by_warehouse_id
        and target_warehouse
        and locked_order.locked_by_warehouse_id != target_warehouse.pk
    ):
        wh_name = (
            locked_order.locked_by_warehouse.name
            if locked_order.locked_by_warehouse
            else f"#{locked_order.locked_by_warehouse_id}"
        )
        logger.warning(
            "Lock failed: Order #%s is already locked by warehouse '%s'",
            locked_order.pk,
            wh_name,
        )
        raise OrderAlreadyLockedError(
            f"Order #{locked_order.pk} is already locked by warehouse '{wh_name}'."
        )

    locked_order.locked_by_warehouse = target_warehouse
    locked_order.locked_by = employee
    locked_order.locked_at = timezone.now()
    locked_order.save(
        update_fields=["locked_by_warehouse", "locked_by", "locked_at", "updated_at"]
    )

    if target_warehouse:
        from inventory.models import Inventory
        for item in locked_order.items.all():
            wh_inv = Inventory.objects.filter(warehouse=target_warehouse, variant=item.variant).first()
            if wh_inv and item.inventory_id != wh_inv.pk:
                item.inventory = wh_inv
                item.save(update_fields=["inventory"])

    logger.info(
        "Order #%s locked by warehouse '%s' (Employee: %s)",
        locked_order.pk,
        target_warehouse.name if target_warehouse else "None",
        getattr(employee, "username", employee),
    )
    return locked_order


@transaction.atomic
def unlock_order(*, order: Order, employee) -> Order:
    """
    Unlock an order, making it available for other warehouses to lock.
    Only employees of the locking warehouse (or admins) can unlock the order,
    and only if the order is still in PENDING status.
    """
    locked_order = Order.objects.select_for_update().get(pk=order.pk)
    if not locked_order.locked_by_warehouse_id:
        return locked_order

    validate_order_warehouse_access(locked_order, employee)

    if locked_order.status != OrderStatus.PENDING:
        raise InvalidStatusTransitionError(
            f"Cannot release order #{locked_order.pk}: Only orders in PENDING status can be released."
        )

    locked_order.locked_by_warehouse = None
    locked_order.locked_by = None
    locked_order.locked_at = None
    locked_order.save(
        update_fields=["locked_by_warehouse", "locked_by", "locked_at", "updated_at"]
    )
    logger.info(
        "Order #%s unlocked by employee %s",
        locked_order.pk,
        getattr(employee, "username", employee),
    )
    return locked_order


@transaction.atomic
def create_order_from_cart(
    *,
    customer,
    address_id,
    payment_method: str,
    coupon_code: str = "",
) -> Order:
    """
    Convert an active shopping cart into a confirmed/pending Order.
    Atomically:
      1. Validate cart is not empty.
      2. Verify shipping address belongs to customer.
      3. Lock variants with select_for_update and validate stock.
      4. Calculate product-level discounts from active offers and coupon discounts on the fly.
      5. Create Order and OrderItems (with snapshot unit prices and item discounts).
      6. Decrement variant stock with atomic F() expressions.
      7. Create Payment record.
      8. Create formal Invoice.
      9. Deactivate cart.

    Raises:
        CartEmptyError: If cart does not exist or has 0 items.
        InsufficientStockError: If any variant has less stock than requested.
    """
    cart = (
        Cart.objects.filter(customer=customer, is_active=True)
        .prefetch_related("items__variant__product")
        .first()
    )

    if not cart or not cart.items.exists():
        logger.warning(
            "Checkout rejected: Active cart for customer #%s is empty", customer.pk
        )
        raise CartEmptyError("Cannot place an order with an empty cart.")

    # Validate address
    try:
        address = Address.objects.get(pk=address_id, customer=customer)
    except Address.DoesNotExist:
        logger.warning(
            "Checkout rejected: Address #%s not found for customer #%s",
            address_id,
            customer.pk,
        )
        raise ValueError("Invalid shipping address.")

    # Lock variants to prevent overselling race conditions
    cart_items = list(cart.items.select_related("variant__product").all())
    variant_ids = [item.variant_id for item in cart_items]
    variants = {
        v.pk: v
        for v in ProductVariant.objects.select_for_update().filter(pk__in=variant_ids)
    }

    # Validate stock before making any database modifications
    for item in cart_items:
        variant = variants.get(item.variant_id)
        inventory_records = list(
            Inventory.objects.filter(
                variant_id=item.variant_id,
                is_deleted=False,
            )
        )
        available = (
            sum(record.available_stock for record in inventory_records)
            if inventory_records
            else (variant.stock if variant else 0)
        )
        if not variant or available < item.quantity:
            sku = variant.sku if variant else "Unknown SKU"
            logger.warning(
                "Checkout aborted: Insufficient stock for %s (requested %s, available %s)",
                sku,
                item.quantity,
                available,
            )
            raise InsufficientStockError(
                f'Only {available} units of "{sku}" are available.'
            )

    # Calculate financial breakdown: Product offer discounts on the fly
    line_item_data = []
    gross_sub_total = Decimal("0.00")
    total_offer_discount = Decimal("0.00")

    for item in cart_items:
        unit_price = item.price
        line_gross = unit_price * item.quantity
        gross_sub_total += line_gross

        # Compute active product offer discount
        product = item.variant.product
        active_offer = get_active_offer_for_product(product)
        if active_offer:
            unit_discount = active_offer.calculate_discount(unit_price)
            line_offer_discount = (unit_discount * item.quantity).quantize(
                Decimal("0.01")
            )
        else:
            line_offer_discount = Decimal("0.00")

        total_offer_discount += line_offer_discount
        line_item_data.append(
            {
                "item": item,
                "unit_price": unit_price,
                "line_gross": line_gross,
                "offer_discount": line_offer_discount,
                "net_after_offer": line_gross - line_offer_discount,
            }
        )

    subtotal_after_offers = max(Decimal("0.00"), gross_sub_total - total_offer_discount)

    # Apply coupon discount if a code was provided
    coupon_discount_amount = Decimal("0.00")
    coupon_obj = None
    if coupon_code and coupon_code.strip():
        # validate_coupon raises DomainError subclasses on failure — propagate to caller
        coupon_obj = validate_coupon(code=coupon_code, cart=cart)
        coupon_discount_amount = coupon_obj.calculate_discount(subtotal_after_offers)
        logger.info(
            "Coupon '%s' applied: discount=%s on cart #%s",
            coupon_obj.code,
            coupon_discount_amount,
            cart.pk,
        )

    total_discount = total_offer_discount + coupon_discount_amount
    taxable_amount = max(Decimal("0.00"), gross_sub_total - total_discount)
    shipping_charge = Decimal("50.00")
    tax_rate = Decimal("0.18")  # 18% GST standard
    tax_amount = (taxable_amount * tax_rate).quantize(Decimal("0.01"))
    grand_total = taxable_amount + shipping_charge + tax_amount

    # 1. Create Order
    order = Order.objects.create(
        customer=customer,
        address=address,
        total_amount=grand_total,
        coupon_code=coupon_code,
        status=OrderStatus.PENDING,
    )

    # 2. Create OrderItems with individual discounts & Decrement Stock
    order_items = []
    for line in line_item_data:
        item = line["item"]
        variant = variants[item.variant_id]
        inventory = (
            reserve_stock(variant_id=variant.pk, quantity=item.quantity)
            if Inventory.objects.filter(
                variant_id=variant.pk, is_deleted=False
            ).exists()
            else None
        )

        # Allocate proportional coupon discount to line item
        if subtotal_after_offers > Decimal("0.00") and coupon_discount_amount > Decimal(
            "0.00"
        ):
            item_coupon_part = (
                (line["net_after_offer"] / subtotal_after_offers)
                * coupon_discount_amount
            ).quantize(Decimal("0.01"))
        else:
            item_coupon_part = Decimal("0.00")

        item_total_discount = line["offer_discount"] + item_coupon_part
        item_total_price = max(
            Decimal("0.00"), line["line_gross"] - item_total_discount
        )

        order_items.append(
            OrderItem(
                order=order,
                variant=variant,
                inventory=inventory,
                quantity=item.quantity,
                unit_price=line["unit_price"],  # Snapshot
                discount=item_total_discount,
                total_price=item_total_price,
            )
        )
        if inventory is None:
            ProductVariant.objects.filter(pk=variant.pk).update(
                stock=F("stock") - item.quantity
            )

    OrderItem.objects.bulk_create(order_items)

    # 3. Create Payment record
    valid_methods = [choice[0] for choice in PaymentMethod.choices]
    if payment_method not in valid_methods:
        payment_method = PaymentMethod.COD

    Payment.objects.create(
        order=order,
        payment_method=payment_method,
        amount=grand_total,
    )

    # 4. Create Invoice
    Invoice.objects.create(
        order=order,
        invoice_number=_generate_invoice_number(),
        sub_total=gross_sub_total,
        discount=total_discount,
        tax_amount=tax_amount,
        shipping_charge=shipping_charge,
        grand_total=grand_total,
    )

    # 5. Deactivate Cart
    cart.is_active = False
    cart.save(update_fields=["is_active", "updated_at"])

    # 6. Atomically increment coupon used_count after order is persisted
    if coupon_obj is not None:
        redeem_coupon(code=coupon_obj.code)

    logger.info(
        "Order #%s successfully created for Customer #%s (Total: %s, Discount: %s)",
        order.pk,
        customer.pk,
        grand_total,
        total_discount,
    )
    return order


@transaction.atomic
def confirm_order(*, order: Order, confirmed_by=None) -> Order:
    """
    Transition an order from PENDING to CONFIRMED.
    """
    if confirmed_by:
        validate_order_warehouse_access(order, confirmed_by)

    if order.status != OrderStatus.PENDING:
        logger.warning(
            "Cannot confirm order #%s in status '%s'", order.pk, order.status
        )
        raise InvalidStatusTransitionError(
            f"Order #{order.pk} must be in PENDING status to be confirmed."
        )

    order.status = OrderStatus.CONFIRMED
    if confirmed_by:
        order.updated_by = confirmed_by
    order.save(update_fields=["status", "updated_by", "updated_at"])
    logger.info("Order #%s transitioned to CONFIRMED", order.pk)
    return order


@transaction.atomic
def cancel_order(*, order: Order, cancelled_by=None) -> Order:
    """
    Cancel an order and restore the reserved inventory stock.
    Employees can only cancel an order if it is locked to their assigned warehouse (unless admin).
    Only PENDING or CONFIRMED orders can be cancelled.

    Raises:
        OrderCancellationError: If order is not in a cancellable state.
        WarehouseAccessDeniedError: If order is not locked to the employee's warehouse.
    """
    if cancelled_by and not getattr(cancelled_by, "is_customer", False):
        if not getattr(cancelled_by, "is_admin_user", False):
            profile = getattr(cancelled_by, "employee_profile", None)
            if (
                not order.locked_by_warehouse_id
                or not profile
                or profile.warehouse_id != order.locked_by_warehouse_id
            ):
                raise WarehouseAccessDeniedError(
                    f"Order #{order.pk} can only be cancelled by the warehouse that has it locked. Please lock the order first."
                )
        validate_order_warehouse_access(order, cancelled_by)

    if not order.can_cancel():
        logger.warning(
            "Cancellation rejected for Order #%s: Status '%s' is not cancellable",
            order.pk,
            order.status,
        )
        raise OrderCancellationError(
            f'Order #{order.pk} cannot be cancelled in status "{order.status}".'
        )

    # Restore stock for each order line item
    for item in order.items.all():
        if item.inventory_id:
            release_reserved_stock(
                inventory_id=item.inventory_id,
                quantity=item.quantity,
            )
        else:
            ProductVariant.objects.filter(pk=item.variant_id).update(
                stock=F("stock") + item.quantity
            )
        logger.info(
            "Restored %s units to variant ID %s due to order #%s cancellation",
            item.quantity,
            item.variant_id,
            order.pk,
        )

    order.status = OrderStatus.CANCELLED
    if cancelled_by:
        order.updated_by = cancelled_by
    order.save(update_fields=["status", "updated_by", "updated_at"])
    logger.info("Order #%s successfully cancelled", order.pk)
    return order


@transaction.atomic
def update_order_status(*, order: Order, new_status: str, employee) -> Order:
    """
    Update an order to a new status (confirmed, shipped, delivered, cancelled).
    Requires the order to be locked by the employee's warehouse (unless admin).
    """
    locked_order = Order.objects.select_for_update().get(pk=order.pk)

    if not getattr(employee, "is_admin_user", False):
        profile = getattr(employee, "employee_profile", None)
        if (
            not locked_order.locked_by_warehouse_id
            or not profile
            or profile.warehouse_id != locked_order.locked_by_warehouse_id
        ):
            raise WarehouseAccessDeniedError(
                f"Order #{locked_order.pk} must be locked by your warehouse before updating its status."
            )
        validate_order_warehouse_access(locked_order, employee)

    if new_status == OrderStatus.CANCELLED:
        return cancel_order(order=locked_order, cancelled_by=employee)

    if locked_order.status == OrderStatus.CANCELLED and new_status == OrderStatus.PENDING:
        # Check that the order was cancelled by staff / warehouse themselves
        was_cancelled_by_staff = (
            locked_order.updated_by is not None
            and (
                getattr(locked_order.updated_by, "is_employee", False)
                or getattr(locked_order.updated_by, "is_admin_user", False)
            )
        )
        if not was_cancelled_by_staff:
            raise InvalidStatusTransitionError(
                f"Order #{locked_order.pk} was cancelled by the customer and cannot be reinstated to Pending."
            )

        # Re-reserve inventory stock for the line items
        for item in locked_order.items.all():
            if item.inventory_id:
                reserve_stock(variant_id=item.variant_id, quantity=item.quantity)
            else:
                variant = ProductVariant.objects.select_for_update().get(pk=item.variant_id)
                if variant.stock < item.quantity:
                    raise InsufficientStockError(
                        f"Cannot reinstate Order #{locked_order.pk}: Insufficient stock for {variant.sku} (Available: {variant.stock}, Required: {item.quantity})."
                    )
                ProductVariant.objects.filter(pk=variant.pk).update(stock=F("stock") - item.quantity)
            logger.info(
                "Re-reserved %s units for variant ID %s on reopened Order #%s",
                item.quantity,
                item.variant_id,
                locked_order.pk,
            )

    valid_statuses = [choice[0] for choice in OrderStatus.choices]
    if new_status not in valid_statuses:
        raise InvalidStatusTransitionError(f"Invalid order status '{new_status}'.")

    # Handle return inventory restoration
    if new_status == OrderStatus.RETURNED and locked_order.status != OrderStatus.RETURNED:
        from inventory.services import return_stock
        for item in locked_order.items.all():
            if item.inventory_id:
                try:
                    return_stock(
                        inventory_id=item.inventory_id,
                        quantity=item.quantity,
                        employee=employee,
                        reference_id=f"order-returned-{locked_order.pk}",
                    )
                except Exception as e:
                    logger.warning("Could not return stock via inventory service: %s", e)
            else:
                ProductVariant.objects.filter(pk=item.variant_id).update(
                    stock=F("stock") + item.quantity
                )

    # Sync delivery date on shipment if transitioning to DELIVERED
    if new_status == OrderStatus.DELIVERED:
        if hasattr(locked_order, "shipment") and locked_order.shipment:
            if not locked_order.shipment.delivery_date:
                locked_order.shipment.delivery_date = timezone.now().date()
                locked_order.shipment.save(update_fields=["delivery_date", "updated_at"])

    locked_order.status = new_status
    if employee:
        locked_order.updated_by = employee
    locked_order.save(update_fields=["status", "updated_by", "updated_at"])
    logger.info(
        "Order #%s transitioned to '%s' by %s", locked_order.pk, new_status, employee
    )
    return locked_order
