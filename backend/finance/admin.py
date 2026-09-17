from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils import timezone
from .models import Dues


@admin.register(Dues)
class DuesAdmin(admin.ModelAdmin):
    list_display = ["id", "customer_info", "formatted_amount", "due_date", "status_badge", "created_at"]
    list_filter = ["status", "due_date", "created_at"]
    search_fields = ["customer__user__username", "customer__user__email", "id"]
    raw_id_fields = ["customer"]
    actions = ["action_mark_paid", "action_mark_overdue"]

    def customer_info(self, obj):
        u = obj.customer.user
        return f"{u.get_full_name() or u.username} ({u.email})"
    customer_info.short_description = "Customer"

    def formatted_amount(self, obj):
        return f"${obj.amount:.2f}"
    formatted_amount.short_description = "Outstanding Amount"

    def status_badge(self, obj):
        if obj.status == "paid":
            return mark_safe('<span class="badge-pill badge-success">Paid</span>')
        elif obj.status == "overdue":
            return mark_safe('<span class="badge-pill badge-danger">Overdue</span>')
        return mark_safe('<span class="badge-pill badge-warning">Pending</span>')
    status_badge.short_description = "Status"

    @admin.action(description="Mark selected dues as Paid")
    def action_mark_paid(self, request, queryset):
        queryset.update(status="paid")

    @admin.action(description="Mark selected dues as Overdue")
    def action_mark_overdue(self, request, queryset):
        queryset.update(status="overdue")
