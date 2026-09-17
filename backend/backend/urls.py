from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

# Configure ShopEase Admin site branding
admin.site.site_header = "ShopEase Administration"
admin.site.site_title = "ShopEase Admin Portal"
admin.site.index_title = "Platform Control & Model Operations"

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

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

