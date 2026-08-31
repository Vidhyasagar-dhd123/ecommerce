from django.db import models
from core.models import BaseModel


class ReturnStatus(models.TextChoices):
    RECEIVED = "received", "Received"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    COMPLETED = "completed", "Completed"


class Return(BaseModel):
    """
    Customer return request for a delivered order.
    """

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="returns",
    )
    return_date = models.DateField(auto_now_add=True)
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=ReturnStatus.choices,
        default=ReturnStatus.RECEIVED,
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Return"
        verbose_name_plural = "Returns"

    def __str__(self) -> str:
        return f"Return for Order #{self.order_id} — {self.status}"
