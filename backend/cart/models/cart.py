from decimal import Decimal
from django.db import models
from core.models import BaseModel


class Cart(BaseModel):
    """
    Shopping Cart representing a customer's collection of prospective purchases.
    Each customer has at most one active cart at a time.
    On checkout completion, the cart is deactivated (is_active=False).
    """

    customer = models.ForeignKey(
        "users.Customer",
        on_delete=models.CASCADE,
        related_name="carts",
    )
    is_active = models.BooleanField(default=True)

    class Meta(BaseModel.Meta):
        verbose_name = "Cart"
        verbose_name_plural = "Carts"
        indexes = [
            models.Index(fields=["customer", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"Cart #{self.pk} — {self.customer}"

    @property
    def total(self) -> Decimal:
        """Calculate the total price of all items in the cart."""
        return sum((item.subtotal for item in self.items.all()), Decimal("0.00"))
