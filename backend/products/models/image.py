from django.db import models
from core.models import BaseModel


class ProductImage(BaseModel):
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="images",
    )
    image_url = models.URLField(max_length=500)
    is_primary = models.BooleanField(default=False)

    objects = models.Manager()
    all_objects = models.Manager()

    class Meta(BaseModel.Meta):
        verbose_name = "Product Image"
        verbose_name_plural = "Product Images"

    def __str__(self) -> str:
        return f"Image for {self.product.name} (primary={self.is_primary})"

