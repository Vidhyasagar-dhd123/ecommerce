"""
Base Model Manager definitions.
"""

from django.db.models import Manager
from core.querysets.base_queryset import SoftDeleteQuerySet


class SoftDeleteManager(Manager):
    """
    Default manager that excludes soft-deleted records.
    Can be used alongside all_objects = models.Manager() for admin access.
    """

    def get_queryset(self) -> SoftDeleteQuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db).active()

    def deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db).deleted()
