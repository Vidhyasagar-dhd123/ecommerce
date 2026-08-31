from django.db import models
from django.conf import settings


class AuditModel(models.Model):
    """
    Abstract model mixin providing created_by and updated_by audit fields.

    Uses %(app_label)s_%(class)s in related_name to prevent reverse accessor
    collisions when different apps define models with the same class name
    (e.g., fulfillment.Warehouse and inventory.Warehouse).
    """

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_%(app_label)s_%(class)s_set",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_%(app_label)s_%(class)s_set",
    )

    class Meta:
        abstract = True
