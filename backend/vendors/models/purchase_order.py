"""
PurchaseOrder and PurchaseOrderItem models for the Vendors domain.

A PurchaseOrder represents a formal intent to procure goods from a vendor.
Once goods arrive, an Import record is created.
"""

from django.db import models
from core.models import BaseModel


class PurchaseOrderStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SENT = "sent", "Sent"
    CONFIRMED = "confirmed", "Confirmed"
    RECEIVED = "received", "Received"
    CANCELLED = "cancelled", "Cancelled"


class PurchaseOrder(BaseModel):
    """
    Formal procurement request sent to a Vendor.

    Status lifecycle: draft → sent → confirmed → received | cancelled
    """

    vendor = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    po_date = models.DateField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=PurchaseOrderStatus.choices,
        default=PurchaseOrderStatus.DRAFT,
        db_index=True,
    )
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta(BaseModel.Meta):
        verbose_name = "Purchase Order"
        verbose_name_plural = "Purchase Orders"
        ordering = ["-po_date", "-created_at"]

    def __str__(self) -> str:
        return f"PO #{self.pk} — {self.vendor.name}"


class PurchaseOrderItem(BaseModel):
    """A line item within a PurchaseOrder — specifies variant, qty, and unit cost."""

    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.PROTECT,
        related_name="po_items",
    )
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta(BaseModel.Meta):
        verbose_name = "Purchase Order Item"
        verbose_name_plural = "Purchase Order Items"

    def __str__(self) -> str:
        return f"{self.variant.sku} x{self.quantity}"
