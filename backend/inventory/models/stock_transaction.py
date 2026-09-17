"""
StockTransaction model for the Inventory domain.

Immutable audit log of every stock movement. Never update or delete these records.
"""

from django.db import models
from django.conf import settings
from core.models import BaseModel


class StockTransactionType(models.TextChoices):
    IMPORT = "import", "Import"
    SHIP = "ship", "Ship"
    SALE = "sale", "Sale"
    RETURN = "return", "Return"
    ADJUSTMENT = "adjustment", "Adjustment"
    TRANSFER_OUT = "transfer_out", "Transfer Out"
    TRANSFER_IN = "transfer_in", "Transfer In"


class StockTransaction(BaseModel):
    """
    Immutable record of every stock movement for full audit traceability.

    Rules:
    - quantity > 0: stock is added (import, return).
    - quantity < 0: stock is removed (sale, ship).
    - Never delete or update — append-only audit log.
    - reference_id links to the associated Order, Import, or Return PK.
    """

    inventory = models.ForeignKey(
        "inventory.Inventory",
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.PROTECT,
        related_name="stock_transactions",
    )
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_transactions",
    )
    type = models.CharField(
        max_length=20,
        choices=StockTransactionType.choices,
        db_index=True,
    )
    quantity = models.IntegerField()  # positive=in, negative=out
    transaction_date = models.DateField(auto_now_add=True)
    reference_id = models.CharField(
        max_length=100, blank=True, default=""
    )  # e.g., order_id, import_id
    notes = models.TextField(blank=True, default="")

    class Meta(BaseModel.Meta):
        verbose_name = "Stock Transaction"
        verbose_name_plural = "Stock Transactions"
        ordering = ["-transaction_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.type} | {self.variant.sku} | qty={self.quantity}"
