from django.db import models
from core.models import BaseModel


class OrderItem(BaseModel):
    """
    Line item belonging to an order.
    CRITICAL: unit_price is an immutable snapshot at checkout time.
    """

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="items",
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    inventory = models.ForeignKey(
        "inventory.Inventory",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="order_items",
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)  # Price snapshot
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta(BaseModel.Meta):
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self) -> str:
        return f"{self.variant.sku} x{self.quantity} @ {self.unit_price}"

    def save(self, *args, **kwargs):
        self.total_price = (self.unit_price * self.quantity) - self.discount
        super().save(*args, **kwargs)
