"""
Presentation views for the Inventory domain using generic DRF view classes.

RBAC:
- Warehouses: Inventory Manager / Shipping Executive (read), Admin (write)
- Inventory levels: Inventory Manager / Shipping Executive (read-only)
- Stock adjustments: Inventory Manager only
- Stock transactions: Inventory Manager / Shipping Executive (read-only)
"""

import logging
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from core.mixins import DomainErrorMixin
from core.permissions import IsAdminUser, IsInventoryManager, IsShippingExecutive
from .models import Warehouse, Inventory, StockTransaction
from .serializers import (
    WarehouseSerializer,
    InventorySerializer,
    StockAdjustSerializer,
    StockTransactionSerializer,
)
from .services import adjust_stock

logger = logging.getLogger(__name__)


class WarehouseListCreateView(DomainErrorMixin, generics.ListCreateAPIView):
    """
    GET  /api/v1/inventory/warehouses/ — InventoryManager or ShippingExecutive (assigned warehouse), Admin (all)
    POST /api/v1/inventory/warehouses/ — Admin only
    """

    serializer_class = WarehouseSerializer

    def get_queryset(self):
        qs = Warehouse.objects.filter(is_deleted=False)
        user = self.request.user
        if user and user.is_authenticated and not user.is_admin_user:
            profile = getattr(user, "employee_profile", None)
            if profile and profile.warehouse_id:
                return qs.filter(pk=profile.warehouse_id)
            return qs.none()
        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), (IsInventoryManager | IsShippingExecutive)()]
        return [IsAuthenticated(), IsAdminUser()]


class WarehouseDetailView(DomainErrorMixin, generics.RetrieveUpdateAPIView):
    """
    GET  /api/v1/inventory/warehouses/<id>/ — InventoryManager or ShippingExecutive (assigned warehouse), Admin (all)
    PATCH /api/v1/inventory/warehouses/<id>/ — Admin only
    """

    serializer_class = WarehouseSerializer

    def get_queryset(self):
        qs = Warehouse.objects.filter(is_deleted=False)
        user = self.request.user
        if user and user.is_authenticated and not user.is_admin_user:
            profile = getattr(user, "employee_profile", None)
            if profile and profile.warehouse_id:
                return qs.filter(pk=profile.warehouse_id)
            return qs.none()
        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), (IsInventoryManager | IsShippingExecutive)()]
        return [IsAuthenticated(), IsAdminUser()]


    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


class InventoryListView(DomainErrorMixin, generics.ListAPIView):
    """
    GET /api/v1/inventory/
    List inventory records. Scoped to employee's assigned warehouse (or all for Admin).
    Query params: warehouse_id, variant_id, needs_reorder=true
    """

    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated, IsInventoryManager | IsShippingExecutive]

    def get_queryset(self):
        qs = Inventory.objects.select_related("warehouse", "variant").filter(
            is_deleted=False
        )
        user = self.request.user
        if user and user.is_authenticated and not user.is_admin_user:
            profile = getattr(user, "employee_profile", None)
            if profile and profile.warehouse_id:
                qs = qs.filter(warehouse_id=profile.warehouse_id)
            else:
                return qs.none()

        params = self.request.query_params
        warehouse_id = params.get("warehouse_id")
        variant_id = params.get("variant_id")
        needs_reorder = params.get("needs_reorder", "").lower()

        if warehouse_id:
            if user.is_admin_user:
                qs = qs.filter(warehouse_id=warehouse_id)
            else:
                profile = getattr(user, "employee_profile", None)
                if profile and str(profile.warehouse_id) == str(warehouse_id):
                    qs = qs.filter(warehouse_id=warehouse_id)
                else:
                    return qs.none()

        if variant_id:
            qs = qs.filter(variant_id=variant_id)
        if needs_reorder == "true":
            # Filter records where available_stock <= reorder_level
            from django.db.models import F

            qs = qs.filter(available_stock__lte=F("reorder_level"))
        return qs


class StockAdjustView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/inventory/adjust/
    Inventory Manager only — adjust stock for an inventory record in their assigned warehouse.
    Creates a StockTransaction audit log entry.
    """

    serializer_class = StockAdjustSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        inventory_id = serializer.validated_data["inventory_id"]
        try:
            inventory = Inventory.objects.get(pk=inventory_id, is_deleted=False)
        except Inventory.DoesNotExist:
            return Response(
                {"detail": f"Inventory record {inventory_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        tx = adjust_stock(
            inventory=inventory,
            quantity=serializer.validated_data["quantity"],
            transaction_type=serializer.validated_data["transaction_type"],
            employee=request.user,
            reference_id=serializer.validated_data.get("reference_id", ""),
            notes=serializer.validated_data.get("notes", ""),
        )
        return Response(
            StockTransactionSerializer(tx).data, status=status.HTTP_201_CREATED
        )


class StockTransactionListView(DomainErrorMixin, generics.ListAPIView):
    """
    GET /api/v1/inventory/transactions/
    Immutable audit log. Read-only for Inventory Managers and Shipping Executives (scoped to assigned warehouse).
    Query params: warehouse_id, variant_id, type
    """

    serializer_class = StockTransactionSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager | IsShippingExecutive]

    def get_queryset(self):
        qs = StockTransaction.objects.select_related(
            "inventory__warehouse", "variant", "employee"
        ).all()
        user = self.request.user
        if user and user.is_authenticated and not user.is_admin_user:
            profile = getattr(user, "employee_profile", None)
            if profile and profile.warehouse_id:
                qs = qs.filter(inventory__warehouse_id=profile.warehouse_id)
            else:
                return qs.none()

        params = self.request.query_params
        warehouse_id = params.get("warehouse_id")
        variant_id = params.get("variant_id")
        tx_type = params.get("type")

        if warehouse_id:
            if user.is_admin_user:
                qs = qs.filter(inventory__warehouse_id=warehouse_id)
            else:
                profile = getattr(user, "employee_profile", None)
                if profile and str(profile.warehouse_id) == str(warehouse_id):
                    qs = qs.filter(inventory__warehouse_id=warehouse_id)
                else:
                    return qs.none()

        if variant_id:
            qs = qs.filter(variant_id=variant_id)
        if tx_type:
            qs = qs.filter(type=tx_type)
        return qs

