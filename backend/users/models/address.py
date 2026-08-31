from django.db import models, transaction
from core.models import BaseModel


class AddressType(models.TextChoices):
    BILLING = "Billing", "billing"
    SHIPPING = "Shipping", "shipping"
    OTHER = "Other", "other"


class Address(BaseModel):
    """
    A customer can have multiple addresses. Exactly one per type can be
    marked is_default=True; enforced in AddressService.
    """

    customer = models.ForeignKey(
        "users.Customer",
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    address_type = models.CharField(
        max_length=10,
        choices=AddressType,
        default=AddressType.SHIPPING,
    )
    name = models.CharField(max_length=255)
    street = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    state = models.CharField(max_length=255)
    country = models.CharField(max_length=255)
    zipcode = models.CharField(max_length=255)
    landmark = models.CharField(max_length=255, blank=True, null=True)
    is_default = models.BooleanField(default=False)

    class Meta(BaseModel.Meta):
        verbose_name = "Address"
        verbose_name_plural = "Addresses"
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["customer", "address_type"],
                condition=models.Q(is_default=True),
                name="unique_default_address_per_customer_type",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name}, {self.city}, {self.state}"

    def save(self, *args, **kwargs):
        """
        Override save to ensure that only one address of each type can be default for a customer.
        If this address is set as default, unset the default flag for other addresses of the same type.
        """
        if not self.is_default or not self.customer_id:
            return super().save(*args, **kwargs)

        with transaction.atomic():
            previous_defaults = type(self).objects.select_for_update().filter(
                customer_id=self.customer_id,
                address_type=self.address_type,
                is_default=True,
            )
            if self.pk:
                previous_defaults = previous_defaults.exclude(pk=self.pk)
            previous_defaults.update(is_default=False)
            super().save(*args, **kwargs)
