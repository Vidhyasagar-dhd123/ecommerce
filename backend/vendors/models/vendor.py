"""
Vendor model for the Vendors domain.

Vendors are suppliers from whom the company purchases stock.
"""

from django.db import models
from core.models import BaseModel


class Vendor(BaseModel):
    """
    A supplier entity that provides stock to the business.
    Associated with PurchaseOrders and Imports.
    """

    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")

    class Meta(BaseModel.Meta):
        verbose_name = "Vendor"
        verbose_name_plural = "Vendors"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
