from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from core.exceptions import (
    DomainError,
    DueNotFoundError,
    DueAlreadyPaidError,
    WarehouseAccessDeniedError,
)
from users.models import Customer, Employee, Designation
from inventory.models import Warehouse
from finance.models import Dues, DuesStatus
from finance.services import (
    create_due,
    mark_due_paid,
    update_overdue_dues,
    get_customer_total_dues,
)

User = get_user_model()


class FinanceServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="finservuser", email="finserv@test.com", password="password123", role="customer"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.wh1 = Warehouse.objects.create(name="WH Dallas", location="Dallas")
        self.wh2 = Warehouse.objects.create(name="WH Austin", location="Austin")

        support_group, _ = Group.objects.get_or_create(name=Designation.SUPPORT_AGENT)

        self.staff_wh1 = User.objects.create_user(
            username="staff_wh1", email="staff1@test.com", password="pass", role="employee"
        )
        self.staff_wh1.groups.add(support_group)
        Employee.objects.create(
            user=self.staff_wh1,
            employee_code="FIN-E1",
            designation=Designation.SUPPORT_AGENT,
            hire_date="2026-01-01",
            warehouse=self.wh1,
        )

        self.staff_wh2 = User.objects.create_user(
            username="staff_wh2", email="staff2@test.com", password="pass", role="employee"
        )
        self.staff_wh2.groups.add(support_group)
        Employee.objects.create(
            user=self.staff_wh2,
            employee_code="FIN-E2",
            designation=Designation.SUPPORT_AGENT,
            hire_date="2026-01-01",
            warehouse=self.wh2,
        )

    def test_create_due_success_and_invalid_amount(self):
        due = create_due(
            customer=self.customer,
            amount=Decimal("200.00"),
            due_date=date.today() + timedelta(days=14),
            warehouse=self.wh1,
        )
        self.assertEqual(due.amount, Decimal("200.00"))
        self.assertEqual(due.status, DuesStatus.PENDING)
        self.assertEqual(due.warehouse, self.wh1)

        with self.assertRaises(DomainError):
            create_due(
                customer=self.customer,
                amount=Decimal("0.00"),
                due_date=date.today(),
            )

    def test_get_customer_total_dues(self):
        create_due(
            customer=self.customer,
            amount=Decimal("100.00"),
            due_date=date.today() + timedelta(days=5),
            warehouse=self.wh1,
        )
        create_due(
            customer=self.customer,
            amount=Decimal("150.00"),
            due_date=date.today() + timedelta(days=5),
            warehouse=self.wh2,
        )
        paid_due = create_due(
            customer=self.customer,
            amount=Decimal("50.00"),
            due_date=date.today() + timedelta(days=5),
            warehouse=self.wh1,
            status=DuesStatus.PAID,
        )

        # Global customer total (across warehouses)
        global_summary = get_customer_total_dues(customer=self.customer)
        self.assertEqual(global_summary["total_due"], Decimal("250.00"))
        self.assertEqual(global_summary["pending_dues_count"], 2)

        # Scoped to WH1
        wh1_summary = get_customer_total_dues(customer=self.customer, warehouse=self.wh1)
        self.assertEqual(wh1_summary["total_due"], Decimal("100.00"))
        self.assertEqual(wh1_summary["pending_dues_count"], 1)

        # Scoped to WH2
        wh2_summary = get_customer_total_dues(customer=self.customer, warehouse=self.wh2)
        self.assertEqual(wh2_summary["total_due"], Decimal("150.00"))
        self.assertEqual(wh2_summary["pending_dues_count"], 1)

    def test_mark_due_paid_and_warehouse_validation(self):
        due = create_due(
            customer=self.customer,
            amount=Decimal("100.00"),
            due_date=date.today() + timedelta(days=5),
            warehouse=self.wh1,
        )

        # Staff from WH2 attempting to mark WH1 due as paid -> raises WarehouseAccessDeniedError
        with self.assertRaises(WarehouseAccessDeniedError):
            mark_due_paid(due_id=due.pk, marked_by=self.staff_wh2)

        # Staff from WH1 marking as paid -> success
        paid = mark_due_paid(due_id=due.pk, marked_by=self.staff_wh1)
        self.assertEqual(paid.status, DuesStatus.PAID)

        # Duplicate pay raises error
        with self.assertRaises(DueAlreadyPaidError):
            mark_due_paid(due_id=due.pk, marked_by=self.staff_wh1)

    def test_customer_can_pay_own_due_regardless_of_warehouse(self):
        due = create_due(
            customer=self.customer,
            amount=Decimal("75.00"),
            due_date=date.today() + timedelta(days=5),
            warehouse=self.wh1,
        )
        paid = mark_due_paid(due_id=due.pk, marked_by=self.user)
        self.assertEqual(paid.status, DuesStatus.PAID)

    def test_update_overdue_dues(self):
        Dues.objects.create(
            customer=self.customer,
            amount=Decimal("50.00"),
            due_date=date.today() - timedelta(days=2),
            status=DuesStatus.PENDING,
            warehouse=self.wh1,
        )
        count = update_overdue_dues()
        self.assertGreaterEqual(count, 1)
        overdue_due = Dues.objects.filter(customer=self.customer, status=DuesStatus.OVERDUE).first()
        self.assertIsNotNone(overdue_due)

