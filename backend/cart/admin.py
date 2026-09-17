from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    raw_id_fields = ["variant"]
    fields = ["variant_thumb", "variant", "quantity", "price", "subtotal"]
    readonly_fields = ["variant_thumb", "subtotal"]

    def variant_thumb(self, obj):
        if obj and obj.variant:
            primary_img = obj.variant.product.images.filter(is_primary=True).first() or obj.variant.product.images.first()
            if primary_img and primary_img.image_url:
                return format_html(
                    '<img src="{}" class="admin-thumb-img" alt="{}" style="width: 32px; height: 32px;" />',
                    primary_img.image_url,
                    obj.variant.sku,
                )
        return "—"
    variant_thumb.short_description = "Image"


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["id", "customer_name", "items_count", "is_active_badge", "created_at", "updated_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["customer__user__username", "customer__user__email"]
    raw_id_fields = ["customer"]
    inlines = [CartItemInline]

    def customer_name(self, obj):
        return obj.customer.user.username
    customer_name.short_description = "Customer"

    def items_count(self, obj):
        count = obj.items.count()
        return format_html('<span class="badge-pill badge-info">{} items</span>', count)
    items_count.short_description = "Items"

    def is_active_badge(self, obj):
        if obj.is_active:
            return mark_safe('<span class="badge-pill badge-success">Active Cart</span>')
        return mark_safe('<span class="badge-pill badge-dark">Archived</span>')
    is_active_badge.short_description = "Status"


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ["id", "cart_customer", "variant_thumb", "variant", "quantity", "formatted_price", "formatted_subtotal"]
    search_fields = ["variant__sku", "cart__customer__user__username"]
    raw_id_fields = ["cart", "variant"]

    def cart_customer(self, obj):
        return f"Cart #{obj.cart.id} ({obj.cart.customer.user.username})"
    cart_customer.short_description = "Cart"

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

    def formatted_price(self, obj):
        return f"${obj.price:.2f}"
    formatted_price.short_description = "Price"

    def formatted_subtotal(self, obj):
        return f"${obj.subtotal:.2f}"
    formatted_subtotal.short_description = "Subtotal"
