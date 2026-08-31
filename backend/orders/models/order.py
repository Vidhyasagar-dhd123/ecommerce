from django.conf import settings
from django.db import models
from core.models import BaseModel
from orders.managers.order_manager import OrderManager


class OrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    SHIPPED = "shipped", "Shipped"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"
    RETURNED = "returned", "Returned"


class Order(BaseModel):
    """
    Customer purchase order representing an agreed sale.
    Manages order progression through the state machine:
    PENDING -> CONFIRMED -> SHIPPED -> DELIVERED -> RETURNED | CANCELLED

    Warehouse Locking:
    Orders can be viewed by all warehouses. Once locked by a warehouse,
    only employees of that warehouse (or admins) can update, access, or dispatch it.
    """

    customer = models.ForeignKey(
        "users.Customer",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    address = models.ForeignKey(
        "users.Address",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
    )
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    coupon_code = models.CharField(max_length=50, blank=True, default="")

    locked_by_warehouse = models.ForeignKey(
        "inventory.Warehouse",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="locked_orders",
    )
    locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="locked_orders",
    )
    locked_at = models.DateTimeField(null=True, blank=True)

    objects = OrderManager()
    all_objects = models.Manager()

    class Meta(BaseModel.Meta):
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ["-order_date"]
        indexes = [
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["order_date"]),
            models.Index(fields=["status"]),
            models.Index(fields=["locked_by_warehouse"]),
        ]

    def __str__(self) -> str:
        return f"Order #{self.pk} — {self.status}"

    @property
    def is_locked(self) -> bool:
        """Returns True if the order is currently locked by a warehouse."""
        return self.locked_by_warehouse_id is not None

    def can_cancel(self) -> bool:
        """Only PENDING and CONFIRMED orders can be cancelled by the customer."""
        return self.status in (OrderStatus.PENDING, OrderStatus.CONFIRMED)

