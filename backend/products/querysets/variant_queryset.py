from django.db.models import QuerySet


class VariantQuerySet(QuerySet):
    def active(self):
        return self.filter(status=True, is_deleted=False)

    def in_stock(self):
        return self.filter(stock__gt=0)
