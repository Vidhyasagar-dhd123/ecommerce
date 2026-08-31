from decimal import Decimal
from django.db import models
from django.utils import timezone
from core.models import BaseModel


class CouponDiscountType(models.TextChoices):
    PERCENT = "percent", "Percentage"
    FIXED = "fixed", "Fixed Amount"


class Coupon(BaseModel):
    """
    Promotional discount coupon applied at checkout.
    Supports fixed and percentage discounts, min order amounts, and usage limits.
    """

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=10, choices=CouponDiscountType.choices)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.BooleanField(default=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)  # None = unlimited
    used_count = models.PositiveIntegerField(default=0)

    class Meta(BaseModel.Meta):
        verbose_name = "Coupon"
        verbose_name_plural = "Coupons"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["status", "start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return self.code

    def is_valid(self) -> bool:
        """Checks if coupon is active, within date range, and has not exceeded usage limits."""
        today = timezone.now().date()
        if not self.status:
            return False
        if not (self.start_date <= today <= self.end_date):
            return False
        if self.usage_limit is not None and self.used_count >= self.usage_limit:
            return False
        return True

    def calculate_discount(self, amount: Decimal) -> Decimal:
        """Calculates discount amount for a given order total."""
        if self.discount_type == CouponDiscountType.PERCENT:
            discount = (amount * self.discount_value) / Decimal("100.00")
            return min(discount, amount)
        elif self.discount_type == CouponDiscountType.FIXED:
            return min(self.discount_value, amount)
        return Decimal("0.00")
