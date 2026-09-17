from django.urls import path
from .views import (
    OrderListView,
    OrderDetailView,
    CreateOrderView,
    ConfirmOrderView,
    UpdateOrderStatusView,
    CancelOrderView,
    AdminOrderListView,
    LockOrderView,
    UnlockOrderView,
)

app_name = "orders"

urlpatterns = [
    path("", OrderListView.as_view(), name="list"),
    path("create/", CreateOrderView.as_view(), name="create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="detail"),
    path("<int:pk>/lock/", LockOrderView.as_view(), name="lock"),
    path("<int:pk>/unlock/", UnlockOrderView.as_view(), name="unlock"),
    path("<int:pk>/confirm/", ConfirmOrderView.as_view(), name="confirm"),
    path("<int:pk>/status/", UpdateOrderStatusView.as_view(), name="update-status"),
    path("<int:pk>/cancel/", CancelOrderView.as_view(), name="cancel"),
    path("admin-list/", AdminOrderListView.as_view(), name="admin-list"),
]

