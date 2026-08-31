from decimal import Decimal
from django.db import models
from django.utils import timezone
from core.models import BaseModel



class DiscountType(models.TextChoices):
    PERCENT = "percent", "Percentage"
    FIXED = "fixed", "Fixed Amount"


class Offer(BaseModel):
    """
    A promotional offer applied to specific products via HasActiveOffer.
    Offers activate/deactivate based on date range and status.
    """

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.BooleanField(default=True)

    class Meta(BaseModel.Meta):
        verbose_name = "Offer"
        verbose_name_plural = "Offers"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.discount_type}: {self.discount_value})"

    def is_active_today(self) -> bool:
        """Returns True if the offer is active on today's date."""
        today = timezone.now().date()
        return self.status and (self.start_date <= today <= self.end_date)

    def calculate_discount(self, amount: Decimal) -> Decimal:
        """Calculates discount amount for a given unit price or total."""
        if self.discount_type == DiscountType.PERCENT:
            discount = (amount * self.discount_value) / Decimal("100.00")
            return min(discount, amount).quantize(Decimal("0.01"))
        elif self.discount_type == DiscountType.FIXED:
            return min(self.discount_value, amount).quantize(Decimal("0.01"))
        return Decimal("0.00")



class HasActiveOffer(BaseModel):
    """
    Join table linking products to their active promotional offers.
    A product can have at most one active offer in a given date range (enforced in service layer).
    """

    offer = models.ForeignKey(
        Offer,
        on_delete=models.CASCADE,
        related_name="product_offers",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="active_offers",
    )
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta(BaseModel.Meta):
        verbose_name = "Active Offer"
        verbose_name_plural = "Active Offers"
        ordering = ["-created_at"]
        unique_together = [("offer", "product")]
        indexes = [
            models.Index(fields=["product", "start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.offer.title} -> {self.product.name}"
