from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from core.mixins import DomainErrorMixin
from core.permissions import (
    IsAdminUser,
    IsSupportAgent,
    IsInventoryManager,
    IsOwnerOrWarehouseStaffOrAdmin,
    get_user_warehouse,
    validate_warehouse_access,
)
from users.models import Customer
from finance.models import Dues
from finance.services import create_due, mark_due_paid, get_customer_total_dues
from finance.serializers import (
    DuesSerializer,
    CreateDuesSerializer,
    DuesSummarySerializer,
)


class DuesListView(DomainErrorMixin, generics.ListAPIView):
    """
    GET /api/v1/finance/dues/
    List dues:
    - Customers: See only their own dues (warehouse details hidden).
    - Warehouse Staff: See dues scoped to their assigned warehouse.
    - Admins: See all dues across warehouses (can filter by warehouse_id or customer_id).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = DuesSerializer

    def get_queryset(self):
        user = self.request.user
        customer_id = self.request.query_params.get("customer_id")

        if user.is_admin_user:
            qs = Dues.objects.all().select_related("customer__user", "warehouse")
            warehouse_id = self.request.query_params.get("warehouse_id")
            if warehouse_id:
                qs = qs.filter(warehouse_id=warehouse_id)
            if customer_id:
                qs = qs.filter(customer_id=customer_id)
            return qs

        if user.is_employee:
            user_wh = get_user_warehouse(user)
            if not user_wh:
                return Dues.objects.none()
            qs = Dues.objects.filter(warehouse=user_wh).select_related("customer__user", "warehouse")
            if customer_id:
                qs = qs.filter(customer_id=customer_id)
            return qs

        try:
            customer = Customer.objects.get(user=user)
            return Dues.objects.filter(customer=customer).select_related("customer__user")
        except Customer.DoesNotExist:
            return Dues.objects.none()


class DuesSummaryView(DomainErrorMixin, generics.GenericAPIView):
    """
    GET /api/v1/finance/dues/summary/
    Returns total outstanding dues and count.
    - Customers: Returns total dues for themselves.
    - Warehouse Staff / Admins: Returns summary for a specified customer_id (staff scoped to their warehouse).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = DuesSummarySerializer

    def get(self, request, *args, **kwargs):
        user = request.user
        if user.is_customer and not (user.is_admin_user or user.is_employee):
            customer = get_object_or_404(Customer, user=user)
            summary = get_customer_total_dues(customer=customer)
        else:
            customer_id = request.query_params.get("customer_id")
            if not customer_id:
                return Response(
                    {"detail": "customer_id query parameter is required for staff summary."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            customer = get_object_or_404(Customer, pk=customer_id)
            target_wh = None if user.is_admin_user else get_user_warehouse(user)
            summary = get_customer_total_dues(customer=customer, warehouse=target_wh)

        return Response(DuesSummarySerializer(summary).data, status=status.HTTP_200_OK)


class DuesCreateView(DomainErrorMixin, generics.CreateAPIView):
    """
    POST /api/v1/finance/dues/create/
    Admin, Support Agent, or Inventory Manager creates a dues record.
    """

    permission_classes = [IsAuthenticated, IsAdminUser | IsSupportAgent | IsInventoryManager]
    serializer_class = CreateDuesSerializer

    def perform_create(self, serializer):
        user = self.request.user
        warehouse = serializer.validated_data.get("warehouse")
        if not warehouse and user.is_employee:
            warehouse = get_user_warehouse(user)
        elif warehouse and user.is_employee:
            validate_warehouse_access(user, warehouse.pk)

        due = create_due(
            customer=serializer.validated_data["customer"],
            amount=serializer.validated_data["amount"],
            due_date=serializer.validated_data["due_date"],
            warehouse=warehouse,
            status=serializer.validated_data.get("status", "pending"),
        )
        serializer.instance = due


class DuesPayView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/finance/dues/<id>/pay/
    Mark a dues obligation as settled.
    Accessible by the owing customer or assigned warehouse staff / admin.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        due = mark_due_paid(due_id=pk, marked_by=request.user)
        return Response(
            DuesSerializer(due, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class DuesDetailView(DomainErrorMixin, generics.RetrieveAPIView):
    """
    GET /api/v1/finance/dues/<id>/
    Retrieve a single dues record.
    """

    serializer_class = DuesSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrWarehouseStaffOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_user:
            return Dues.objects.all().select_related("customer__user", "warehouse")
        if user.is_employee:
            user_wh = get_user_warehouse(user)
            if not user_wh:
                return Dues.objects.none()
            return Dues.objects.filter(warehouse=user_wh).select_related("customer__user", "warehouse")
        try:
            customer = Customer.objects.get(user=user)
            return Dues.objects.filter(customer=customer).select_related("customer__user")
        except Customer.DoesNotExist:
            return Dues.objects.none()

