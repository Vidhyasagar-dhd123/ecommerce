from django.db import models
from django.conf import settings
from django.contrib.auth.models import Group

from core.models import BaseModel
from .user import UserRole


class Gender(models.TextChoices):
    MALE = "M", "Male"
    FEMALE = "F", "Female"
    OTHER = "O", "Other"
    PREFER_NOT = "N", "Prefer not to say"


class Designation(models.TextChoices):
    SHIPPING_EXECUTIVE = "ShippingExecutive", "Shipping Executive"
    INVENTORY_MANAGER = "InventoryManager", "Inventory Manager"
    SUPPORT_AGENT = "SupportAgent", "Support Agent"
    # Note: PremiumCustomer is a customer sub-group — managed separately, not here.


class Customer(BaseModel):
    """
    Extended profile for users with role=customer.
    Created automatically on customer registration (via signal or service).
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile",
    )
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=1,
        choices=Gender.choices,
        blank=True,
        default="",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
        # email should be the login credential
        constraints = [
            models.UniqueConstraint(
                fields=["user_id"],
                name="unique_user_id",
            ),
        ]

    def __str__(self) -> str:
        return self.user.get_full_name() or self.user.username

    @property
    def is_premium_customer(self) -> bool:
        """
        Returns True if the customer has a premium subscription.
        """
        return self.user.groups.filter(name="PremiumCustomer").exists()


class Employee(BaseModel):
    """
    Extended profile for users with role=employee.
    The employee's sub-role (ShippingExecutive, etc.) is defined by their
    Django Group membership — see 01_RBAC.md.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee_profile",
    )
    employee_code = models.CharField(max_length=50, unique=True)
    designation = models.CharField(max_length=100, choices=Designation.choices)
    hire_date = models.DateField()
    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        help_text="Warehouse where this employee is stationed (required for inventory managers & shipping executives).",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Employee"
        verbose_name_plural = "Employees"

    def __str__(self) -> str:
        wh_name = f" [{self.warehouse.name}]" if self.warehouse else ""
        return f"{self.employee_code} — {self.designation}{wh_name}"



class AdminProfile(BaseModel):
    """
    Extended profile for users with role=admin.
    admin_level controls scope: 1=basic, 2=manager, 3=superadmin.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="admin_profile",
    )
    admin_level = models.PositiveSmallIntegerField(default=1)

    class Meta(BaseModel.Meta):
        verbose_name = "Admin Profile"
        verbose_name_plural = "Admin Profiles"

    def __str__(self) -> str:
        return f"{self.user.username} (Level {self.admin_level})"
