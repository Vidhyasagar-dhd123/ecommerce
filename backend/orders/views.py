"""
Presentation views for the Orders domain using generic DRF view classes.
"""

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db import models
from core.mixins import DomainErrorMixin
from core.permissions import (
    IsCustomer,
    IsOwnerOrAdmin,
    IsAdminUser,
    IsInventoryManager,
    IsSupportAgent,
    IsShippingExecutive,
)
from .models import Order
from .serializers import (
    OrderListSerializer,
    OrderDetailSerializer,
    CreateOrderSerializer,
)
from .services import (
    create_order_from_cart,
    cancel_order,
    lock_order,
    unlock_order,
    validate_order_warehouse_access,
)


class OrderListView(DomainErrorMixin, generics.ListAPIView):
    """
    GET /api/v1/orders/
    List orders:
    - Admin sees all orders.
    - Employees (Inventory Manager, Shipping Executive, Support Agent) see all unlocked orders
      plus orders locked to their own assigned warehouse (excluding orders locked by other warehouses).
    - Customers only see their own orders.
    """

    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_user:
            return Order.objects.with_relations()
        if user.is_shipping_executive:
            warehouse_id = getattr(getattr(user, "employee_profile", None), "warehouse_id", None)
            if not warehouse_id:
                return Order.objects.none()
            return (
                Order.objects.filter(
                    locked_by_warehouse_id=warehouse_id,
                    locked_by__isnull=False,
                )
                .filter(
                    models.Q(locked_by__groups__name="SupportAgent")
                    | models.Q(locked_by__employee_profile__designation="SupportAgent")
                )
                .with_relations()
            )
        if (
            user.is_support_agent
            or user.is_inventory_manager
            or user.is_employee
        ):
            warehouse_id = getattr(getattr(user, "employee_profile", None), "warehouse_id", None)
            if warehouse_id:
                return Order.objects.filter(
                    models.Q(locked_by_warehouse__isnull=True)
                    | models.Q(locked_by_warehouse_id=warehouse_id)
                ).with_relations()
            return Order.objects.filter(locked_by_warehouse__isnull=True).with_relations()
        if user.is_customer and hasattr(user, "customer_profile"):
            return Order.objects.for_customer(user.customer_profile).with_relations()
        return Order.objects.none()


class OrderDetailView(DomainErrorMixin, generics.RetrieveAPIView):
    """
    GET /api/v1/orders/<id>/
    Retrieve full details of a specific order.
    Enforces customer ownership and warehouse-level lock access.
    """

    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated]
    queryset = Order.objects.with_relations()

    def get_object(self):
        order = super().get_object()
        user = self.request.user
        if user.is_customer:
            if not hasattr(user, "customer_profile") or order.customer_id != user.customer_profile.id:
                self.permission_denied(self.request, message="You do not have permission to view this order.")
        elif not user.is_admin_user:
            validate_order_warehouse_access(order, user)
            if user.is_shipping_executive:
                warehouse_id = getattr(getattr(user, "employee_profile", None), "warehouse_id", None)
                is_support_agent_locked = (
                    order.locked_by
                    and (
                        order.locked_by.groups.filter(name="SupportAgent").exists()
                        or getattr(getattr(order.locked_by, "employee_profile", None), "designation", None) == "SupportAgent"
                    )
                )
                if not is_support_agent_locked or order.locked_by_warehouse_id != warehouse_id:
                    self.permission_denied(
                        self.request,
                        message="Shipping executives can only view orders locked by a Support Agent of their assigned warehouse.",
                    )
        return order


class LockOrderView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/orders/<id>/lock/
    Inventory Manager, Shipping Executive, Support Agent, or Admin locks an order to their assigned warehouse.
    """

    permission_classes = [
        IsAuthenticated,
        IsInventoryManager | IsSupportAgent | IsShippingExecutive | IsAdminUser,
    ]
    queryset = Order.objects.all()

    def post(self, request, pk, *args, **kwargs):
        order = self.get_object()
        locked_order = lock_order(order=order, employee=request.user)
        return Response(OrderDetailSerializer(locked_order).data, status=status.HTTP_200_OK)


class UnlockOrderView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/orders/<id>/unlock/
    Unlocks an order, releasing it for any warehouse to lock.
    """

    permission_classes = [
        IsAuthenticated,
        IsInventoryManager | IsSupportAgent | IsShippingExecutive | IsAdminUser,
    ]
    queryset = Order.objects.all()

    def post(self, request, pk, *args, **kwargs):
        order = self.get_object()
        unlocked_order = unlock_order(order=order, employee=request.user)
        return Response(OrderDetailSerializer(unlocked_order).data, status=status.HTTP_200_OK)



class CreateOrderView(DomainErrorMixin, generics.CreateAPIView):
    """
    POST /api/v1/orders/create/
    Place a new order from the customer's active shopping cart.
    """

    serializer_class = CreateOrderSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = create_order_from_cart(
            customer=request.user.customer_profile,
            address_id=serializer.validated_data["address_id"],
            payment_method=serializer.validated_data["payment_method"],
            coupon_code=serializer.validated_data.get("coupon_code", ""),
        )
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


from .services import (
    create_order_from_cart,
    confirm_order,
    cancel_order,
    update_order_status,
    lock_order,
    unlock_order,
    validate_order_warehouse_access,
)


class ConfirmOrderView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/orders/<id>/confirm/
    Staff confirms an incoming pending order.
    """

    permission_classes = [
        IsAuthenticated,
        IsInventoryManager | IsSupportAgent | IsShippingExecutive | IsAdminUser,
    ]
    queryset = Order.objects.all()

    def post(self, request, pk, *args, **kwargs):
        order = self.get_object()
        confirmed_order = confirm_order(order=order, confirmed_by=request.user)
        return Response(OrderDetailSerializer(confirmed_order, context={"request": request}).data, status=status.HTTP_200_OK)


class UpdateOrderStatusView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/orders/<id>/status/
    Update order status (confirmed, shipped, delivered, cancelled).
    Requires the order to be locked by the staff's warehouse.
    """

    permission_classes = [
        IsAuthenticated,
        IsInventoryManager | IsSupportAgent | IsShippingExecutive | IsAdminUser,
    ]
    queryset = Order.objects.all()

    def post(self, request, pk, *args, **kwargs):
        order = self.get_object()
        new_status = request.data.get("status")
        if not new_status:
            return Response({"detail": "Field 'status' is required."}, status=status.HTTP_400_BAD_REQUEST)
        updated_order = update_order_status(order=order, new_status=new_status, employee=request.user)
        return Response(OrderDetailSerializer(updated_order, context={"request": request}).data, status=status.HTTP_200_OK)


class CancelOrderView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/orders/<id>/cancel/
    Cancel an order and release reserved inventory back into stock.
    Requires order to be locked by the staff's warehouse.
    """

    permission_classes = [
        IsAuthenticated,
        IsOwnerOrAdmin | IsSupportAgent | IsInventoryManager | IsAdminUser,
    ]
    queryset = Order.objects.all()

    def post(self, request, pk, *args, **kwargs):
        order = self.get_object()
        cancelled_order = cancel_order(order=order, cancelled_by=request.user)
        return Response(OrderDetailSerializer(cancelled_order, context={"request": request}).data, status=status.HTTP_200_OK)


class AdminOrderListView(DomainErrorMixin, generics.ListAPIView):
    """
    GET /api/v1/orders/admin/
    Full administrative list view of all orders in the system.
    """

    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Order.objects.with_relations()

