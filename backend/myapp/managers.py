from django.db import models

from .querysets import DummyQuerySet


class DummyManager(models.Manager.from_queryset(DummyQuerySet)):
    def live(self):
        return self.get_queryset().active()
