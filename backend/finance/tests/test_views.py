from datetime import date, timedelta
from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APITestCase
from rest_framework import status

from users.models import Customer, Employee, Designation
from inventory.models import Warehouse
from finance.models import Dues, DuesStatus

User = get_user_model()


class FinanceViewTests(APITestCase):
    def setUp(self):
        self.admin_group, _ = Group.objects.get_or_create(name="Admin")
        self.support_group, _ = Group.objects.get_or_create(name=Designation.SUPPORT_AGENT)

        # Warehouses
        self.wh1 = Warehouse.objects.create(name="Dallas Hub", location="Dallas")
        self.wh2 = Warehouse.objects.create(name="Austin Hub", location="Austin")

        # Admin user
        self.admin_user = User.objects.create_user(
            username="finadmin", email="finadmin@test.com", password="password123", role="admin", is_staff=True
        )
        self.admin_user.groups.add(self.admin_group)

        # Staff users
        self.staff_wh1 = User.objects.create_user(
            username="staff_wh1", email="staff1@test.com", password="password123", role="employee"
        )
        self.staff_wh1.groups.add(self.support_group)
        Employee.objects.create(
            user=self.staff_wh1,
            employee_code="FIN-V1",
            designation=Designation.SUPPORT_AGENT,
            hire_date="2026-01-01",
            warehouse=self.wh1,
        )

        self.staff_wh2 = User.objects.create_user(
            username="staff_wh2", email="staff2@test.com", password="password123", role="employee"
        )
        self.staff_wh2.groups.add(self.support_group)
        Employee.objects.create(
            user=self.staff_wh2,
            employee_code="FIN-V2",
            designation=Designation.SUPPORT_AGENT,
            hire_date="2026-01-01",
            warehouse=self.wh2,
        )

        # Customer 1
        self.customer_user1 = User.objects.create_user(
            username="fincust1", email="fcust1@test.com", password="password123", role="customer"
        )
        self.customer1 = Customer.objects.create(user=self.customer_user1)

        # Customer 2
        self.customer_user2 = User.objects.create_user(
            username="fincust2", email="fcust2@test.com", password="password123", role="customer"
        )
        self.customer2 = Customer.objects.create(user=self.customer_user2)

    def test_customer_only_sees_own_dues_and_warehouse_hidden(self):
        Dues.objects.create(
            customer=self.customer1,
            warehouse=self.wh1,
            amount=Decimal("100.00"),
            due_date=date.today() + timedelta(days=7),
        )
        Dues.objects.create(
            customer=self.customer2,
            warehouse=self.wh2,
            amount=Decimal("200.00"),
            due_date=date.today() + timedelta(days=7),
        )

        self.client.force_authenticate(user=self.customer_user1)
        response = self.client.get(reverse("finance:dues-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data") if "data" in response.data else response.data
        results = data.get("results", data) if isinstance(data, dict) else data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["customer"], self.customer1.pk)
        # Customer should NOT see warehouse details
        self.assertNotIn("warehouse", results[0])
        self.assertNotIn("warehouse_name", results[0])

    def test_staff_sees_warehouse_scoped_dues_with_warehouse_info(self):
        Dues.objects.create(
            customer=self.customer1,
            warehouse=self.wh1,
            amount=Decimal("100.00"),
            due_date=date.today() + timedelta(days=7),
        )
        Dues.objects.create(
            customer=self.customer1,
            warehouse=self.wh2,
            amount=Decimal("150.00"),
            due_date=date.today() + timedelta(days=7),
        )

        # Staff WH1 only sees WH1 dues
        self.client.force_authenticate(user=self.staff_wh1)
        response = self.client.get(reverse("finance:dues-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data") if "data" in response.data else response.data
        results = data.get("results", data) if isinstance(data, dict) else data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["warehouse"], self.wh1.pk)
        self.assertEqual(results[0]["warehouse_name"], "Dallas Hub")

        # Admin sees all dues
        self.client.force_authenticate(user=self.admin_user)
        admin_res = self.client.get(reverse("finance:dues-list"))
        admin_data = admin_res.data.get("data") if "data" in admin_res.data else admin_res.data
        admin_results = admin_data.get("results", admin_data) if isinstance(admin_data, dict) else admin_data
        self.assertEqual(len(admin_results), 2)

    def test_dues_summary_endpoint(self):
        Dues.objects.create(
            customer=self.customer1,
            warehouse=self.wh1,
            amount=Decimal("100.00"),
            due_date=date.today() + timedelta(days=5),
        )
        Dues.objects.create(
            customer=self.customer1,
            warehouse=self.wh2,
            amount=Decimal("150.00"),
            due_date=date.today() + timedelta(days=5),
        )

        # Customer accesses own summary
        self.client.force_authenticate(user=self.customer_user1)
        cust_res = self.client.get(reverse("finance:dues-summary"))
        self.assertEqual(cust_res.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(cust_res.data["total_due"]), Decimal("250.00"))
        self.assertEqual(cust_res.data["pending_dues_count"], 2)

        # Staff WH1 accesses customer summary (scoped to WH1)
        self.client.force_authenticate(user=self.staff_wh1)
        staff_res = self.client.get(reverse("finance:dues-summary"), {"customer_id": self.customer1.pk})
        self.assertEqual(staff_res.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(staff_res.data["total_due"]), Decimal("100.00"))
        self.assertEqual(staff_res.data["pending_dues_count"], 1)

        # Admin accesses customer summary (global)
        self.client.force_authenticate(user=self.admin_user)
        admin_res = self.client.get(reverse("finance:dues-summary"), {"customer_id": self.customer1.pk})
        self.assertEqual(admin_res.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(admin_res.data["total_due"]), Decimal("250.00"))

    def test_admin_can_create_due(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "customer": self.customer1.pk,
            "warehouse": self.wh1.pk,
            "amount": "150.00",
            "due_date": str(date.today() + timedelta(days=10)),
            "status": "pending",
        }
        response = self.client.post(reverse("finance:dues-create"), payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Dues.objects.filter(customer=self.customer1).count(), 1)

    def test_staff_cannot_create_due_for_another_warehouse(self):
        self.client.force_authenticate(user=self.staff_wh1)
        payload = {
            "customer": self.customer1.pk,
            "warehouse": self.wh2.pk,  # staff_wh1 is in wh1, trying to create for wh2
            "amount": "150.00",
            "due_date": str(date.today() + timedelta(days=10)),
        }
        response = self.client.post(reverse("finance:dues-create"), payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_create_due(self):
        self.client.force_authenticate(user=self.customer_user1)
        payload = {
            "customer": self.customer1.pk,
            "amount": "150.00",
            "due_date": str(date.today() + timedelta(days=10)),
        }
        response = self.client.post(reverse("finance:dues-create"), payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pay_due_endpoint_and_isolation(self):
        due = Dues.objects.create(
            customer=self.customer1,
            warehouse=self.wh1,
            amount=Decimal("120.00"),
            due_date=date.today() + timedelta(days=5),
        )

        # Staff from WH2 tries to mark WH1 due paid -> 403 Forbidden
        self.client.force_authenticate(user=self.staff_wh2)
        wh2_res = self.client.post(reverse("finance:dues-pay", kwargs={"pk": due.pk}))
        self.assertEqual(wh2_res.status_code, status.HTTP_403_FORBIDDEN)

        # Customer can pay own due
        self.client.force_authenticate(user=self.customer_user1)
        response = self.client.post(reverse("finance:dues-pay", kwargs={"pk": due.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        due.refresh_from_db()
        self.assertEqual(due.status, DuesStatus.PAID)

