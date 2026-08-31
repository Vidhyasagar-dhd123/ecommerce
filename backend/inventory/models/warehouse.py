"""
Warehouse model for the Inventory domain.

A Warehouse is a physical storage facility. Inventory records track
how many units of each product variant are held per warehouse.
"""

from django.db import models
from core.models import BaseModel


class Warehouse(BaseModel):
    """
    Physical storage location for inventory.
    Status=False warehouses are inactive (closed/decommissioned).
    """

    name = models.CharField(max_length=255)
    location = models.TextField()
    contact_number = models.CharField(max_length=20, blank=True, default="")
    status = models.BooleanField(default=True)

    class Meta(BaseModel.Meta):
        verbose_name = "Warehouse"
        verbose_name_plural = "Warehouses"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
