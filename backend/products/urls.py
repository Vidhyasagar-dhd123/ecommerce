from django.urls import path
from .views import (
    CategoryListView,
    BrandListView,
    ProductListView,
    ProductDetailView,
    ProductCreateView,
    ProductUpdateView,
    ProductDeleteView,
    VariantListCreateView,
    VariantDetailView,
)

app_name = "products"

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("brands/", BrandListView.as_view(), name="brand-list"),
    path("", ProductListView.as_view(), name="list"),
    path("create/", ProductCreateView.as_view(), name="create"),
    # Variant detail/update/delete — must come before slug routes to avoid matching
    path("variants/<int:pk>/", VariantDetailView.as_view(), name="variant-detail"),
    # Product detail, update, delete
    path("<slug:slug>/", ProductDetailView.as_view(), name="detail"),
    path("<slug:slug>/update/", ProductUpdateView.as_view(), name="update"),
    path("<slug:slug>/delete/", ProductDeleteView.as_view(), name="delete"),
    # Variant list (GET) & create (POST admin) — unified endpoint
    path("<slug:slug>/variants/", VariantListCreateView.as_view(), name="variant-list"),
]
