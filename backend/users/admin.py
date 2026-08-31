from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, Customer, Employee, AdminProfile, Address


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin panel for User model, extending the built-in UserAdmin."""
    list_display = ("username", "email", "role", "status", "is_staff", "date_joined")
    list_filter = ("role", "status", "is_staff", "is_superuser", "groups")
    search_fields = ("username", "email", "phone")
    ordering = ("-date_joined",)
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Role & Status", {"fields": ("role", "phone", "status")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Role & Status", {"fields": ("role", "phone", "status")}),
    )


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("__str__", "user", "gender", "date_of_birth")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("employee_code", "user", "designation", "hire_date")
    list_filter = ("designation",)
    search_fields = ("employee_code", "user__username", "user__email")
    raw_id_fields = ("user",)


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "admin_level")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("name", "customer", "address_type", "city", "state", "is_default")
    list_filter = ("address_type", "is_default", "country")
    search_fields = ("name", "city", "state", "customer__user__username")
    raw_id_fields = ("customer",)
