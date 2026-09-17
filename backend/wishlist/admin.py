from django.contrib import admin
from django.utils.html import format_html
from .models import Wishlist, WishlistItem


class WishlistItemInline(admin.TabularInline):
    model = WishlistItem
    extra = 0
    raw_id_fields = ["product"]
    fields = ["product_thumb", "product", "created_at"]
    readonly_fields = ["product_thumb", "created_at"]

    def product_thumb(self, obj):
        if obj and obj.product:
            primary_img = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
            if primary_img and primary_img.image_url:
                return format_html(
                    '<img src="{}" class="admin-thumb-img" alt="{}" style="width: 32px; height: 32px;" />',
                    primary_img.image_url,
                    obj.product.name,
                )
        return "—"
    product_thumb.short_description = "Image"


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ["id", "customer_name", "items_count", "created_at", "updated_at"]
    search_fields = ["customer__user__username", "customer__user__email"]
    raw_id_fields = ["customer"]
    inlines = [WishlistItemInline]

    def customer_name(self, obj):
        return obj.customer.user.username
    customer_name.short_description = "Customer"

    def items_count(self, obj):
        count = obj.items.count()
        return format_html('<span class="badge-pill badge-info">{} items</span>', count)
    items_count.short_description = "Items Count"
