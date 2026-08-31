"""
URL configuration for backend project.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # Identity / User domain
    path("api/v1/auth/", include("users.urls")),
    path("api/auth/", include("users.urls")),  # backward-compatible alias
    # Catalog domain
    path("api/v1/products/", include("products.urls", namespace="products")),
    # Commerce domain
    path("api/v1/cart/", include("cart.urls", namespace="cart")),
    path("api/v1/orders/", include("orders.urls", namespace="orders")),
    # Fulfillment domain
    path("api/v1/fulfillment/", include("fulfillment.urls", namespace="fulfillment")),
    # Inventory domain
    path("api/v1/inventory/", include("inventory.urls", namespace="inventory")),
    # Vendors domain
    path("api/v1/", include("vendors.urls", namespace="vendors")),
    # Promotions & Offers domain
    path("api/v1/promotions/", include("promotions.urls", namespace="promotions")),
    # Reviews domain
    path("api/v1/reviews/", include("reviews.urls", namespace="reviews")),
    # Wishlist domain
    path("api/v1/wishlist/", include("wishlist.urls", namespace="wishlist")),
    # Finance domain
    path("api/v1/finance/", include("finance.urls", namespace="finance")),
]
