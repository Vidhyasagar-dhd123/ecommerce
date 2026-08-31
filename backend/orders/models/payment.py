from django.db import models
from core.models import BaseModel


class PaymentMethod(models.TextChoices):
    COD = "cod", "Cash on Delivery"
    CASH = "cash", "Cash"
    UPI = "upi", "UPI"
    NETBANKING = "netbanking", "Net Banking"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    WAITING = "waiting", "Waiting"
    PAID = "paid", "Paid"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class Payment(BaseModel):
    """
    Payment record associated with an order.
    """

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="payment",
    )
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    transaction_id = models.CharField(max_length=255, blank=True, default="")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = "Payment"
        verbose_name_plural = "Payments"

    def __str__(self) -> str:
        return f"Payment for Order #{self.order_id} — {self.payment_status}"
