from .auth_views import RegisterView, LogoutView
from .profile_views import (
    UserUpdateView,
    MeView,
    CustomerProfileView,
    EmployeeProfileView,
    EmployeeCreateView,
    AdminUserListView,
    AdminUserDetailView,
    AdminCustomerListView,
    AdminEmployeeListView,
    AdminStatsView,
)
from .address_views import AddressViewSet

__all__ = [
    "RegisterView",
    "LogoutView",
    "UserUpdateView",
    "MeView",
    "CustomerProfileView",
    "EmployeeProfileView",
    "EmployeeCreateView",
    "AddressViewSet",
    "AdminUserListView",
    "AdminUserDetailView",
    "AdminCustomerListView",
    "AdminEmployeeListView",
    "AdminStatsView",
]