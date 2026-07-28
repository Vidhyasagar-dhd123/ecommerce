from django.db import models
from django.conf import settings

from core.models import BaseModel

class Customer(BaseModel,models.Model):
    """
    Model representing a customer in the system.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name