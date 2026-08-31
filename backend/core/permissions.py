"""
Role-Based Access Control (RBAC) and Object-Level Permissions.

Permission classes enforce both Tier-1 (User.role) and Tier-2 (User.groups)
access checks across the application endpoints.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminUser(BasePermission):
    """
    Allows access only to users with role=admin or Django superuser flag.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool(request.user.is_admin_user)


class IsEmployee(BasePermission):
    """
    Allows access to any employee user or admin.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool(request.user.is_employee or request.user.is_admin_user)


class IsShippingExecutive(BasePermission):
    """
    Allows access to Shipping Executive group members or admins.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool(request.user.is_shipping_executive or request.user.is_admin_user)


class IsInventoryManager(BasePermission):
    """
    Allows access to Inventory Manager group members or admins.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return bool(request.user.is_admin_user or request.user.is_inventory_manager)


class IsSupportAgent(BasePermission):
    """
    Allows access to Support Agent group members or admins.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return bool(request.user.is_admin_user or request.user.is_support_agent)


class IsCustomer(BasePermission):
    """
    Allows access only to authenticated customer users.
    """

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_customer
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission.
    Allows access if the object's owner equals request.user, or if user is admin.
    Resolves ownership across User, Customer, Order, Return, Cart, etc.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_admin_user:
            return True

        owner = (
            getattr(obj, "user", None)
            or getattr(getattr(obj, "customer", None), "user", None)
            or getattr(getattr(getattr(obj, "order", None), "customer", None), "user", None)
            or getattr(getattr(getattr(obj, "cart", None), "customer", None), "user", None)
        )
        return owner == request.user


class IsAdminOrReadOnly(BasePermission):
    """
    Safe methods (GET, HEAD, OPTIONS) are allowed to anyone authenticated.
    Write methods require admin role.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_admin_user)


class IsEmployeeOrReadOnly(BasePermission):
    """
    Safe methods (GET, HEAD, OPTIONS) are allowed to anyone authenticated.
    Write methods require employee or admin role.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_employee or request.user.is_admin_user)


class IsShippingExecutiveOrReadOnly(BasePermission):
    """
    Safe methods (GET, HEAD, OPTIONS) are allowed to anyone authenticated.
    Write methods require shipping executive or admin role.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_shipping_executive or request.user.is_admin_user)


def get_user_warehouse(user):
    """
    Safely retrieves the assigned Warehouse for an authenticated user, or None.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return None
    employee_profile = getattr(user, "employee_profile", None)
    if employee_profile and getattr(employee_profile, "warehouse", None):
        return employee_profile.warehouse
    return None


def validate_warehouse_access(user, warehouse_or_id):
    """
    Unified validation helper to verify a user has permission to operate on a warehouse.
    Admins have global access.
    Employees must belong to the matching warehouse.
    Raises WarehouseAccessDeniedError on mismatch or unassigned status.
    """
    from core.exceptions import WarehouseAccessDeniedError

    if not user or not getattr(user, "is_authenticated", False):
        raise WarehouseAccessDeniedError("Authentication required.")

    if getattr(user, "is_admin_user", False):
        return

    if warehouse_or_id is None:
        return

    target_warehouse_id = (
        warehouse_or_id.pk if hasattr(warehouse_or_id, "pk") else int(warehouse_or_id)
    )

    user_wh = get_user_warehouse(user)
    if not user_wh:
        raise WarehouseAccessDeniedError(
            "You are not assigned to any warehouse and cannot perform this operation."
        )

    if user_wh.pk != target_warehouse_id:
        raise WarehouseAccessDeniedError(
            f"Access denied: You are assigned to warehouse '{user_wh.name}' "
            f"and cannot operate on warehouse #{target_warehouse_id}."
        )


class HasWarehouseAccess(BasePermission):
    """
    Allows access only to Admins or Employees who have an assigned Warehouse.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_admin_user:
            return True
        return get_user_warehouse(request.user) is not None


class IsWarehouseStaffOrAdmin(BasePermission):
    """
    Object-level permission ensuring staff can only access objects belonging to their assigned warehouse.
    Admins retain global access.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool(request.user.is_employee or request.user.is_admin_user)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_admin_user:
            return True

        obj_wh = (
            getattr(obj, "warehouse", None)
            or getattr(obj, "locked_by_warehouse", None)
            or getattr(getattr(obj, "inventory", None), "warehouse", None)
        )
        if obj_wh is None:
            return True

        user_wh = get_user_warehouse(request.user)
        return user_wh is not None and user_wh.pk == obj_wh.pk


class IsOwnerOrWarehouseStaffOrAdmin(BasePermission):
    """
    Object-level permission allowing:
    1. Owning customer access (without leaking warehouse scoping).
    2. Warehouse staff access to objects within their assigned warehouse.
    3. Admins global access.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_admin_user:
            return True

        # Check customer ownership
        owner = (
            getattr(obj, "user", None)
            or getattr(getattr(obj, "customer", None), "user", None)
            or getattr(getattr(getattr(obj, "order", None), "customer", None), "user", None)
        )
        if owner == request.user:
            return True

        # Check warehouse staff access
        if request.user.is_employee:
            obj_wh = (
                getattr(obj, "warehouse", None)
                or getattr(obj, "locked_by_warehouse", None)
                or getattr(getattr(obj, "inventory", None), "warehouse", None)
            )
            if obj_wh is None:
                return True
            user_wh = get_user_warehouse(request.user)
            return user_wh is not None and user_wh.pk == obj_wh.pk

        return False

