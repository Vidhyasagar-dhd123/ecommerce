from django.contrib.auth import get_user_model
from rest_framework import serializers
from ..models import Customer, Employee
from ..services import register_employee


User = get_user_model()


class UserAdminSerializer(serializers.ModelSerializer):
    """Admin-only: full user record including role, status, and timestamps."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "is_active",
            "is_staff",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]


class CustomerAdminSerializer(serializers.ModelSerializer):
    """Admin-only: customer profile with embedded user data."""

    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "username",
            "email",
            "date_of_birth",
            "gender",
            "is_active",
            "date_joined",
        ]
        read_only_fields = fields


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Serializer for customer profile."""

    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Customer
        fields = ["id", "username", "email", "date_of_birth", "gender"]
        read_only_fields = ["id", "username", "email"]


class MeSerializer(serializers.ModelSerializer):
    """Authenticated user data for the profile page, including optional customer data."""

    customer_profile = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "is_staff", "is_superuser", "date_joined", "customer_profile",
        ]

    def get_role(self, obj):
        if obj.role == "employee" or hasattr(obj, "employee_profile"):
            return "employee"
        if obj.is_superuser or obj.role == "admin":
            return "admin"
        return obj.role

    def get_customer_profile(self, obj):
        try:
            profile = obj.customer_profile
        except Customer.DoesNotExist:
            return None
        return {
            "date_of_birth": profile.date_of_birth,
            "gender": profile.gender,
        }


from inventory.models import Warehouse


class EmployeeProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer used to display an employee's own profile.
    Employees cannot change any fields — the create() method is intentionally
    absent; use EmployeeCreateSerializer (admin-only) for creation.
    """

    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True, default=None)

    class Meta:
        model = Employee
        fields = [
            "id",
            "username",
            "email",
            "employee_code",
            "designation",
            "hire_date",
            "warehouse",
            "warehouse_name",
        ]
        # All fields are read-only — employees must not edit their own profile.
        read_only_fields = fields


class EmployeeCreateSerializer(serializers.ModelSerializer):
    """
    Admin-only serializer for creating an employee profile.

    The admin supplies the `user_id` of an *existing* registered user.
    The service function updates that user's role and creates the Employee
    record — the requesting admin is NOT the target of the operation.

    Usage (admin POST to /api/users/employees/):
        {
            "user": 5,
            "employee_code": "EMP-042",
            "designation": "ShippingExecutive",
            "hire_date": "2026-01-15",
            "warehouse": 1
        }
    """

    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    warehouse = serializers.PrimaryKeyRelatedField(
        queryset=Warehouse.objects.filter(is_deleted=False),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Employee
        fields = ["user", "employee_code", "designation", "hire_date", "warehouse"]

    def create(self, validated_data):
        return register_employee(
            user=validated_data["user"],
            employee_code=validated_data["employee_code"],
            designation=validated_data["designation"],
            hire_date=validated_data["hire_date"],
            warehouse=validated_data.get("warehouse"),
        )

