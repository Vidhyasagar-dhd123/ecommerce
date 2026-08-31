from django.db import models
from django.core.exceptions import ValidationError
from core.models import BaseModel


class Review(BaseModel):
    """
    A customer review and star rating for a purchased product.
    Strictly one review per customer per product.
    """

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    customer = models.ForeignKey(
        "users.Customer",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField()  # 1–5
    comment = models.TextField(blank=True, default="")

    class Meta(BaseModel.Meta):
        verbose_name = "Review"
        verbose_name_plural = "Reviews"
        ordering = ["-created_at"]
        unique_together = [("product", "customer")]
        indexes = [
            models.Index(fields=["product", "rating"]),
        ]

    def __str__(self) -> str:
        return f"{self.customer} -> {self.product.name}: {self.rating}★"

    def clean(self):
        if not (1 <= self.rating <= 5):
            raise ValidationError({"rating": "Rating must be between 1 and 5."})
