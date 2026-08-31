from django.db import models
from core.models import BaseModel


class DuesStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    OVERDUE = "overdue", "Overdue"


class Dues(BaseModel):
    """
    Outstanding financial obligation for a customer (e.g., unpaid COD or credit settlement).
    """

    customer = models.ForeignKey(
        "users.Customer",
        on_delete=models.PROTECT,
        related_name="dues",
    )
    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="dues",
        help_text="Warehouse facility associated with this financial obligation.",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=DuesStatus.choices,
        default=DuesStatus.PENDING,
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Due"
        verbose_name_plural = "Dues"
        ordering = ["-due_date"]
        indexes = [
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["warehouse", "status"]),
            models.Index(fields=["due_date"]),
        ]


    def __str__(self) -> str:
        return f"Due #{self.pk} — {self.amount} for {self.customer} ({self.status})"
