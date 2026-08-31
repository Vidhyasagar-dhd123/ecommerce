from django.urls import path
from wishlist.views import (
    WishlistView,
    WishlistItemAddView,
    WishlistItemRemoveView,
    WishlistClearView,
)

app_name = "wishlist"

urlpatterns = [
    path("", WishlistView.as_view(), name="detail"),
    path("add/", WishlistItemAddView.as_view(), name="add"),
    path("remove/<int:product_id>/", WishlistItemRemoveView.as_view(), name="remove"),
    path("clear/", WishlistClearView.as_view(), name="clear"),
]
