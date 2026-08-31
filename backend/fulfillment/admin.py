from django.contrib import admin
from .models import Shipment, Return, Exchange, Refund


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "warehouse", "tracking_number", "carrier", "ship_date", "delivery_date"]
    list_filter = ["carrier", "ship_date", "delivery_date"]
    search_fields = ["tracking_number", "order__id"]
    raw_id_fields = ["order", "warehouse"]


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "status", "return_date", "created_at"]
    list_filter = ["status", "return_date"]
    search_fields = ["order__id", "reason"]
    raw_id_fields = ["order"]


@admin.register(Exchange)
class ExchangeAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "status", "contact_person", "created_at"]
    list_filter = ["status"]
    search_fields = ["order__id", "reason"]
    raw_id_fields = ["order", "contact_person"]


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ["id", "payment", "amount", "status", "refunded_at", "created_at"]
    list_filter = ["status", "refunded_at"]
    search_fields = ["payment__id", "reason"]
    raw_id_fields = ["payment"]
