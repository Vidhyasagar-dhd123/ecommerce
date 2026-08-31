from django.db.models import Manager
from products.querysets import ProductQuerySet


class ProductManager(Manager):
    def get_queryset(self) -> ProductQuerySet:
        return ProductQuerySet(self.model, using=self._db).active()

    def in_stock(self):
        return self.get_queryset().in_stock()

    def search(self, query: str):
        return self.get_queryset().search(query)

    def with_relations(self):
        return self.get_queryset().with_relations()
