"""
Import and ImportItem models for the Vendors domain.

An Import represents an actual goods receipt from a vendor into a warehouse.
When receive_import() is called, Inventory is updated and StockTransactions are logged.
"""

from django.db import models
from core.models import BaseModel


class ImportStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RECEIVED = "received", "Received"
    VERIFIED = "verified", "Verified"
    REJECTED = "rejected", "Rejected"


class Import(BaseModel):
    """
    Represents physical goods received from a vendor into a specific warehouse.

    Status lifecycle: pending → received → verified | rejected
    Use inventory.services.receive_import() to process this record.
    """

    vendor = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.PROTECT,
        related_name="imports",
    )
    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.PROTECT,
        related_name="imports",
    )
    import_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=ImportStatus.choices,
        default=ImportStatus.PENDING,
        db_index=True,
    )
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta(BaseModel.Meta):
        verbose_name = "Import"
        verbose_name_plural = "Imports"
        ordering = ["-import_date", "-created_at"]

    def __str__(self) -> str:
        return f"Import #{self.pk} from {self.vendor.name}"


class ImportItem(BaseModel):
    """A single line item in an Import — specifies variant, qty, and cost."""

    import_record = models.ForeignKey(
        Import,
        on_delete=models.CASCADE,
        related_name="items",
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.PROTECT,
        related_name="import_items",
    )
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta(BaseModel.Meta):
        verbose_name = "Import Item"
        verbose_name_plural = "Import Items"

    def __str__(self) -> str:
        return f"{self.variant.sku} x{self.quantity}"
