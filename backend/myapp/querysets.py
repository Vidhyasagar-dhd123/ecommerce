from django.db.models import QuerySet


class DummyQuerySet(QuerySet):
    def active(self):
        return self.filter(active=True)

    def inactive(self):
        return self.filter(active=False)
