"""
Base QuerySet definitions for the application.
"""

from django.db.models import QuerySet
from django.utils import timezone


class SoftDeleteQuerySet(QuerySet):
    """
    QuerySet providing soft-delete filtering and bulk actions.
    """

    def active(self):
        """Exclude soft-deleted records."""
        return self.filter(is_deleted=False)

    def deleted(self):
        """Return only soft-deleted records."""
        return self.filter(is_deleted=True)

    def soft_delete(self):
        """Bulk soft-delete the entire queryset."""
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def restore(self):
        """Bulk restore soft-deleted records."""
        return self.update(is_deleted=False, deleted_at=None)
