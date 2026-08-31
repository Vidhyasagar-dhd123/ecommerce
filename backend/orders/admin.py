from django.contrib import admin
from .models import Order, OrderItem, Payment, Invoice


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    raw_id_fields = ["variant"]


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    can_delete = False


class InvoiceInline(admin.StackedInline):
    model = Invoice
    extra = 0
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "customer",
        "status",
        "total_amount",
        "order_date",
        "created_at",
    ]
    list_filter = ["status", "order_date"]
    search_fields = [
        "id",
        "customer__user__username",
        "customer__user__email",
        "coupon_code",
    ]
    raw_id_fields = ["customer", "address"]
    inlines = [OrderItemInline, PaymentInline, InvoiceInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "variant", "quantity", "unit_price", "total_price"]
    raw_id_fields = ["order", "variant"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "payment_method", "amount", "payment_status", "paid_at"]
    list_filter = ["payment_method", "payment_status"]
    raw_id_fields = ["order"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "order", "invoice_date", "sub_total", "grand_total"]
    search_fields = ["invoice_number", "order__id"]
    raw_id_fields = ["order"]
