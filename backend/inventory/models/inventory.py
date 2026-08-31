"""
Inventory model for the Inventory domain.

Tracks the stock levels of a product variant within a specific warehouse.
available_stock = stock - reserved_stock
"""

from django.db import models
from core.models import BaseModel


class Inventory(BaseModel):
    """
    Per-warehouse stock record for a product variant.

    - stock: Total physical units present in warehouse.
    - reserved_stock: Units reserved for confirmed-but-not-dispatched orders.
    - available_stock: Freely purchaseable units (stock - reserved_stock).
    - reorder_level: Alert threshold — when available_stock <= reorder_level,
                     the Inventory Manager should reorder.
    """

    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.PROTECT,
        related_name="inventory_records",
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.PROTECT,
        related_name="inventory_records",
    )
    stock = models.PositiveIntegerField(default=0)
    reserved_stock = models.PositiveIntegerField(default=0)
    available_stock = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)

    class Meta(BaseModel.Meta):
        unique_together = [("warehouse", "variant")]
        verbose_name = "Inventory"
        verbose_name_plural = "Inventory"
        ordering = ["warehouse__name", "variant__sku"]

    def __str__(self) -> str:
        return f"{self.variant.sku} @ {self.warehouse.name}: {self.available_stock} available"

    def update_available_stock(self) -> None:
        """Recompute and persist available_stock from current stock and reserved_stock."""
        self.available_stock = max(0, self.stock - self.reserved_stock)
        self.save(
            update_fields=["stock", "reserved_stock", "available_stock", "updated_at"]
        )

    @property
    def needs_reorder(self) -> bool:
        """True when available stock has dropped to or below the reorder threshold."""
        return self.available_stock <= self.reorder_level
