"""
Presentation views for the Vendors domain using generic DRF view classes.

RBAC (all endpoints require Inventory Manager):
- Vendors: List/create/update (InventoryManager)
- PurchaseOrders: Full CRUD (InventoryManager)
- Imports: Create/list/detail (InventoryManager), receive (InventoryManager)
"""

import logging
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from core.mixins import DomainErrorMixin
from core.permissions import IsInventoryManager, IsAdminUser
from inventory.models import Warehouse
from .models import Vendor, PurchaseOrder, Import
from .serializers import (
    VendorSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderCreateSerializer,
    PurchaseOrderStatusUpdateSerializer,
    ImportSerializer,
    ImportCreateSerializer,
)
from .services import create_purchase_order, create_import

logger = logging.getLogger(__name__)


# ─── Vendors ──────────────────────────────────────────────────────────────────

class VendorListCreateView(DomainErrorMixin, generics.ListCreateAPIView):
    """
    GET  /api/v1/vendors/ — List all vendors (InventoryManager)
    POST /api/v1/vendors/ — Create a vendor (InventoryManager)
    """

    queryset = Vendor.objects.filter(is_deleted=False).order_by("name")
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager | IsAdminUser]


class VendorDetailView(DomainErrorMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    GET   /api/v1/vendors/<id>/ — Retrieve vendor details
    PATCH /api/v1/vendors/<id>/ — Update vendor
    DELETE /api/v1/vendors/<id>/ — Soft-delete vendor
    """

    queryset = Vendor.objects.filter(is_deleted=False)
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager | IsAdminUser]

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        instance.soft_delete()


# ─── Purchase Orders ──────────────────────────────────────────────────────────

class PurchaseOrderListCreateView(DomainErrorMixin, generics.GenericAPIView):
    """
    GET  /api/v1/purchase-orders/ — List all POs (InventoryManager)
    POST /api/v1/purchase-orders/ — Create a PO with line items
    """

    permission_classes = [IsAuthenticated, IsInventoryManager | IsAdminUser]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer

    def get(self, request, *args, **kwargs):
        qs = PurchaseOrder.objects.select_related("vendor").prefetch_related("items__variant").all()
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        from core.pagination import StandardPagination
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = PurchaseOrderSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vendor = get_object_or_404(Vendor, pk=serializer.validated_data["vendor_id"])
        po = create_purchase_order(
            vendor=vendor,
            items=serializer.validated_data["items"],
            created_by=request.user,
        )
        return Response(
            PurchaseOrderSerializer(po).data,
            status=status.HTTP_201_CREATED,
        )


class PurchaseOrderDetailView(DomainErrorMixin, generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/purchase-orders/<id>/ — Retrieve PO with items
    PATCH /api/v1/purchase-orders/<id>/ — Update PO status
    """

    queryset = PurchaseOrder.objects.select_related("vendor").prefetch_related("items__variant")
    permission_classes = [IsAuthenticated, IsInventoryManager | IsAdminUser]

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return PurchaseOrderStatusUpdateSerializer
        return PurchaseOrderSerializer

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


# ─── Imports ──────────────────────────────────────────────────────────────────

class ImportListCreateView(DomainErrorMixin, generics.GenericAPIView):
    """
    GET  /api/v1/imports/ — List all imports (InventoryManager)
    POST /api/v1/imports/ — Create an import with line items
    """

    permission_classes = [IsAuthenticated, IsInventoryManager | IsAdminUser]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ImportCreateSerializer
        return ImportSerializer

    def get(self, request, *args, **kwargs):
        qs = Import.objects.select_related("vendor", "warehouse").prefetch_related("items__variant").all()
        status_filter = request.query_params.get("status")
        vendor_id = request.query_params.get("vendor_id")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        from core.pagination import StandardPagination
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ImportSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vendor = get_object_or_404(Vendor, pk=serializer.validated_data["vendor_id"])
        warehouse = get_object_or_404(
            Warehouse, pk=serializer.validated_data["warehouse_id"]
        )
        import_record = create_import(
            vendor=vendor,
            warehouse=warehouse,
            import_date=serializer.validated_data["import_date"],
            items=serializer.validated_data["items"],
            created_by=request.user,
        )
        return Response(
            ImportSerializer(import_record).data,
            status=status.HTTP_201_CREATED,
        )


class ImportDetailView(DomainErrorMixin, generics.RetrieveAPIView):
    """
    GET /api/v1/imports/<id>/ — Retrieve import record with all items.
    """

    queryset = Import.objects.select_related("vendor", "warehouse").prefetch_related("items__variant")
    serializer_class = ImportSerializer
    permission_classes = [IsAuthenticated, IsInventoryManager | IsAdminUser]


class ReceiveImportView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/imports/<id>/receive/
    Mark an import as received.
    Triggers inventory.services.receive_import() which updates Inventory
    and creates StockTransaction records.
    """

    queryset = Import.objects.all()
    permission_classes = [IsAuthenticated, IsInventoryManager]

    def post(self, request, pk, *args, **kwargs):
        import_record = get_object_or_404(Import, pk=pk)
        from inventory.services import receive_import

        receive_import(import_record=import_record, received_by=request.user)
        import_record.refresh_from_db()
        return Response(
            ImportSerializer(import_record).data,
            status=status.HTTP_200_OK,
        )
