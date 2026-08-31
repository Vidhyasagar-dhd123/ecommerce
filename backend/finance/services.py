import logging
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from core.exceptions import DomainError, DueNotFoundError, DueAlreadyPaidError
from core.permissions import validate_warehouse_access
from finance.models import Dues, DuesStatus

logger = logging.getLogger(__name__)


@transaction.atomic
def create_due(
    *,
    customer,
    amount: Decimal,
    due_date,
    warehouse=None,
    status: str = DuesStatus.PENDING,
) -> Dues:
    """Creates a new customer dues record optionally associated with a warehouse."""
    if amount <= Decimal("0.00"):
        raise DomainError("Due amount must be greater than zero.")

    due = Dues.objects.create(
        customer=customer,
        warehouse=warehouse,
        amount=amount,
        due_date=due_date,
        status=status,
    )
    logger.info("Due #%s created for customer #%s (WH: %s): %s", due.pk, customer.pk, warehouse, amount)
    return due


@transaction.atomic
def mark_due_paid(*, due_id: int, marked_by=None) -> Dues:
    """Marks an outstanding due as PAID, verifying warehouse access for staff."""
    try:
        due = Dues.objects.select_for_update().get(pk=due_id)
    except Dues.DoesNotExist:
        raise DueNotFoundError(f"Due #{due_id} not found.")

    if due.status == DuesStatus.PAID:
        raise DueAlreadyPaidError(f"Due #{due_id} is already settled.")

    if marked_by and due.warehouse_id:
        # If staff user (not the owing customer), validate warehouse access
        is_customer_owner = hasattr(due.customer, "user") and due.customer.user == marked_by
        if not is_customer_owner:
            validate_warehouse_access(marked_by, due.warehouse_id)

    due.status = DuesStatus.PAID
    due.save(update_fields=["status", "updated_at"])
    logger.info("Due #%s marked as PAID by %s", due.pk, marked_by)
    return due


def get_customer_total_dues(*, customer, warehouse=None) -> dict:
    """
    Computes total outstanding dues (PENDING + OVERDUE) for a customer.
    If warehouse is provided, restricts aggregation to that warehouse.
    """
    qs = Dues.objects.filter(
        customer=customer,
        status__in=[DuesStatus.PENDING, DuesStatus.OVERDUE],
    )
    if warehouse:
        qs = qs.filter(warehouse=warehouse)

    total_amount = qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    pending_count = qs.filter(status=DuesStatus.PENDING).count()
    overdue_count = qs.filter(status=DuesStatus.OVERDUE).count()

    return {
        "customer_id": customer.pk,
        "total_due": total_amount,
        "pending_dues_count": pending_count,
        "overdue_dues_count": overdue_count,
    }


@transaction.atomic
def update_overdue_dues() -> int:
    """Updates any pending dues with past due_date to OVERDUE status."""
    today = timezone.now().date()
    updated_count = Dues.objects.filter(
        status=DuesStatus.PENDING,
        due_date__lt=today,
    ).update(status=DuesStatus.OVERDUE)
    logger.info("Updated %s overdue dues to OVERDUE status", updated_count)
    return updated_count

