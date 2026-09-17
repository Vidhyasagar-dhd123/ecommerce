from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Warehouse, Inventory, StockTransaction


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ["name", "location", "status_badge", "inventory_skus_count", "created_at"]
    list_filter = ["status"]
    search_fields = ["name", "location"]
    actions = ["activate_warehouses", "deactivate_warehouses"]

    def status_badge(self, obj):
        if obj.status:
            return mark_safe('<span class="badge-pill badge-success">Active</span>')
        return mark_safe('<span class="badge-pill badge-danger">Inactive</span>')
    status_badge.short_description = "Status"

    def inventory_skus_count(self, obj):
        count = obj.inventory_records.count()
        return format_html('<span class="badge-pill badge-info">{} SKUs</span>', count)
    inventory_skus_count.short_description = "Tracked Items"

    @admin.action(description="Activate selected warehouses")
    def activate_warehouses(self, request, queryset):
        queryset.update(status=True)

    @admin.action(description="Deactivate selected warehouses")
    def deactivate_warehouses(self, request, queryset):
        queryset.update(status=False)


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = [
        "variant_thumb",
        "variant_sku",
        "warehouse",
        "stock_badge",
        "reserved_stock",
        "available_stock_badge",
        "reorder_level",
    ]
    list_filter = ["warehouse"]
    search_fields = ["variant__sku", "variant__product__name", "warehouse__name"]
    raw_id_fields = ["variant", "warehouse"]
    readonly_fields = ["available_stock"]

    def variant_thumb(self, obj):
        if obj.variant:
            primary_img = obj.variant.product.images.filter(is_primary=True).first() or obj.variant.product.images.first()
            if primary_img and primary_img.image_url:
                return format_html(
                    '<img src="{}" class="admin-thumb-img" alt="{}" style="width: 36px; height: 36px;" />',
                    primary_img.image_url,
                    obj.variant.sku,
                )
        return "—"
    variant_thumb.short_description = "Preview"

    def variant_sku(self, obj):
        return f"{obj.variant.sku} ({obj.variant.product.name})"
    variant_sku.short_description = "Variant / Product"

    def stock_badge(self, obj):
        if obj.stock <= 0:
            return mark_safe('<span class="badge-pill badge-danger">0 Out</span>')
        elif obj.stock <= obj.reorder_level:
            return format_html('<span class="badge-pill badge-warning">{} Low</span>', obj.stock)
        return format_html('<span class="badge-pill badge-success">{}</span>', obj.stock)
    stock_badge.short_description = "Physical Stock"

    def available_stock_badge(self, obj):
        avail = obj.available_stock
        if avail <= 0:
            return format_html('<span class="badge-pill badge-danger">{} Avail</span>', avail)
        return format_html('<span class="badge-pill badge-info">{} Avail</span>', avail)
    available_stock_badge.short_description = "Available"


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "type_badge",
        "variant_display",
        "quantity_display",
        "employee_name",
        "reference_id",
        "transaction_date",
        "created_at",
    ]
    list_filter = ["type", "transaction_date"]
    search_fields = ["variant__sku", "reference_id", "notes"]
    readonly_fields = [
        "inventory", "variant", "employee", "type", "quantity",
        "transaction_date", "reference_id", "notes", "created_at",
    ]

    def type_badge(self, obj):
        type_colors = {
            "inward": "badge-success",
            "outward": "badge-danger",
            "adjustment": "badge-warning",
            "transfer_in": "badge-info",
            "transfer_out": "badge-dark",
            "reserve": "badge-warning",
            "release": "badge-info",
        }
        cls = type_colors.get(str(obj.type).lower(), "badge-dark")
        return format_html('<span class="badge-pill {}">{}</span>', cls, str(obj.type).upper())
    type_badge.short_description = "Type"

    def variant_display(self, obj):
        return obj.variant.sku if obj.variant else "—"
    variant_display.short_description = "SKU"

    def quantity_display(self, obj):
        if obj.quantity > 0:
            return format_html('<span style="color: #10b981; font-weight: 600;">+{}</span>', obj.quantity)
        return format_html('<span style="color: #ef4444; font-weight: 600;">{}</span>', obj.quantity)
    quantity_display.short_description = "Qty"

    def employee_name(self, obj):
        return obj.employee.username if obj.employee else "System Automation"
    employee_name.short_description = "Recorded By"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
