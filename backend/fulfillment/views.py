"""
Presentation views for the Fulfillment domain using generic DRF view classes.
"""

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from core.mixins import DomainErrorMixin
from core.permissions import (
    IsShippingExecutive,
    IsSupportAgent,
    IsCustomer,
    IsOwnerOrAdmin,
    IsAdminUser,
)
from orders.models import Order
from inventory.models import Warehouse
from .models import Shipment, Return, Exchange, Refund
from .serializers import (
    ShipmentSerializer,
    DispatchSerializer,
    MarkDeliveredSerializer,
    ReturnSerializer,
    ReturnCreateSerializer,
    ExchangeSerializer,
    RefundSerializer,
    RefundCreateSerializer,
)
from .services import (
    dispatch_order,
    mark_delivered,
    request_return,
    approve_return,
    reject_return,
    process_refund,
)


class ShipmentListView(DomainErrorMixin, generics.ListAPIView):

    """
    GET /api/v1/fulfillment/shipments/
    List all shipments (Shipping Executive / Admin).
    """

    queryset = Shipment.objects.select_related("order", "warehouse").all()
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated, IsShippingExecutive]


class DispatchOrderView(DomainErrorMixin, generics.CreateAPIView):
    """
    POST /api/v1/fulfillment/shipments/dispatch/
    Dispatch an order and generate its tracking record.
    """

    serializer_class = DispatchSerializer
    permission_classes = [IsAuthenticated, IsShippingExecutive]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = get_object_or_404(Order, pk=serializer.validated_data["order_id"])

        user_warehouse_id = getattr(getattr(request.user, "employee_profile", None), "warehouse_id", None)
        target_warehouse_id = (
            user_warehouse_id
            or order.locked_by_warehouse_id
            or serializer.validated_data.get("warehouse_id")
        )

        if not target_warehouse_id:
            return Response(
                {"detail": "No warehouse assigned or specified for dispatch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shipment = dispatch_order(
            order=order,
            warehouse_id=target_warehouse_id,
            tracking_number=serializer.validated_data["tracking_number"],
            carrier=serializer.validated_data["carrier"],
            ship_date=serializer.validated_data.get("ship_date"),
            dispatched_by=request.user,
        )
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)


class MarkDeliveredView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/fulfillment/shipments/<id>/deliver/
    Confirm delivery milestone for a shipment.
    """

    permission_classes = [IsAuthenticated, IsShippingExecutive]
    queryset = Shipment.objects.all()
    serializer_class = MarkDeliveredSerializer

    def post(self, request, pk, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        shipment = self.get_object()
        updated_shipment = mark_delivered(
            shipment=shipment,
            delivery_date=serializer.validated_data.get("delivery_date"),
            updated_by=request.user,
        )
        return Response(ShipmentSerializer(updated_shipment).data, status=status.HTTP_200_OK)


class ReturnRequestView(DomainErrorMixin, generics.CreateAPIView):
    """
    POST /api/v1/fulfillment/returns/
    Submit a return request for a delivered order.
    """

    serializer_class = ReturnCreateSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = get_object_or_404(Order, pk=serializer.validated_data["order_id"])
        return_obj = request_return(
            order=order,
            reason=serializer.validated_data["reason"],
            customer=request.user,
        )
        return Response(ReturnSerializer(return_obj).data, status=status.HTTP_201_CREATED)


class ReturnDetailView(DomainErrorMixin, generics.RetrieveAPIView):
    """
    GET /api/v1/fulfillment/returns/<id>/
    Retrieve return request details.
    """

    queryset = Return.objects.all()
    serializer_class = ReturnSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]


class ReturnApproveView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/fulfillment/returns/<id>/approve/
    Support Agent approves a return request.
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]
    queryset = Return.objects.all()

    def post(self, request, pk, *args, **kwargs):
        return_obj = self.get_object()
        approved = approve_return(return_obj=return_obj, approved_by=request.user)
        return Response(ReturnSerializer(approved).data, status=status.HTTP_200_OK)


class ReturnRejectView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/fulfillment/returns/<id>/reject/
    Support Agent rejects a return request.
    """

    permission_classes = [IsAuthenticated, IsSupportAgent]
    queryset = Return.objects.all()

    def post(self, request, pk, *args, **kwargs):
        return_obj = self.get_object()
        rejected = reject_return(return_obj=return_obj, rejected_by=request.user)
        return Response(ReturnSerializer(rejected).data, status=status.HTTP_200_OK)


class RefundCreateView(DomainErrorMixin, generics.CreateAPIView):
    """
    POST /api/v1/fulfillment/refunds/
    Process a refund for an approved return request.
    """

    serializer_class = RefundCreateSerializer
    permission_classes = [IsAuthenticated, IsSupportAgent]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return_obj = get_object_or_404(Return, pk=serializer.validated_data["return_id"])
        refund = process_refund(
            return_obj=return_obj,
            amount=serializer.validated_data["amount"],
            reason=serializer.validated_data["reason"],
            processed_by=request.user,
        )
        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)
