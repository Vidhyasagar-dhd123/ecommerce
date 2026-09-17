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
from core.permissions import (
    IsAdminUser,
    IsInventoryManager,
    IsShippingExecutive,
    IsSupportAgent,
)
from .models import Warehouse, Inventory, StockTransaction
from .serializers import (
    WarehouseSerializer,
    InventorySerializer,
    StockAdjustSerializer,
    StockTransactionSerializer,
    StockTransferSerializer,
    WarehouseStatsSerializer,
)
from .services import adjust_stock, transfer_stock

logger = logging.getLogger(__name__)


class WarehouseListCreateView(DomainErrorMixin, generics.ListCreateAPIView):
    """
    GET  /api/v1/inventory/warehouses/ — Staff (all active warehouses for transfer & routing)
    POST /api/v1/inventory/warehouses/ — Admin only
    """

    serializer_class = WarehouseSerializer

    def get_queryset(self):
        qs = Warehouse.objects.filter(is_deleted=False)
        if self.request.query_params.get("for_transfer") == "true" or self.request.query_params.get("all") == "true":
            return qs

        user = self.request.user
        if user and user.is_authenticated and not (user.is_admin_user or user.is_support_agent):
            profile = getattr(user, "employee_profile", None)
            if profile and profile.warehouse_id:
                return qs.filter(pk=profile.warehouse_id)
            return qs.none()
        return qs

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), (IsInventoryManager | IsShippingExecutive | IsSupportAgent | IsAdminUser)()]
        return [IsAuthenticated(), IsAdminUser()]


class WarehouseDetailView(DomainErrorMixin, generics.RetrieveUpdateAPIView):
    """
    GET  /api/v1/inventory/warehouses/<id>/ — Staff (read-only for all active warehouses)
    PATCH /api/v1/inventory/warehouses/<id>/ — Admin only
    """

    serializer_class = WarehouseSerializer

    def get_queryset(self):
        return Warehouse.objects.filter(is_deleted=False)

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated(), (IsInventoryManager | IsShippingExecutive | IsSupportAgent | IsAdminUser)()]
        return [IsAuthenticated(), IsAdminUser()]


    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


class InventoryListView(DomainErrorMixin, generics.ListAPIView):
    """
    GET /api/v1/inventory/
    List inventory records. Scoped to employee's assigned warehouse (or global for Support/Admin).
    Query params: warehouse_id, variant_id, needs_reorder=true
    """

    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated, IsInventoryManager | IsShippingExecutive | IsSupportAgent | IsAdminUser]

    def get_queryset(self):
        qs = Inventory.objects.select_related("warehouse", "variant").filter(
            is_deleted=False
        )
        user = self.request.user
        if user and user.is_authenticated and not (user.is_admin_user or user.is_support_agent):
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
            if user.is_admin_user or user.is_support_agent:
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
    permission_classes = [IsAuthenticated, IsInventoryManager | IsShippingExecutive | IsSupportAgent | IsAdminUser]

    def get_queryset(self):
        qs = StockTransaction.objects.select_related(
            "inventory__warehouse", "variant", "employee"
        ).all()
        user = self.request.user
        if user and user.is_authenticated and not (user.is_admin_user or user.is_support_agent):
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
            if user.is_admin_user or user.is_support_agent:
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


class StockTransferView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/inventory/transfer/
    Inventory Manager only — transfer stock of a variant from their assigned warehouse
    to another target warehouse.
    """

    serializer_class = StockTransferSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager | IsAdminUser]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        source_warehouse_id = None
        if user.is_admin_user:
            source_warehouse_id = request.data.get("source_warehouse_id")

        if not source_warehouse_id:
            profile = getattr(user, "employee_profile", None)
            if profile and profile.warehouse_id:
                source_warehouse_id = profile.warehouse_id

        if not source_warehouse_id:
            return Response(
                {"detail": "No source warehouse assigned to employee."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = serializer.validated_data.get("items")
        if not items:
            items = [
                {
                    "variant_id": serializer.validated_data["variant_id"],
                    "quantity": serializer.validated_data["quantity"],
                }
            ]

        from django.db import transaction

        results = []
        with transaction.atomic():
            for itm in items:
                res = transfer_stock(
                    source_warehouse_id=source_warehouse_id,
                    target_warehouse_id=serializer.validated_data["target_warehouse_id"],
                    variant_id=itm["variant_id"],
                    quantity=itm["quantity"],
                    employee=user,
                    notes=serializer.validated_data.get("notes", ""),
                )
                results.append(res)

        first_res = results[0]
        return Response(
            {
                "message": f"Successfully transferred {len(results)} product line(s).",
                "source_transaction": StockTransactionSerializer(first_res["source_transaction"]).data,
                "target_transaction": StockTransactionSerializer(first_res["target_transaction"]).data,
                "transfers": [
                    {
                        "source_transaction": StockTransactionSerializer(r["source_transaction"]).data,
                        "target_transaction": StockTransactionSerializer(r["target_transaction"]).data,
                        "quantity": r["quantity"],
                    }
                    for r in results
                ],
                "quantity": sum(r["quantity"] for r in results),
            },
            status=status.HTTP_201_CREATED,
        )


class WarehouseStatsView(DomainErrorMixin, generics.GenericAPIView):
    """
    GET /api/v1/inventory/stats/
    Returns real-time warehouse metrics for the employee's assigned warehouse.
    """

    permission_classes = [IsAuthenticated, IsInventoryManager | IsShippingExecutive | IsSupportAgent | IsAdminUser]

    def get(self, request, *args, **kwargs):
        user = request.user
        warehouse_id = request.query_params.get("warehouse_id")

        if not warehouse_id or not (user.is_admin_user or user.is_support_agent):
            profile = getattr(user, "employee_profile", None)
            if profile and profile.warehouse_id:
                warehouse_id = profile.warehouse_id

        if not warehouse_id:
            return Response(
                {"detail": "No assigned warehouse found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            wh = Warehouse.objects.get(pk=warehouse_id, is_deleted=False)
        except Warehouse.DoesNotExist:
            return Response({"detail": "Warehouse not found."}, status=status.HTTP_404_NOT_FOUND)

        from django.db.models import Sum, F
        from vendors.models import Import, ImportStatus

        inv_qs = Inventory.objects.filter(warehouse=wh, is_deleted=False)
        totals = inv_qs.aggregate(
            total_stock=Sum("stock"),
            total_reserved=Sum("reserved_stock"),
            total_available=Sum("available_stock"),
        )

        reorder_alerts_count = inv_qs.filter(available_stock__lte=F("reorder_level")).count()
        recent_tx_count = StockTransaction.objects.filter(inventory__warehouse=wh).count()
        pending_imports_count = Import.objects.filter(warehouse=wh, status=ImportStatus.PENDING).count()

        stats_data = {
            "warehouse_id": wh.pk,
            "warehouse_name": wh.name,
            "total_skus": inv_qs.count(),
            "total_stock": totals["total_stock"] or 0,
            "total_reserved": totals["total_reserved"] or 0,
            "total_available": totals["total_available"] or 0,
            "reorder_alerts_count": reorder_alerts_count,
            "recent_transactions_count": recent_tx_count,
            "pending_imports_count": pending_imports_count,
        }

        return Response(WarehouseStatsSerializer(stats_data).data, status=status.HTTP_200_OK)


