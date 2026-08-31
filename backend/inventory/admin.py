"""
Django admin registration for the Inventory domain.
"""

from django.contrib import admin
from .models import Warehouse, Inventory, StockTransaction


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ["name", "location", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["name", "location"]


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = [
        "variant",
        "warehouse",
        "stock",
        "reserved_stock",
        "available_stock",
        "reorder_level",
    ]
    list_filter = ["warehouse"]
    search_fields = ["variant__sku", "warehouse__name"]
    readonly_fields = ["available_stock"]


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ["type", "variant", "quantity", "transaction_date", "employee", "reference_id"]
    list_filter = ["type", "transaction_date"]
    search_fields = ["variant__sku", "reference_id"]
    readonly_fields = [
        "inventory", "variant", "employee", "type", "quantity",
        "transaction_date", "reference_id", "notes", "created_at",
    ]

    def has_add_permission(self, request):
        """Stock transactions are created only via service calls, not admin."""
        return False

    def has_change_permission(self, request, obj=None):
        """Transactions are immutable."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Transactions must never be deleted."""
        return False
