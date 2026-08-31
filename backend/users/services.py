import logging
from django.db import transaction
from django.contrib.auth.models import Group

from core.exceptions import AlreadyEmployeeError
from .models import Customer, User, UserRole, Employee
from .models.profile import Designation

logger = logging.getLogger(__name__)


@transaction.atomic
def register_user(*, username: str, email: str, password: str) -> User:
    """
    Service function to handle user registration.
    Creates a new customer user and their Customer profile atomically.
    """
    logger.info("Registering new customer user: %s", username)
    user = User.objects.create_user(username=username, email=email, password=password)
    Customer.objects.create(user=user)
    return user


@transaction.atomic
def register_employee(
    *, user: User, employee_code: str, designation: str, hire_date, warehouse=None
) -> Employee:
    """
    Service function to promote an existing registered user to an employee.
    Validates designation against the Designation enum before assignment.
    Returns the created Employee instance.
    """
    valid_designations = [choice[0] for choice in Designation.choices]

    if designation not in valid_designations:
        raise ValueError(
            f"Invalid designation: '{designation}'. "
            f"Must be one of: {', '.join(valid_designations)}."
        )

    if Employee.objects.filter(user=user).exists():
        raise AlreadyEmployeeError("This user is already registered as an employee.")

    logger.info(
        "Promoting user %s to employee with designation %s", user.username, designation
    )
    # Promote user role
    user.role = UserRole.EMPLOYEE
    user.save(update_fields=["role"])

    # Assign the designation-specific Django Group
    employee_group, _ = Group.objects.get_or_create(name=designation)
    user.groups.add(employee_group)

    # Create the Employee profile
    return Employee.objects.create(
        user=user,
        employee_code=employee_code,
        designation=designation,
        hire_date=hire_date,
        warehouse=warehouse,
    )

