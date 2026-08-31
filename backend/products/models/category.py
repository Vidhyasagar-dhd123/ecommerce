from django.db import models
from core.models import BaseModel


class Category(BaseModel):
    """
    Self-referential category tree.
    Root categories have parent=None.
    """

    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategories",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    status = models.BooleanField(default=True)

    class Meta(BaseModel.Meta):
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self) -> str:
        return self.name

    def get_full_path(self) -> str:
        """Returns 'Electronics > Phones > Smartphones'."""
        if self.parent:
            return f"{self.parent.get_full_path()} > {self.name}"
        return self.name
