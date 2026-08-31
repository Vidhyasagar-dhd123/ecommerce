from django.db import models
from core.models import BaseModel
from products.managers import VariantManager


class ProductVariant(BaseModel):
    """
    A purchasable SKU. Customers add variants (not products) to cart.
    price overrides the product's base_price for this specific combination.
    """

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="variants",
    )
    sku = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=50, blank=True, default="")
    size = models.CharField(max_length=50, blank=True, default="")
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    weight = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    status = models.BooleanField(default=True)

    objects = VariantManager()
    all_objects = models.Manager()

    class Meta(BaseModel.Meta):
        verbose_name = "Product Variant"
        verbose_name_plural = "Product Variants"
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["product", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} — {self.sku}"

    @property
    def is_in_stock(self) -> bool:
        return self.stock > 0
