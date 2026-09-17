from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils import timezone
from .models import Offer, HasActiveOffer, Coupon


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ["title", "discount_badge", "validity_status", "start_date", "end_date", "status_badge"]
    list_filter = ["status", "discount_type", "start_date", "end_date"]
    search_fields = ["title", "description"]
    actions = ["activate_offers", "deactivate_offers"]

    def discount_badge(self, obj):
        if obj.discount_type == "percentage":
            return format_html('<span class="badge-pill badge-primary">{}% OFF</span>', obj.discount_value)
        return format_html('<span class="badge-pill badge-info">${} OFF</span>', obj.discount_value)
    discount_badge.short_description = "Discount"

    def validity_status(self, obj):
        now = timezone.now().date() if hasattr(timezone.now(), "date") else timezone.now()
        start = obj.start_date.date() if hasattr(obj.start_date, "date") else obj.start_date
        end = obj.end_date.date() if hasattr(obj.end_date, "date") else obj.end_date
        if end and end < now:
            return mark_safe('<span class="badge-pill badge-danger">Expired</span>')
        elif start and start > now:
            return mark_safe('<span class="badge-pill badge-warning">Upcoming</span>')
        return mark_safe('<span class="badge-pill badge-success">Live Now</span>')
    validity_status.short_description = "Validity"

    def status_badge(self, obj):
        if obj.status:
            return mark_safe('<span class="badge-pill badge-success">Active</span>')
        return mark_safe('<span class="badge-pill badge-danger">Disabled</span>')
    status_badge.short_description = "Status"

    @admin.action(description="Activate selected offers")
    def activate_offers(self, request, queryset):
        queryset.update(status=True)

    @admin.action(description="Deactivate selected offers")
    def deactivate_offers(self, request, queryset):
        queryset.update(status=False)


@admin.register(HasActiveOffer)
class HasActiveOfferAdmin(admin.ModelAdmin):
    list_display = ["offer", "product", "start_date", "end_date"]
    list_filter = ["start_date", "end_date"]
    search_fields = ["offer__title", "product__name"]
    raw_id_fields = ["offer", "product"]


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        "code_display",
        "discount_badge",
        "min_order_formatted",
        "usage_progress",
        "validity_status",
        "status_badge",
    ]
    list_filter = ["status", "discount_type", "start_date", "end_date"]
    search_fields = ["code"]
    actions = ["activate_coupons", "deactivate_coupons"]

    def code_display(self, obj):
        return format_html('<code style="font-size: 13px; font-weight: 700; color: #2563eb;">{}</code>', obj.code)
    code_display.short_description = "Coupon Code"

    def discount_badge(self, obj):
        if obj.discount_type == "percentage":
            return format_html('<span class="badge-pill badge-primary">{}% OFF</span>', obj.discount_value)
        return format_html('<span class="badge-pill badge-info">${} OFF</span>', obj.discount_value)
    discount_badge.short_description = "Discount"

    def min_order_formatted(self, obj):
        return f"${obj.min_order_amount:.2f}"
    min_order_formatted.short_description = "Min Order"

    def usage_progress(self, obj):
        limit = obj.usage_limit if obj.usage_limit else "∞"
        return format_html('<span class="badge-pill badge-dark">{} / {}</span>', obj.used_count, limit)
    usage_progress.short_description = "Usage"

    def validity_status(self, obj):
        now = timezone.now().date() if hasattr(timezone.now(), "date") else timezone.now()
        start = obj.start_date.date() if hasattr(obj.start_date, "date") else obj.start_date
        end = obj.end_date.date() if hasattr(obj.end_date, "date") else obj.end_date
        if end and end < now:
            return mark_safe('<span class="badge-pill badge-danger">Expired</span>')
        elif start and start > now:
            return mark_safe('<span class="badge-pill badge-warning">Upcoming</span>')
        return mark_safe('<span class="badge-pill badge-success">Valid</span>')
    validity_status.short_description = "Validity"

    def status_badge(self, obj):
        if obj.status:
            return mark_safe('<span class="badge-pill badge-success">Active</span>')
        return mark_safe('<span class="badge-pill badge-danger">Inactive</span>')
    status_badge.short_description = "Status"

    @admin.action(description="Activate selected coupons")
    def activate_coupons(self, request, queryset):
        queryset.update(status=True)

    @admin.action(description="Deactivate selected coupons")
    def deactivate_coupons(self, request, queryset):
        queryset.update(status=False)
