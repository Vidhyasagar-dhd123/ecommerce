from django.db import models
from core.models import BaseModel


class Brand(BaseModel):
    brand_name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    status = models.BooleanField(default=True)

    class Meta(BaseModel.Meta):
        verbose_name = "Brand"
        verbose_name_plural = "Brands"

    def __str__(self) -> str:
        return self.brand_name
