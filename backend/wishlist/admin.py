from django.contrib import admin
from wishlist.models import Wishlist, WishlistItem


class WishlistItemInline(admin.TabularInline):
    model = WishlistItem
    extra = 0


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "created_at", "updated_at"]
    search_fields = ["customer__user__username", "customer__user__email"]
    inlines = [WishlistItemInline]
