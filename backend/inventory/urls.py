from django.urls import path
from .views import (
    WarehouseListCreateView,
    WarehouseDetailView,
    InventoryListView,
    StockAdjustView,
    StockTransferView,
    WarehouseStatsView,
    StockTransactionListView,
)

app_name = "inventory"

urlpatterns = [
    # Warehouses
    path("warehouses/", WarehouseListCreateView.as_view(), name="warehouse-list"),
    path("warehouses/<int:pk>/", WarehouseDetailView.as_view(), name="warehouse-detail"),
    # Inventory levels
    path("", InventoryListView.as_view(), name="list"),
    # Stock adjustment (Inventory Manager only)
    path("adjust/", StockAdjustView.as_view(), name="adjust"),
    # Inter-warehouse transfer
    path("transfer/", StockTransferView.as_view(), name="transfer"),
    # Warehouse stats
    path("stats/", WarehouseStatsView.as_view(), name="stats"),
    # Audit log (read-only)
    path("transactions/", StockTransactionListView.as_view(), name="transaction-list"),
]
