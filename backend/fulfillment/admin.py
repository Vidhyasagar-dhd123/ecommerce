from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Shipment, Return, Exchange, Refund


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "order_ref",
        "carrier_badge",
        "tracking_display",
        "warehouse",
        "ship_date",
        "delivery_date",
        "delivery_status",
    ]
    list_filter = ["carrier", "ship_date", "delivery_date", "warehouse"]
    search_fields = ["tracking_number", "order__id", "carrier"]
    raw_id_fields = ["order", "warehouse"]

    def order_ref(self, obj):
        return f"Order #{obj.order.id}"
    order_ref.short_description = "Order"

    def carrier_badge(self, obj):
        if obj.carrier:
            return format_html('<span class="badge-pill badge-primary">{}</span>', obj.carrier.upper())
        return "—"
    carrier_badge.short_description = "Carrier"

    def tracking_display(self, obj):
        if obj.tracking_number:
            return format_html('<code>{}</code>', obj.tracking_number)
        return mark_safe('<span style="color: #94a3b8;">Pending Dispatch</span>')
    tracking_display.short_description = "Tracking No."

    def delivery_status(self, obj):
        if obj.delivery_date:
            return mark_safe('<span class="badge-pill badge-success">Delivered</span>')
        elif obj.ship_date:
            return mark_safe('<span class="badge-pill badge-info">In Transit</span>')
        return mark_safe('<span class="badge-pill badge-warning">Processing</span>')
    delivery_status.short_description = "Status"


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ["id", "order_ref", "reason_truncated", "status_badge", "return_date", "created_at"]
    list_filter = ["status", "return_date"]
    search_fields = ["order__id", "reason"]
    raw_id_fields = ["order"]
    actions = ["action_approve_return", "action_reject_return", "action_mark_completed"]

    def order_ref(self, obj):
        return f"Order #{obj.order.id}"
    order_ref.short_description = "Order"

    def reason_truncated(self, obj):
        if len(obj.reason) > 50:
            return obj.reason[:47] + "..."
        return obj.reason
    reason_truncated.short_description = "Reason"

    def status_badge(self, obj):
        status_colors = {
            "received": "badge-warning",
            "approved": "badge-info",
            "rejected": "badge-danger",
            "completed": "badge-success",
        }
        cls = status_colors.get(str(obj.status).lower(), "badge-dark")
        return format_html('<span class="badge-pill {}">{}</span>', cls, str(obj.status).capitalize())
    status_badge.short_description = "Status"

    @admin.action(description="Approve selected return requests")
    def action_approve_return(self, request, queryset):
        queryset.filter(status="received").update(status="approved")

    @admin.action(description="Reject selected return requests")
    def action_reject_return(self, request, queryset):
        queryset.filter(status="received").update(status="rejected")

    @admin.action(description="Mark selected returns as Completed")
    def action_mark_completed(self, request, queryset):
        queryset.update(status="completed")


@admin.register(Exchange)
class ExchangeAdmin(admin.ModelAdmin):
    list_display = ["id", "order_ref", "status_badge", "contact_person", "reason_truncated", "created_at"]
    list_filter = ["status"]
    search_fields = ["order__id", "reason"]
    raw_id_fields = ["order", "contact_person"]
    actions = ["approve_exchanges", "complete_exchanges"]

    def order_ref(self, obj):
        return f"Order #{obj.order.id}"
    order_ref.short_description = "Order"

    def reason_truncated(self, obj):
        if len(obj.reason) > 50:
            return obj.reason[:47] + "..."
        return obj.reason
    reason_truncated.short_description = "Reason"

    def status_badge(self, obj):
        cls = "badge-success" if obj.status == "completed" else "badge-info" if obj.status == "approved" else "badge-warning"
        return format_html('<span class="badge-pill {}">{}</span>', cls, str(obj.status).capitalize())
    status_badge.short_description = "Status"

    @admin.action(description="Approve selected exchange requests")
    def approve_exchanges(self, request, queryset):
        queryset.update(status="approved")

    @admin.action(description="Complete selected exchanges")
    def complete_exchanges(self, request, queryset):
        queryset.update(status="completed")


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ["id", "payment_ref", "amount_formatted", "status_badge", "refunded_at", "created_at"]
    list_filter = ["status", "refunded_at"]
    search_fields = ["payment__id", "reason"]
    raw_id_fields = ["payment"]
    actions = ["mark_refund_completed"]

    def payment_ref(self, obj):
        return f"Payment #{obj.payment.id} (Order #{obj.payment.order_id})"
    payment_ref.short_description = "Payment"

    def amount_formatted(self, obj):
        return f"${obj.amount:.2f}"
    amount_formatted.short_description = "Refund Amount"

    def status_badge(self, obj):
        cls = "badge-success" if obj.status == "completed" else "badge-warning"
        return format_html('<span class="badge-pill {}">{}</span>', cls, str(obj.status).capitalize())
    status_badge.short_description = "Status"

    @admin.action(description="Mark selected refunds as Completed")
    def mark_refund_completed(self, request, queryset):
        queryset.update(status="completed")
