from django.contrib import admin
from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    raw_id_fields = ["variant"]


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "is_active", "created_at", "updated_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["customer__user__username", "customer__user__email"]
    raw_id_fields = ["customer"]
    inlines = [CartItemInline]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ["id", "cart", "variant", "quantity", "price", "subtotal"]
    list_filter = ["created_at"]
    search_fields = ["variant__sku", "cart__customer__user__username"]
    raw_id_fields = ["cart", "variant"]
