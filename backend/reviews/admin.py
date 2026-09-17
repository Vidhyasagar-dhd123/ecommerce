from django.contrib import admin
from django.utils.html import format_html
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["id", "product_link", "customer_name", "rating_stars", "comment_snippet", "created_at"]
    list_filter = ["rating", "created_at"]
    search_fields = ["product__name", "customer__user__username", "comment"]
    raw_id_fields = ["product", "customer"]

    def product_link(self, obj):
        return obj.product.name
    product_link.short_description = "Product"

    def customer_name(self, obj):
        return obj.customer.user.username
    customer_name.short_description = "Customer"

    def rating_stars(self, obj):
        stars = "★" * int(obj.rating) + "☆" * (5 - int(obj.rating))
        return format_html('<span style="color: #f59e0b; font-size: 15px;">{}</span> ({})', stars, obj.rating)
    rating_stars.short_description = "Rating"

    def comment_snippet(self, obj):
        if len(obj.comment) > 60:
            return obj.comment[:57] + "..."
        return obj.comment
    comment_snippet.short_description = "Feedback"
