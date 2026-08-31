"""
Django admin registration for the Vendors domain.
"""

from django.contrib import admin
from .models import Vendor, PurchaseOrder, PurchaseOrderItem, Import, ImportItem


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0
    readonly_fields = ["total_cost"]


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["name", "contact_person", "phone", "email", "created_at"]
    search_fields = ["name", "email", "contact_person"]


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ["id", "vendor", "po_date", "status", "total_amount"]
    list_filter = ["status", "po_date"]
    search_fields = ["vendor__name"]
    inlines = [PurchaseOrderItemInline]
    readonly_fields = ["total_amount", "po_date"]


class ImportItemInline(admin.TabularInline):
    model = ImportItem
    extra = 0
    readonly_fields = ["total_cost"]


@admin.register(Import)
class ImportAdmin(admin.ModelAdmin):
    list_display = ["id", "vendor", "warehouse", "import_date", "status", "total_amount"]
    list_filter = ["status", "import_date"]
    search_fields = ["vendor__name", "warehouse__name"]
    inlines = [ImportItemInline]
    readonly_fields = ["total_amount"]
