from django.db import models
from django.conf import settings
from core.models import BaseModel


class ExchangeStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    COMPLETED = "completed", "Completed"


class Exchange(BaseModel):
    """
    Exchange request for swapping an ordered item for another variant.
    """

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="exchanges",
    )
    contact_person = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_exchanges",
    )
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=ExchangeStatus.choices,
        default=ExchangeStatus.PENDING,
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Exchange"
        verbose_name_plural = "Exchanges"

    def __str__(self) -> str:
        return f"Exchange for Order #{self.order_id} — {self.status}"
