from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.contrib.auth.models import Group
from .models import User, Customer, Employee, AdminProfile, Address
from .models.profile import Designation


class CustomerInline(admin.StackedInline):
    model = Customer
    fk_name = "user"
    extra = 0
    can_delete = False


class EmployeeInline(admin.StackedInline):
    model = Employee
    fk_name = "user"
    extra = 0
    can_delete = False


class AddressInline(admin.TabularInline):
    model = Address
    fk_name = "customer"
    extra = 0
    fields = ["address_type", "name", "city", "state", "zipcode", "is_default"]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin panel for User model with role workflows and inline profiles."""
    list_display = (
        "username",
        "email",
        "role_badge",
        "designation_badge",
        "status_badge",
        "is_staff",
        "date_joined",
    )
    list_filter = (
        "role",
        "status",
        "is_staff",
        "is_superuser",
        "employee_profile__designation",
        "date_joined",
    )
    search_fields = (
        "username",
        "email",
        "phone",
        "first_name",
        "last_name",
        "employee_profile__employee_code",
    )
    ordering = ("-date_joined",)
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Role & Status", {"fields": ("role", "phone", "status")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Role & Status", {"fields": ("role", "phone", "status")}),
    )
    inlines = [CustomerInline, EmployeeInline]
    actions = [
        "activate_users",
        "deactivate_users",
        "promote_to_admin",
        "promote_to_support_agent",
        "promote_to_shipping_executive",
        "promote_to_inventory_manager",
    ]

    def role_badge(self, obj):
        if obj.role == "admin":
            return mark_safe('<span class="badge-pill badge-primary">Admin</span>')
        elif obj.role == "employee":
            return mark_safe('<span class="badge-pill badge-info">Employee</span>')
        return mark_safe('<span class="badge-pill badge-dark">Customer</span>')
    role_badge.short_description = "Role"
    role_badge.admin_order_field = "role"

    def designation_badge(self, obj):
        if hasattr(obj, "employee_profile") and obj.employee_profile:
            desig = obj.employee_profile.designation
            return format_html('<span class="badge-pill badge-warning">{}</span>', desig)
        return "—"
    designation_badge.short_description = "Designation"

    def status_badge(self, obj):
        if obj.status:
            return mark_safe('<span class="badge-pill badge-success">Active</span>')
        return mark_safe('<span class="badge-pill badge-danger">Disabled</span>')
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    @admin.action(description="Activate selected user accounts")
    def activate_users(self, request, queryset):
        queryset.update(status=True, is_active=True)

    @admin.action(description="Deactivate selected user accounts")
    def deactivate_users(self, request, queryset):
        queryset.update(status=False, is_active=False)

    @admin.action(description="Promote to System Admin")
    def promote_to_admin(self, request, queryset):
        for u in queryset:
            u.role = "admin"
            u.is_staff = True
            u.save(update_fields=["role", "is_staff"])
            AdminProfile.objects.get_or_create(user=u, defaults={"admin_level": 2})

    @admin.action(description="Promote to Support Agent")
    def promote_to_support_agent(self, request, queryset):
        group, _ = Group.objects.get_or_create(name="SupportAgent")
        for u in queryset:
            u.role = "employee"
            u.is_staff = True
            u.save(update_fields=["role", "is_staff"])
            u.groups.add(group)
            if hasattr(u, "employee_profile"):
                u.employee_profile.designation = Designation.SUPPORT_AGENT
                u.employee_profile.save()
            else:
                Employee.objects.create(
                    user=u,
                    employee_code=f"EMP-SUP-{u.id:04d}",
                    designation=Designation.SUPPORT_AGENT,
                    hire_date=u.date_joined.date(),
                )

    @admin.action(description="Promote to Shipping Executive")
    def promote_to_shipping_executive(self, request, queryset):
        group, _ = Group.objects.get_or_create(name="ShippingExecutive")
        for u in queryset:
            u.role = "employee"
            u.is_staff = True
            u.save(update_fields=["role", "is_staff"])
            u.groups.add(group)
            if hasattr(u, "employee_profile"):
                u.employee_profile.designation = Designation.SHIPPING_EXECUTIVE
                u.employee_profile.save()
            else:
                Employee.objects.create(
                    user=u,
                    employee_code=f"EMP-SHP-{u.id:04d}",
                    designation=Designation.SHIPPING_EXECUTIVE,
                    hire_date=u.date_joined.date(),
                )

    @admin.action(description="Promote to Inventory Manager")
    def promote_to_inventory_manager(self, request, queryset):
        group, _ = Group.objects.get_or_create(name="InventoryManager")
        for u in queryset:
            u.role = "employee"
            u.is_staff = True
            u.save(update_fields=["role", "is_staff"])
            u.groups.add(group)
            if hasattr(u, "employee_profile"):
                u.employee_profile.designation = Designation.INVENTORY_MANAGER
                u.employee_profile.save()
            else:
                Employee.objects.create(
                    user=u,
                    employee_code=f"EMP-INV-{u.id:04d}",
                    designation=Designation.INVENTORY_MANAGER,
                    hire_date=u.date_joined.date(),
                )


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("user_link", "email", "gender_display", "date_of_birth", "orders_count", "created_at")
    search_fields = ("user__username", "user__email", "user__phone")
    raw_id_fields = ("user",)
    inlines = [AddressInline]

    def user_link(self, obj):
        return f"{obj.user.get_full_name() or obj.user.username} (@{obj.user.username})"
    user_link.short_description = "Customer Name"

    def email(self, obj):
        return obj.user.email
    email.short_description = "Email"

    def gender_display(self, obj):
        return obj.get_gender_display() or "—"
    gender_display.short_description = "Gender"

    def orders_count(self, obj):
        count = obj.orders.count()
        return format_html('<span class="badge-pill badge-info">{} Orders</span>', count)
    orders_count.short_description = "Total Orders"


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "employee_code",
        "user_name",
        "designation_badge",
        "warehouse_location",
        "hire_date",
        "created_at",
    )
    list_filter = ("designation", "warehouse")
    search_fields = ("employee_code", "user__username", "user__email")
    raw_id_fields = ("user", "warehouse")

    def user_name(self, obj):
        return f"{obj.user.get_full_name() or obj.user.username} ({obj.user.email})"
    user_name.short_description = "Employee"

    def designation_badge(self, obj):
        return format_html('<span class="badge-pill badge-warning">{}</span>', obj.get_designation_display())
    designation_badge.short_description = "Designation"

    def warehouse_location(self, obj):
        return obj.warehouse.name if obj.warehouse else "— (All / None)"
    warehouse_location.short_description = "Warehouse"


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "admin_level_badge", "created_at")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)

    def admin_level_badge(self, obj):
        return format_html('<span class="badge-pill badge-primary">Level {} Admin</span>', obj.admin_level)
    admin_level_badge.short_description = "Admin Level"


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("name", "customer_name", "address_type_badge", "formatted_location", "zipcode", "is_default_badge")
    list_filter = ("address_type", "is_default", "state", "country")
    search_fields = ("name", "city", "state", "zipcode", "customer__user__username")
    raw_id_fields = ("customer",)

    def customer_name(self, obj):
        return obj.customer.user.username
    customer_name.short_description = "Customer"

    def address_type_badge(self, obj):
        return format_html('<span class="badge-pill badge-dark">{}</span>', obj.get_address_type_display())
    address_type_badge.short_description = "Type"

    def formatted_location(self, obj):
        return f"{obj.city}, {obj.state}, {obj.country}"
    formatted_location.short_description = "Location"

    def is_default_badge(self, obj):
        if obj.is_default:
            return mark_safe('<span class="badge-pill badge-success">Default</span>')
        return "—"
    is_default_badge.short_description = "Default"
