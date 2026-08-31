from django.contrib import admin
from promotions.models import Offer, HasActiveOffer, Coupon


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "discount_type", "discount_value", "start_date", "end_date", "status"]
    list_filter = ["status", "discount_type", "start_date", "end_date"]
    search_fields = ["title", "description"]


@admin.register(HasActiveOffer)
class HasActiveOfferAdmin(admin.ModelAdmin):
    list_display = ["id", "offer", "product", "start_date", "end_date"]
    list_filter = ["start_date", "end_date"]
    search_fields = ["offer__title", "product__name"]


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "code",
        "discount_type",
        "discount_value",
        "min_order_amount",
        "start_date",
        "end_date",
        "status",
        "usage_limit",
        "used_count",
    ]
    list_filter = ["status", "discount_type", "start_date", "end_date"]
    search_fields = ["code"]
