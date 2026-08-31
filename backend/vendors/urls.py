from django.urls import path
from .views import (
    VendorListCreateView,
    VendorDetailView,
    PurchaseOrderListCreateView,
    PurchaseOrderDetailView,
    ImportListCreateView,
    ImportDetailView,
    ReceiveImportView,
)

app_name = "vendors"

urlpatterns = [
    # Vendors
    path("vendors/", VendorListCreateView.as_view(), name="vendor-list"),
    path("vendors/<int:pk>/", VendorDetailView.as_view(), name="vendor-detail"),
    # Purchase Orders
    path("purchase-orders/", PurchaseOrderListCreateView.as_view(), name="po-list"),
    path("purchase-orders/<int:pk>/", PurchaseOrderDetailView.as_view(), name="po-detail"),
    # Imports
    path("imports/", ImportListCreateView.as_view(), name="import-list"),
    path("imports/<int:pk>/", ImportDetailView.as_view(), name="import-detail"),
    path("imports/<int:pk>/receive/", ReceiveImportView.as_view(), name="import-receive"),
]
