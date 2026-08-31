from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import Group
from rest_framework.test import APIClient
from rest_framework import status

from users.models import User, Employee, Designation
from products.models import Category, Product, ProductVariant
from inventory.models import Warehouse, Inventory, StockTransaction, StockTransactionType
from inventory.services import adjust_stock, WarehouseAccessDeniedError, InsufficientStockError


def create_user(username, email, role="customer"):
    user = User.objects.create_user(
        username=username,
        email=email,
        password="password123",
        role=role,
    )
    return user


def create_employee(username, email, designation, warehouse=None):
    user = create_user(username, email, role="employee")
    group, _ = Group.objects.get_or_create(name=designation)
    user.groups.add(group)
    employee = Employee.objects.create(
        user=user,
        employee_code=f"EMP-{username.upper()}",
        designation=designation,
        hire_date="2026-01-01",
        warehouse=warehouse,
    )
    return user


def create_admin(username="admin_user", email="admin@example.com"):
    return create_user(username, email, role="admin")


class WarehouseScopedInventoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Warehouses
        self.wh1 = Warehouse.objects.create(name="Dallas Hub", location="Dallas, TX")
        self.wh2 = Warehouse.objects.create(name="Chicago Hub", location="Chicago, IL")

        # Products & Variants
        self.category = Category.objects.create(name="Apparel", slug="apparel")
        self.product = Product.all_objects.create(
            name="T-Shirt",
            slug="t-shirt",
            category=self.category,
            base_price=Decimal("25.00"),
        )
        self.variant = ProductVariant.all_objects.create(
            product=self.product,
            sku="TSHIRT-BLK-M",
            price=Decimal("25.00"),
            stock=100,
        )

        # Inventory Records
        self.inv1 = Inventory.objects.create(
            warehouse=self.wh1,
            variant=self.variant,
            stock=50,
            available_stock=50,
        )
        self.inv2 = Inventory.objects.create(
            warehouse=self.wh2,
            variant=self.variant,
            stock=50,
            available_stock=50,
        )

        # Users
        self.admin = create_admin()
        self.mgr_wh1 = create_employee("mgr_wh1", "mgr1@example.com", Designation.INVENTORY_MANAGER, warehouse=self.wh1)
        self.mgr_wh2 = create_employee("mgr_wh2", "mgr2@example.com", Designation.INVENTORY_MANAGER, warehouse=self.wh2)
        self.mgr_no_wh = create_employee("mgr_no_wh", "mgr_none@example.com", Designation.INVENTORY_MANAGER, warehouse=None)
        self.ship_wh1 = create_employee("ship_wh1", "ship1@example.com", Designation.SHIPPING_EXECUTIVE, warehouse=self.wh1)

    def test_service_adjust_stock_warehouse_match_succeeds(self):
        tx = adjust_stock(
            inventory=self.inv1,
            quantity=10,
            transaction_type=StockTransactionType.ADJUSTMENT,
            employee=self.mgr_wh1,
            notes="Inventory recount",
        )
        self.assertEqual(tx.quantity, 10)
        self.inv1.refresh_from_db()
        self.assertEqual(self.inv1.stock, 60)

    def test_service_adjust_stock_warehouse_mismatch_raises_error(self):
        with self.assertRaises(WarehouseAccessDeniedError):
            adjust_stock(
                inventory=self.inv2,
                quantity=10,
                transaction_type=StockTransactionType.ADJUSTMENT,
                employee=self.mgr_wh1,
            )

    def test_service_adjust_stock_unassigned_employee_raises_error(self):
        with self.assertRaises(WarehouseAccessDeniedError):
            adjust_stock(
                inventory=self.inv1,
                quantity=10,
                transaction_type=StockTransactionType.ADJUSTMENT,
                employee=self.mgr_no_wh,
            )

    def test_service_adjust_stock_admin_bypasses_warehouse_check(self):
        tx = adjust_stock(
            inventory=self.inv2,
            quantity=5,
            transaction_type=StockTransactionType.ADJUSTMENT,
            employee=self.admin,
        )
        self.assertEqual(tx.quantity, 5)
        self.inv2.refresh_from_db()
        self.assertEqual(self.inv2.stock, 55)

    def test_api_stock_adjust_same_warehouse_succeeds(self):
        self.client.force_authenticate(user=self.mgr_wh1)
        payload = {
            "inventory_id": self.inv1.pk,
            "quantity": 15,
            "transaction_type": "adjustment",
            "notes": "Cycle count addition",
        }
        response = self.client.post("/api/v1/inventory/adjust/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["quantity"], 15)

    def test_api_stock_adjust_different_warehouse_forbidden(self):
        self.client.force_authenticate(user=self.mgr_wh1)
        payload = {
            "inventory_id": self.inv2.pk,
            "quantity": 15,
            "transaction_type": "adjustment",
        }
        response = self.client.post("/api/v1/inventory/adjust/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "WAREHOUSE_ACCESS_DENIED")

    def test_api_stock_adjust_unassigned_warehouse_forbidden(self):
        self.client.force_authenticate(user=self.mgr_no_wh)
        payload = {
            "inventory_id": self.inv1.pk,
            "quantity": 10,
            "transaction_type": "adjustment",
        }
        response = self.client.post("/api/v1/inventory/adjust/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "WAREHOUSE_ACCESS_DENIED")

    def test_api_inventory_list_scoped_to_assigned_warehouse(self):
        self.client.force_authenticate(user=self.mgr_wh1)
        response = self.client.get("/api/v1/inventory/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["warehouse"], self.wh1.pk)

    def test_api_inventory_list_admin_sees_all_warehouses(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/inventory/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 2)

    def test_api_stock_transactions_scoped_to_assigned_warehouse(self):
        # Create transactions in both warehouses
        StockTransaction.objects.create(
            inventory=self.inv1,
            variant=self.variant,
            employee=self.mgr_wh1,
            type=StockTransactionType.ADJUSTMENT,
            quantity=5,
        )
        StockTransaction.objects.create(
            inventory=self.inv2,
            variant=self.variant,
            employee=self.mgr_wh2,
            type=StockTransactionType.ADJUSTMENT,
            quantity=10,
        )

        # mgr_wh1 only sees transactions for wh1
        self.client.force_authenticate(user=self.mgr_wh1)
        response = self.client.get("/api/v1/inventory/transactions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["warehouse_name"], "Dallas Hub")

        # Admin sees both
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/inventory/transactions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 2)

    def test_api_warehouses_list_scoped_for_employee(self):
        self.client.force_authenticate(user=self.ship_wh1)
        response = self.client.get("/api/v1/inventory/warehouses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.wh1.pk)

