from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter
from rest_framework.throttling import ScopedRateThrottle


from .serializers.auth_serializers import CustomTokenObtainPairSerializer

# Rate-limited wrappers for JWT token views
class ThrottledTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "token_refresh"

# Views:
from .views import (
    RegisterView,
    LogoutView,
    UserUpdateView,
    CustomerProfileView,
    EmployeeProfileView,
    EmployeeCreateView,
    AdminUserListView,
    AdminUserDetailView,
    AdminCustomerListView,
    AdminEmployeeListView,
    AdminStatsView,
    MeView,
)

# ViewSets:
from .views import AddressViewSet

# Register the ViewSet with a router for automatic URL routing
router = DefaultRouter()
router.register(r"me/addresses", AddressViewSet, basename="address")


urlpatterns = [
    # JWT Authentication Endpoints
    path("login/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("login/refresh/", ThrottledTokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("logout/", LogoutView.as_view(), name="logout"),

    # User Update Endpoint
    path("me/update/", UserUpdateView.as_view(), name="user-update"),

    # Customer Profile Endpoints
    path("me/", CustomerProfileView.as_view(), name="customer-profile"),
    path("me/profile/", MeView.as_view(), name="user-profile"),

    # Address management endpoints
    path("", include(router.urls)),

    # Employee Profile Endpoints
    path("me/employee/", EmployeeProfileView.as_view(), name="employee-profile"),

    # Admin-only: promote a registered user to employee
    path("employees/", EmployeeCreateView.as_view(), name="employee-create"),

    # Admin Panel: stats, user, customer, employee management
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("customers/", AdminCustomerListView.as_view(), name="admin-customer-list"),
    path("employees/list/", AdminEmployeeListView.as_view(), name="admin-employee-list"),
]

