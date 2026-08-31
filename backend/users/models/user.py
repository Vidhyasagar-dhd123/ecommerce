from django.contrib.auth.models import AbstractUser, Group
from django.db import models
from core.models import TimeStampedModel


class UserRole(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    EMPLOYEE = "employee", "Employee"
    ADMIN = "admin", "Admin"


class User(AbstractUser, TimeStampedModel):
    """
    Custom user model. Role field denormalises membership for fast permission
    checks. Group membership provides fine-grained employee sub-roles.
    """

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER,
    )
    phone = models.CharField(max_length=20, blank=True, default="")
    status = models.BooleanField(default=True)
    email = models.EmailField(unique=True, blank=False, null=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta(TimeStampedModel.Meta):
        verbose_name = "User"
        verbose_name_plural = "Users"

    def save(self, *args, **kwargs):
        if self.is_superuser and self.role != UserRole.ADMIN:
            self.role = UserRole.ADMIN
        # Coerce None → empty string for optional text fields to satisfy NOT NULL constraint.
        if not self.phone:
            self.phone = ""
        if not self.first_name:
            self.first_name = ""
        if not self.last_name:
            self.last_name = ""
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"

    @property
    def is_customer(self) -> bool:
        return self.role == UserRole.CUSTOMER

    @property
    def is_employee(self) -> bool:
        return self.role == UserRole.EMPLOYEE

    @property
    def is_admin_user(self) -> bool:
        return self.role == UserRole.ADMIN or self.is_superuser

    @property
    def is_shipping_executive(self) -> bool:
        return self.groups.filter(name="ShippingExecutive").exists()

    @property
    def is_inventory_manager(self) -> bool:
        return self.groups.filter(name="InventoryManager").exists()

    @property
    def is_support_agent(self) -> bool:
        return self.groups.filter(name="SupportAgent").exists()

    @property
    def is_premium_customer(self) -> bool:
        return self.groups.filter(name="PremiumCustomer").exists()
