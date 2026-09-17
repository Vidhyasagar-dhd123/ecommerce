"""
Service layer for the Fulfillment domain.

Handles order dispatching, carrier tracking, delivery confirmations, return approvals/rejections,
and payment refunds.
"""

import logging
from django.db import transaction
from django.utils import timezone

from core.exceptions import (
    DomainError,
    ShipmentAlreadyExistsError,
    InvalidStatusTransitionError,
)
from orders.models import Order, OrderStatus, PaymentStatus
from inventory.models import Warehouse
from inventory.services import return_stock, ship_reserved_stock
from .models import (
    Shipment,
    Return,
    ReturnStatus,
    Refund,
    RefundStatus,
)

logger = logging.getLogger(__name__)


# ── Shipment Operations ───────────────────────────────────────────────────────


@transaction.atomic
def dispatch_order(
    *,
    order: Order,
    warehouse_id,
    tracking_number: str,
    carrier: str,
    ship_date=None,
    dispatched_by=None,
) -> Shipment:
    """
    Create a shipment record for an order and advance its status to SHIPPED.
    Only orders in CONFIRMED status can be dispatched.

    Raises:
        ShipmentAlreadyExistsError: If a shipment is already assigned to this order.
        InvalidStatusTransitionError: If order is not CONFIRMED.
    """
    if hasattr(order, "shipment") or Shipment.objects.filter(order=order).exists():
        logger.warning("Dispatch failed: Order #%s already has a shipment", order.pk)
        raise ShipmentAlreadyExistsError(f"Order #{order.pk} already has a shipment.")

    if order.status != OrderStatus.CONFIRMED:
        logger.warning(
            "Dispatch failed: Order #%s status is '%s', must be CONFIRMED",
            order.pk,
            order.status,
        )
        raise InvalidStatusTransitionError(
            f"Order must be CONFIRMED to dispatch. Current status: {order.status}"
        )

    try:
        warehouse = Warehouse.objects.get(pk=warehouse_id)
    except Warehouse.DoesNotExist:
        logger.warning("Warehouse ID %s not found during dispatch", warehouse_id)
        raise ValueError("Invalid warehouse ID.")

    if order.locked_by_warehouse_id and order.locked_by_warehouse_id != warehouse.pk:
        raise DomainError(
            f"Order #{order.pk} is locked by warehouse '{order.locked_by_warehouse.name}' and cannot be dispatched from '{warehouse.name}'."
        )

    if dispatched_by:
        from core.permissions import validate_warehouse_access
        from orders.services import validate_order_warehouse_access
        validate_warehouse_access(dispatched_by, warehouse.pk)
        validate_order_warehouse_access(order, dispatched_by)


    ship_date_val = ship_date or timezone.now().date()

    shipment = Shipment.objects.create(
        order=order,
        warehouse=warehouse,
        tracking_number=tracking_number,
        carrier=carrier,
        ship_date=ship_date_val,
        created_by=dispatched_by,
    )

    for item in order.items.all():
        inv_to_ship = None
        if item.inventory and item.inventory.warehouse_id == warehouse.pk:
            inv_to_ship = item.inventory
        else:
            from inventory.models import Inventory
            inv_to_ship = Inventory.objects.filter(warehouse=warehouse, variant=item.variant).first()
            if inv_to_ship:
                item.inventory = inv_to_ship
                item.save(update_fields=["inventory"])

        if inv_to_ship:
            ship_reserved_stock(
                inventory_id=inv_to_ship.pk,
                quantity=item.quantity,
                employee=dispatched_by,
                reference_id=str(order.pk),
            )

    order.status = OrderStatus.SHIPPED
    if dispatched_by:
        order.updated_by = dispatched_by
    order.save(update_fields=["status", "updated_at"])

    logger.info(
        "Order #%s successfully dispatched from %s (Tracking: %s)",
        order.pk,
        warehouse.name,
        tracking_number,
    )
    return shipment


@transaction.atomic
def mark_delivered(
    *,
    shipment: Shipment,
    delivery_date=None,
    updated_by=None,
) -> Shipment:
    """
    Mark a shipment as delivered and transition the underlying order status to DELIVERED.
    """
    delivery_val = delivery_date or timezone.now().date()
    shipment.delivery_date = delivery_val
    if updated_by:
        shipment.updated_by = updated_by
    shipment.save(update_fields=["delivery_date", "updated_at"])

    order = shipment.order
    order.status = OrderStatus.DELIVERED
    if updated_by:
        order.updated_by = updated_by
    order.save(update_fields=["status", "updated_at"])

    logger.info("Shipment #%s for Order #%s marked DELIVERED", shipment.pk, order.pk)
    return shipment


# ── Return Operations ──────────────────────────────────────────────────────────


def request_return(*, order: Order, reason: str, customer) -> Return:
    """
    Customer creates a return request for a delivered order.

    Raises:
        DomainError: If order is not DELIVERED or does not belong to customer.
    """
    if order.status != OrderStatus.DELIVERED:
        logger.warning("Return rejected: Order #%s is not DELIVERED", order.pk)
        raise DomainError("Returns can only be requested for DELIVERED orders.")

    if order.customer.user != customer:
        logger.warning("Return rejected: User %s does not own order #%s", customer, order.pk)
        raise DomainError("You can only request returns for your own orders.")

    return_obj = Return.objects.create(
        order=order,
        reason=reason,
        status=ReturnStatus.RECEIVED,
    )
    logger.info("Return request #%s created for Order #%s", return_obj.pk, order.pk)
    return return_obj


@transaction.atomic
def approve_return(*, return_obj: Return, approved_by=None) -> Return:
    """
    Support Agent approves a received return, transitioning order status to RETURNED.

    Raises:
        InvalidStatusTransitionError: If return is not in RECEIVED state.
    """
    if return_obj.status != ReturnStatus.RECEIVED:
        logger.warning("Cannot approve return #%s in status '%s'", return_obj.pk, return_obj.status)
        raise InvalidStatusTransitionError("Only RECEIVED returns can be approved.")

    return_obj.status = ReturnStatus.APPROVED
    if approved_by:
        return_obj.updated_by = approved_by
    return_obj.save(update_fields=["status", "updated_at"])

    order = return_obj.order
    order.status = OrderStatus.RETURNED
    if approved_by:
        order.updated_by = approved_by
    order.save(update_fields=["status", "updated_at"])

    for item in order.items.all():
        if item.inventory_id:
            return_stock(
                inventory_id=item.inventory_id,
                quantity=item.quantity,
                employee=approved_by,
                reference_id=str(return_obj.pk),
            )

    logger.info("Return #%s for Order #%s APPROVED", return_obj.pk, order.pk)
    return return_obj


def reject_return(*, return_obj: Return, rejected_by=None) -> Return:
    """
    Support Agent rejects a return request.

    Raises:
        InvalidStatusTransitionError: If return is not in RECEIVED state.
    """
    if return_obj.status != ReturnStatus.RECEIVED:
        logger.warning("Cannot reject return #%s in status '%s'", return_obj.pk, return_obj.status)
        raise InvalidStatusTransitionError("Only RECEIVED returns can be rejected.")

    return_obj.status = ReturnStatus.REJECTED
    if rejected_by:
        return_obj.updated_by = rejected_by
    return_obj.save(update_fields=["status", "updated_at"])

    logger.info("Return #%s for Order #%s REJECTED", return_obj.pk, return_obj.order_id)
    return return_obj


# ── Refund Operations ──────────────────────────────────────────────────────────


@transaction.atomic
def process_refund(
    *,
    return_obj: Return,
    amount,
    reason: str,
    processed_by=None,
) -> Refund:
    """
    Process a monetary refund for an APPROVED return.
    Updates the associated payment status to REFUNDED.

    Raises:
        DomainError: If the return is not APPROVED.
    """
    if return_obj.status != ReturnStatus.APPROVED:
        logger.warning(
            "Refund rejected: Return #%s is not APPROVED (status: %s)",
            return_obj.pk,
            return_obj.status,
        )
        raise DomainError("Refund can only be issued for APPROVED returns.")

    payment = return_obj.order.payment

    refund = Refund.objects.create(
        payment=payment,
        amount=amount,
        reason=reason,
        status=RefundStatus.PROCESSED,
        refunded_at=timezone.now(),
        created_by=processed_by,
    )

    payment.payment_status = PaymentStatus.REFUNDED
    if processed_by:
        payment.updated_by = processed_by
    payment.save(update_fields=["payment_status", "updated_at"])

    logger.info(
        "Refund #%s of %s processed for Payment #%s (Order #%s)",
        refund.pk,
        amount,
        payment.pk,
        return_obj.order_id,
    )
    return refund
