"""
Manager definitions for the Order model.
"""

from core.managers.base_manager import SoftDeleteManager
from orders.querysets.order_queryset import OrderQuerySet


class OrderManager(SoftDeleteManager):
    """
    Default manager for the Order model.
    """

    def get_queryset(self) -> OrderQuerySet:
        return OrderQuerySet(self.model, using=self._db).active()

    def for_customer(self, customer):
        return self.get_queryset().for_customer(customer)

    def by_status(self, status_val: str):
        return self.get_queryset().by_status(status_val)

    def with_relations(self):
        return self.get_queryset().with_relations()
