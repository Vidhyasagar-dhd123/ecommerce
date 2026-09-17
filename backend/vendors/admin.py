from django.contrib import admin
from django.utils.html import format_html
from .models import Vendor, PurchaseOrder, PurchaseOrderItem, Import, ImportItem


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0
    raw_id_fields = ["variant"]
    readonly_fields = ["total_cost"]


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["name", "contact_person", "phone", "email", "po_count", "created_at"]
    search_fields = ["name", "email", "contact_person", "phone"]

    def po_count(self, obj):
        count = obj.purchase_orders.count()
        return format_html('<span class="badge-pill badge-info">{} POs</span>', count)
    po_count.short_description = "Purchase Orders"


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ["po_number", "vendor", "po_date", "status_badge", "formatted_total", "created_at"]
    list_filter = ["status", "po_date"]
    search_fields = ["vendor__name", "id"]
    inlines = [PurchaseOrderItemInline]
    readonly_fields = ["total_amount", "po_date", "created_at", "updated_at"]
    actions = ["action_approve_po", "action_receive_po", "action_cancel_po"]

    def po_number(self, obj):
        return format_html('<strong>#PO-{}</strong>', obj.id)
    po_number.short_description = "PO Number"

    def status_badge(self, obj):
        status_colors = {
            "draft": "badge-dark",
            "ordered": "badge-info",
            "received": "badge-success",
            "cancelled": "badge-danger",
        }
        cls = status_colors.get(str(obj.status).lower(), "badge-dark")
        return format_html('<span class="badge-pill {}">{}</span>', cls, str(obj.status).capitalize())
    status_badge.short_description = "Status"

    def formatted_total(self, obj):
        return f"${obj.total_amount:.2f}"
    formatted_total.short_description = "Total Cost"

    @admin.action(description="Approve selected Purchase Orders")
    def action_approve_po(self, request, queryset):
        queryset.filter(status="draft").update(status="ordered")

    @admin.action(description="Mark selected POs as Received")
    def action_receive_po(self, request, queryset):
        queryset.filter(status="ordered").update(status="received")

    @admin.action(description="Cancel selected Purchase Orders")
    def action_cancel_po(self, request, queryset):
        queryset.exclude(status="received").update(status="cancelled")


class ImportItemInline(admin.TabularInline):
    model = ImportItem
    extra = 0
    raw_id_fields = ["variant"]
    readonly_fields = ["total_cost"]


@admin.register(Import)
class ImportAdmin(admin.ModelAdmin):
    list_display = ["import_ref", "vendor", "warehouse", "import_date", "status_badge", "formatted_total"]
    list_filter = ["status", "import_date", "warehouse"]
    search_fields = ["vendor__name", "warehouse__name", "id"]
    inlines = [ImportItemInline]
    readonly_fields = ["total_amount", "created_at", "updated_at"]

    def import_ref(self, obj):
        return format_html('<strong>#IMP-{}</strong>', obj.id)
    import_ref.short_description = "Import Ref"

    def status_badge(self, obj):
        cls = "badge-success" if str(obj.status).lower() in ["completed", "received"] else "badge-info"
        return format_html('<span class="badge-pill {}">{}</span>', cls, str(obj.status).capitalize())
    status_badge.short_description = "Status"

    def formatted_total(self, obj):
        return f"${obj.total_amount:.2f}"
    formatted_total.short_description = "Total Amount"
