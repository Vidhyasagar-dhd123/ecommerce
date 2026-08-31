from django.db.models import Manager
from products.querysets import VariantQuerySet


class VariantManager(Manager):
    def get_queryset(self) -> VariantQuerySet:
        return VariantQuerySet(self.model, using=self._db).active()

    def in_stock(self):
        return self.get_queryset().in_stock()
