from django.db import models


class TimesStampedModel(models.Model):
    """
    Add automatic creation and modification timestamps
    """

    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        abstract = True
