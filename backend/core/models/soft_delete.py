from django.db import models
from django.utils import timezone


class SoftDeleteModel(models.Model):
    """
    Marks records as deleted instead of removing them from db
    """

    is_deleted = models.BooleanField(default=False)

    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at"])
