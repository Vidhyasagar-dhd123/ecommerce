"""
Cross-cutting Django signals for decoupled domain events.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender="orders.Order")
def on_order_created(sender, instance, created, **kwargs):
    """
    Handle post-order-creation tasks (e.g., logging, async notifications).
    """
    if created:
        logger.info("Order #%s created for Customer #%s", instance.pk, instance.customer_id)


@receiver(post_save, sender="orders.Order")
def on_order_status_change(sender, instance, created, **kwargs):
    """
    Handle order status changes (e.g., dispatch notifications, customer alerts).
    """
    if not created:
        logger.info("Order #%s status updated to: %s", instance.pk, instance.status)


@receiver(post_save, sender="orders.Payment")
def on_payment_success(sender, instance, **kwargs):
    """
    When a payment transitions to PAID, automatically confirm a PENDING order.
    """
    from orders.models import OrderStatus, PaymentStatus

    if instance.payment_status == PaymentStatus.PAID:
        order = instance.order
        if order.status == OrderStatus.PENDING:
            logger.info(
                "Payment for Order #%s marked PAID. Transitioning order status to CONFIRMED.",
                order.pk,
            )
            order.status = OrderStatus.CONFIRMED
            order.save(update_fields=["status", "updated_at"])
