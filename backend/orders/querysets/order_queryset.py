"""
QuerySet definitions for the Order model.
"""

from core.querysets.base_queryset import SoftDeleteQuerySet


class OrderQuerySet(SoftDeleteQuerySet):
    """
    Custom QuerySet for Orders with chainable filtering and relationship prefetching.
    """

    def for_customer(self, customer):
        """Filter orders belonging to a specific customer."""
        return self.filter(customer=customer)

    def by_status(self, status_val: str):
        """Filter orders by OrderStatus."""
        return self.filter(status=status_val)

    def with_relations(self):
        """Prefetch all associated relationships for efficient serialization."""
        return self.select_related(
            "customer__user",
            "address",
            "payment",
            "invoice",
            "locked_by_warehouse",
            "locked_by",
            "updated_by",
        ).prefetch_related(
            "items__variant__product",
        )
