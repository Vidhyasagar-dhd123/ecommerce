from django.db import models
from core.models import BaseModel


class Wishlist(BaseModel):
    """
    One wishlist per customer.
    """

    customer = models.OneToOneField(
        "users.Customer",
        on_delete=models.CASCADE,
        related_name="wishlist",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Wishlist"
        verbose_name_plural = "Wishlists"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Wishlist of {self.customer}"


class WishlistItem(BaseModel):
    """
    Individual product saved in a customer's wishlist.
    """

    wishlist = models.ForeignKey(
        Wishlist,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="wishlisted_by",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Wishlist Item"
        verbose_name_plural = "Wishlist Items"
        ordering = ["-created_at"]
        unique_together = [("wishlist", "product")]
        indexes = [
            models.Index(fields=["wishlist", "product"]),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} in {self.wishlist}"
