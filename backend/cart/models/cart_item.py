from decimal import Decimal
from django.db import models
from core.models import BaseModel


class CartItem(BaseModel):
    """
    Line item inside a customer's shopping cart.
    Price is recorded as a snapshot at the time of addition.
    """

    cart = models.ForeignKey(
        "cart.Cart",
        on_delete=models.CASCADE,
        related_name="items",
    )
    variant = models.ForeignKey(
        "products.ProductVariant",
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta(BaseModel.Meta):
        unique_together = [("cart", "variant")]
        verbose_name = "Cart Item"
        verbose_name_plural = "Cart Items"

    def __str__(self) -> str:
        return f"{self.variant.sku} x{self.quantity}"

    @property
    def subtotal(self) -> Decimal:
        """Calculate line item subtotal."""
        return self.price * self.quantity
