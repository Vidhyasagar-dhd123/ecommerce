from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Order, OrderItem, Payment, Invoice


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ["variant_preview", "variant", "quantity", "unit_price", "total_price"]
    readonly_fields = ["variant_preview", "total_price"]
    raw_id_fields = ["variant"]

    def variant_preview(self, obj):
        if obj and obj.variant:
            primary_img = obj.variant.product.images.filter(is_primary=True).first() or obj.variant.product.images.first()
            if primary_img and primary_img.image_url:
                return format_html(
                    '<img src="{}" class="admin-thumb-img" alt="{}" style="width: 36px; height: 36px;" />',
                    primary_img.image_url,
                    obj.variant.sku,
                )
        return "—"
    variant_preview.short_description = "Image"


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    can_delete = False
    readonly_fields = ["payment_method", "amount", "payment_status", "paid_at", "transaction_id", "created_at"]


class InvoiceInline(admin.StackedInline):
    model = Invoice
    extra = 0
    can_delete = False
    readonly_fields = ["invoice_number", "invoice_date", "sub_total", "discount", "tax_amount", "shipping_charge", "grand_total", "created_at"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "order_id_display",
        "customer_display",
        "status_badge",
        "formatted_total",
        "items_count",
        "payment_summary",
        "order_date",
        "created_at",
    ]
    list_filter = ["status", "order_date", "created_at"]
    search_fields = [
        "id",
        "customer__user__username",
        "customer__user__email",
        "customer__user__phone",
        "coupon_code",
    ]
    raw_id_fields = ["customer", "address"]
    readonly_fields = ["total_amount", "order_date", "created_at", "updated_at"]
    inlines = [OrderItemInline, PaymentInline, InvoiceInline]
    actions = [
        "action_mark_confirmed",
        "action_mark_shipped",
        "action_mark_delivered",
        "action_cancel_orders",
    ]

    def order_id_display(self, obj):
        return format_html('<strong>#ORD-{}</strong>', obj.id)
    order_id_display.short_description = "Order ID"

    def customer_display(self, obj):
        u = obj.customer.user
        return f"{u.get_full_name() or u.username} ({u.email})"
    customer_display.short_description = "Customer"

    def status_badge(self, obj):
        status_colors = {
            "pending": "badge-warning",
            "confirmed": "badge-info",
            "shipped": "badge-primary",
            "delivered": "badge-success",
            "cancelled": "badge-danger",
        }
        cls = status_colors.get(str(obj.status).lower(), "badge-dark")
        return format_html('<span class="badge-pill {}">{}</span>', cls, str(obj.status).capitalize())
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    def formatted_total(self, obj):
        return f"₹{obj.total_amount:,.2f}"
    formatted_total.short_description = "Total Amount"
    formatted_total.admin_order_field = "total_amount"

    def items_count(self, obj):
        count = obj.items.count()
        return format_html('<span class="badge-pill badge-dark">{} items</span>', count)
    items_count.short_description = "Items"

    def payment_summary(self, obj):
        try:
            pay = obj.payment
        except Payment.DoesNotExist:
            pay = None
        if not pay:
            return mark_safe('<span style="color: var(--body-quiet-color); font-size: 12px;">Unpaid</span>')
        if pay.payment_status == "paid":
            return format_html('<span class="badge-pill badge-success">Paid ({})</span>', pay.payment_method.upper())
        return format_html('<span class="badge-pill badge-warning">{} ({})</span>', pay.get_payment_status_display(), pay.payment_method.upper())
    payment_summary.short_description = "Payment"


    @admin.action(description="Workflow: Mark selected orders as Confirmed")
    def action_mark_confirmed(self, request, queryset):
        queryset.filter(status="pending").update(status="confirmed")

    @admin.action(description="Workflow: Mark selected orders as Shipped")
    def action_mark_shipped(self, request, queryset):
        queryset.filter(status="confirmed").update(status="shipped")

    @admin.action(description="Workflow: Mark selected orders as Delivered")
    def action_mark_delivered(self, request, queryset):
        queryset.filter(status="shipped").update(status="delivered")

    @admin.action(description="Workflow: Cancel selected orders")
    def action_cancel_orders(self, request, queryset):
        queryset.exclude(status__in=["delivered", "cancelled"]).update(status="cancelled")


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ["id", "order_link", "variant_thumb", "variant", "quantity", "unit_price_formatted", "total_price_formatted"]
    search_fields = ["order__id", "variant__sku", "variant__product__name"]
    raw_id_fields = ["order", "variant"]

    def order_link(self, obj):
        return f"Order #{obj.order.id}"
    order_link.short_description = "Order"

    def variant_thumb(self, obj):
        if obj.variant:
            primary_img = obj.variant.product.images.filter(is_primary=True).first() or obj.variant.product.images.first()
            if primary_img and primary_img.image_url:
                return format_html(
                    '<img src="{}" class="admin-thumb-img" alt="{}" style="width: 40px; height: 40px;" />',
                    primary_img.image_url,
                    obj.variant.sku,
                )
        return "—"
    variant_thumb.short_description = "Preview"

    def unit_price_formatted(self, obj):
        return f"${obj.unit_price:.2f}"
    unit_price_formatted.short_description = "Unit Price"

    def total_price_formatted(self, obj):
        return f"${obj.total_price:.2f}"
    total_price_formatted.short_description = "Total Price"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "order_ref", "payment_method_badge", "amount_formatted", "status_badge", "paid_at", "created_at"]
    list_filter = ["payment_method", "payment_status", "created_at"]
    search_fields = ["order__id", "transaction_id"]
    raw_id_fields = ["order"]
    actions = ["mark_completed", "mark_refunded", "mark_failed"]

    def order_ref(self, obj):
        return f"Order #{obj.order.id}"
    order_ref.short_description = "Order"

    def payment_method_badge(self, obj):
        return format_html('<span class="badge-pill badge-dark">{}</span>', obj.payment_method.upper())
    payment_method_badge.short_description = "Method"

    def amount_formatted(self, obj):
        return f"${obj.amount:.2f}"
    amount_formatted.short_description = "Amount"

    def status_badge(self, obj):
        cls = "badge-success" if obj.payment_status == "completed" else "badge-warning" if obj.payment_status == "pending" else "badge-danger"
        return format_html('<span class="badge-pill {}">{}</span>', cls, obj.payment_status.capitalize())
    status_badge.short_description = "Status"

    @admin.action(description="Mark selected payments as Completed")
    def mark_completed(self, request, queryset):
        queryset.update(payment_status="completed")

    @admin.action(description="Mark selected payments as Refunded")
    def mark_refunded(self, request, queryset):
        queryset.update(payment_status="refunded")

    @admin.action(description="Mark selected payments as Failed")
    def mark_failed(self, request, queryset):
        queryset.update(payment_status="failed")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "order_ref", "invoice_date", "grand_total_formatted", "created_at"]
    search_fields = ["invoice_number", "order__id"]
    raw_id_fields = ["order"]

    def order_ref(self, obj):
        return f"Order #{obj.order.id}"
    order_ref.short_description = "Order"

    def grand_total_formatted(self, obj):
        return f"${obj.grand_total:.2f}"
    grand_total_formatted.short_description = "Grand Total"
