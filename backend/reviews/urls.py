from django.urls import path
from reviews.views import ProductReviewListView, SubmitReviewView

app_name = "reviews"

urlpatterns = [
    path("products/<int:product_id>/", ProductReviewListView.as_view(), name="product-reviews"),
    path("products/<int:product_id>/submit/", SubmitReviewView.as_view(), name="submit-review"),
]
