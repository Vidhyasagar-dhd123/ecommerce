from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

from .managers import DummyManager

# Create your models here.
class MyDummy(models.Model):
    name = models.CharField(max_length=50, null=False, blank=False)
    age = models.IntegerField(null=False, blank=False, validators=[MinValueValidator(0),MaxValueValidator(100)])
    active = models.BooleanField(null=False, blank=False, default=True)

    objects = DummyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} ({self.age})"