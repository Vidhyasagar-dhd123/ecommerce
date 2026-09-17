from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..serializers import UserUpdateSerializer, MeSerializer
from core.permissions import IsAdminUser, IsEmployee, IsCustomer

from ..serializers import (
    CustomerProfileSerializer,
    EmployeeProfileSerializer,
    EmployeeCreateSerializer,
    UserAdminSerializer,
    CustomerAdminSerializer,
)


class UserUpdateView(generics.UpdateAPIView):
    """
    API view for updating user information (username, email).
    Supports partial updates (PATCH) only — no full replacement.
    """

    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticated, IsCustomer | IsAdminUser]

    def get_object(self):
        return self.request.user


class CustomerProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  → return the authenticated customer's profile.
    PUT  → update date_of_birth and/or gender (partial update allowed).
    """

    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_object(self):
        return self.request.user.customer_profile

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


class MeView(generics.RetrieveAPIView):
    """Return the authenticated user's profile for both customers and admins."""

    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class EmployeeProfileView(APIView):
    """
    GET  → employee reads their own profile (read-only by policy).
    PUT  → blocked for employees; only admins may update via this endpoint.
    Stays as APIView — the PUT has a hard permission branch that cannot be
    expressed through generic get_object / get_serializer alone.
    """

    permission_classes = [IsAuthenticated, IsEmployee]

    def get(self, request):
        serializer = EmployeeProfileSerializer(request.user.employee_profile)
        return Response(serializer.data)

    def put(self, request):
        # Employees cannot modify their own profile (confidentiality policy).
        if not request.user.is_admin_user:
            return Response(
                {"detail": "Employees are not permitted to modify their own profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = EmployeeProfileSerializer(
            request.user.employee_profile, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeCreateView(generics.CreateAPIView):
    """
    Admin-only endpoint to promote an existing registered user to an employee.

    POST /api/users/employees/
    {
        "user_id": 5,
        "employee_code": "EMP-042",
        "designation": "ShippingExecutive",
        "hire_date": "2026-01-15"
    }
    """

    serializer_class = EmployeeCreateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.save()
        return Response(
            EmployeeProfileSerializer(employee).data,
            status=status.HTTP_201_CREATED,
        )


# ─── Admin Panel Endpoints ────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """
    GET /api/v1/auth/users/
    Admin-only: list all users in the system with optional role filter.
    Query params: role (admin|employee|customer), is_active (true|false)
    """

    serializer_class = UserAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        from ..models import User
        qs = User.objects.all().order_by("-date_joined")
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        return qs


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/v1/auth/users/<id>/
    Admin-only: retrieve or update a specific user (e.g., activate/deactivate).
    """

    serializer_class = UserAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        from ..models import User
        return User.objects.all()

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


class AdminCustomerListView(generics.ListAPIView):
    """
    GET /api/v1/auth/customers/
    Admin-only: list all customer profiles.
    Query params: search (username/email substring)
    """

    serializer_class = CustomerAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        from ..models import Customer
        qs = Customer.objects.select_related("user").all().order_by("-user__date_joined")
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                user__username__icontains=search
            ) | qs.filter(user__email__icontains=search)
        return qs


class AdminEmployeeListView(generics.ListAPIView):
    """
    GET /api/v1/auth/employees/
    Admin-only: list all employee profiles.
    Query params: designation (ShippingExecutive|InventoryManager|SupportAgent)
    """

    serializer_class = EmployeeProfileSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        from ..models import Employee
        qs = Employee.objects.select_related("user").all().order_by("-user__date_joined")
        designation = self.request.query_params.get("designation")
        if designation:
            qs = qs.filter(designation=designation)
        return qs


class AdminStatsView(APIView):
    """
    GET /api/v1/auth/admin/stats/
    Admin-only: returns platform overview metrics across users, orders, revenue, inventory, and fulfillment.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from django.db.models import Sum, Count, Q
        from users.models import User
        from orders.models import Order
        from products.models import Product, ProductVariant
        from fulfillment.models import Return, Shipment
        from promotions.models import Coupon

        # Users breakdown
        total_users = User.objects.count()
        total_customers = User.objects.filter(role="customer").count()
        total_employees = User.objects.filter(role="employee").count()
        total_admins = User.objects.filter(role="admin").count()
        active_users = User.objects.filter(is_active=True).count()

        # Orders breakdown
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status="pending").count()
        confirmed_orders = Order.objects.filter(status="confirmed").count()
        shipped_orders = Order.objects.filter(status="shipped").count()
        delivered_orders = Order.objects.filter(status="delivered").count()
        cancelled_orders = Order.objects.filter(status="cancelled").count()

        # Revenue
        revenue_data = Order.objects.exclude(status="cancelled").aggregate(total=Sum("total_amount"))
        total_revenue = float(revenue_data["total"] or 0)

        # Catalog & Inventory
        total_products = Product.objects.count()
        total_variants = ProductVariant.objects.count()
        low_stock_variants = ProductVariant.objects.filter(stock__gt=0, stock__lt=10).count()
        out_of_stock_variants = ProductVariant.objects.filter(stock=0).count()

        # Fulfillment & Marketing
        pending_returns = Return.objects.filter(status__in=["received", "approved"]).count()
        active_shipments = Shipment.objects.filter(delivery_date__isnull=True).count()
        active_coupons = Coupon.objects.filter(status=True).count()

        return Response({
            "users": {
                "total": total_users,
                "customers": total_customers,
                "employees": total_employees,
                "admins": total_admins,
                "active": active_users,
            },
            "orders": {
                "total": total_orders,
                "pending": pending_orders,
                "confirmed": confirmed_orders,
                "shipped": shipped_orders,
                "delivered": delivered_orders,
                "cancelled": cancelled_orders,
                "revenue": total_revenue,
            },
            "inventory": {
                "products": total_products,
                "variants": total_variants,
                "low_stock": low_stock_variants,
                "out_of_stock": out_of_stock_variants,
            },
            "operations": {
                "pending_returns": pending_returns,
                "active_shipments": active_shipments,
                "active_coupons": active_coupons,
            }
        })

