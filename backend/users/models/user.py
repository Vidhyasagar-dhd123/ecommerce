from django.contrib.auth.models import AbstractUser
from django.db import models

from core.models import TimesStampedModel


class User(AbstractUser, TimesStampedModel):
    """
    Custom user model that extends the default Django AbstractUser.
    Additional fields can be added here as needed.
    """
    # Example of an additional field
    bio = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.username