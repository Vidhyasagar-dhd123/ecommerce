from django.db import models
from core.models import BaseModel


class RefundStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSED = "processed", "Processed"
    REJECTED = "rejected", "Rejected"


class Refund(BaseModel):
    """
    Monetary refund issued against a payment.
    """

    payment = models.ForeignKey(
        "orders.Payment",
        on_delete=models.PROTECT,
        related_name="refunds",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=RefundStatus.choices,
        default=RefundStatus.PENDING,
    )
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = "Refund"
        verbose_name_plural = "Refunds"

    def __str__(self) -> str:
        return f"Refund #{self.pk} — {self.amount} ({self.status})"
