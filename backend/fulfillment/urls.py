from django.urls import path
from .views import (
    ShipmentListView,
    DispatchOrderView,
    MarkDeliveredView,
    ReturnRequestView,
    ReturnDetailView,
    ReturnApproveView,
    ReturnRejectView,
    RefundCreateView,
)

app_name = "fulfillment"

urlpatterns = [
    # Shipments
    path("shipments/", ShipmentListView.as_view(), name="shipment-list"),

    path("shipments/dispatch/", DispatchOrderView.as_view(), name="dispatch"),
    path("shipments/<int:pk>/deliver/", MarkDeliveredView.as_view(), name="deliver"),
    # Returns
    path("returns/", ReturnRequestView.as_view(), name="return-create"),
    path("returns/<int:pk>/", ReturnDetailView.as_view(), name="return-detail"),
    path("returns/<int:pk>/approve/", ReturnApproveView.as_view(), name="return-approve"),
    path("returns/<int:pk>/reject/", ReturnRejectView.as_view(), name="return-reject"),
    # Refunds
    path("refunds/", RefundCreateView.as_view(), name="refund-create"),
]
