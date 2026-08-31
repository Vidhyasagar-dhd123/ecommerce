from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from users.models import Customer, Address, AddressType
from products.models import Category, Product, ProductVariant
from cart.services import add_item_to_cart
from orders.models import Order, OrderStatus
from orders.services import create_order_from_cart

User = get_user_model()


class OrderViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="orderviewuser", email="orderview@test.com", password="password123", role="customer"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.address = Address.objects.create(
            customer=self.customer,
            name="Office Address",
            street="789 Avenue",
            city="Metropolis",
            state="State",
            zipcode="11223",
            country="Country",
            address_type=AddressType.SHIPPING,
        )

        self.other_user = User.objects.create_user(
            username="otherorderviewuser", email="otherorder@test.com", password="password123", role="customer"
        )
        self.other_customer = Customer.objects.create(user=self.other_user)

        self.category = Category.objects.create(name="Games", slug="games")
        self.product = Product.objects.create(
            name="Console",
            slug="console",
            category=self.category,
            base_price=Decimal("400.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="CONSOLE-500GB",
            price=Decimal("400.00"),
            stock=10,
        )

    def test_create_order_via_api(self):
        self.client.force_authenticate(user=self.user)
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=2)

        response = self.client.post(
            reverse("orders:create"),
            {
                "address_id": self.address.pk,
                "payment_method": "cod",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.filter(customer=self.customer).count(), 1)

    def test_list_orders_for_customer(self):
        self.client.force_authenticate(user=self.user)
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=1)
        create_order_from_cart(customer=self.customer, address_id=self.address.pk, payment_method="cod")

        response = self.client.get(reverse("orders:list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data") if "data" in response.data else response.data
        results = data.get("results", data) if isinstance(data, dict) else data
        self.assertEqual(len(results), 1)

    def test_cancel_order_via_api(self):
        self.client.force_authenticate(user=self.user)
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=1)
        order = create_order_from_cart(customer=self.customer, address_id=self.address.pk, payment_method="cod")

        response = self.client.post(reverse("orders:cancel", kwargs={"pk": order.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.CANCELLED)

    def test_customer_cannot_cancel_another_customers_order(self):
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=1)
        order = create_order_from_cart(customer=self.customer, address_id=self.address.pk, payment_method="cod")

        # Authenticate as other_user
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(reverse("orders:cancel", kwargs={"pk": order.pk}))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_warehouse_locking_api_endpoints(self):
        from django.contrib.auth.models import Group
        from users.models import Employee, Designation
        from inventory.models import Warehouse

        wh1 = Warehouse.objects.create(name="WH Alpha", location="Alpha")
        wh2 = Warehouse.objects.create(name="WH Beta", location="Beta")

        support_group, _ = Group.objects.get_or_create(name=Designation.SUPPORT_AGENT)

        agent_wh1 = User.objects.create_user(username="agent_wh1", email="agent1@test.com", password="pass", role="employee")
        agent_wh1.groups.add(support_group)
        Employee.objects.create(user=agent_wh1, employee_code="E-1", designation=Designation.SUPPORT_AGENT, hire_date="2026-01-01", warehouse=wh1)

        agent_wh2 = User.objects.create_user(username="agent_wh2", email="agent2@test.com", password="pass", role="employee")
        agent_wh2.groups.add(support_group)
        Employee.objects.create(user=agent_wh2, employee_code="E-2", designation=Designation.SUPPORT_AGENT, hire_date="2026-01-01", warehouse=wh2)

        admin_user = User.objects.create_user(username="admin_order", email="admin_order@test.com", password="pass", role="admin")

        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=1)
        order = create_order_from_cart(customer=self.customer, address_id=self.address.pk, payment_method="cod")

        # Agent WH1 locks order
        self.client.force_authenticate(user=agent_wh1)
        lock_res = self.client.post(reverse("orders:lock", kwargs={"pk": order.pk}))
        self.assertEqual(lock_res.status_code, status.HTTP_200_OK)
        self.assertEqual(lock_res.data["locked_by_warehouse"], wh1.pk)
        self.assertTrue(lock_res.data["is_locked"])

        # Agent WH2 attempts to lock -> 409 Conflict
        self.client.force_authenticate(user=agent_wh2)
        lock_conflict = self.client.post(reverse("orders:lock", kwargs={"pk": order.pk}))
        self.assertEqual(lock_conflict.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(lock_conflict.data["code"], "ORDER_ALREADY_LOCKED")

        # Agent WH2 attempts to view detail -> 403 Forbidden
        detail_res = self.client.get(reverse("orders:detail", kwargs={"pk": order.pk}))
        self.assertEqual(detail_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(detail_res.data["code"], "ORDER_LOCKED_BY_OTHER_WAREHOUSE")

        # Agent WH1 can view detail -> 200 OK
        self.client.force_authenticate(user=agent_wh1)
        wh1_detail = self.client.get(reverse("orders:detail", kwargs={"pk": order.pk}))
        self.assertEqual(wh1_detail.status_code, status.HTTP_200_OK)

        # Admin can view detail -> 200 OK
        self.client.force_authenticate(user=admin_user)
        admin_detail = self.client.get(reverse("orders:detail", kwargs={"pk": order.pk}))
        self.assertEqual(admin_detail.status_code, status.HTTP_200_OK)

        # Customer owner can still view their own order detail
        self.client.force_authenticate(user=self.user)
        cust_detail = self.client.get(reverse("orders:detail", kwargs={"pk": order.pk}))
        self.assertEqual(cust_detail.status_code, status.HTTP_200_OK)

        # Agent WH1 unlocks order
        self.client.force_authenticate(user=agent_wh1)
        unlock_res = self.client.post(reverse("orders:unlock", kwargs={"pk": order.pk}))
        self.assertEqual(unlock_res.status_code, status.HTTP_200_OK)
        self.assertFalse(unlock_res.data["is_locked"])

        # Now Agent WH2 can lock
        self.client.force_authenticate(user=agent_wh2)
        relock_res = self.client.post(reverse("orders:lock", kwargs={"pk": order.pk}))
        self.assertEqual(relock_res.status_code, status.HTTP_200_OK)
        self.assertEqual(relock_res.data["locked_by_warehouse"], wh2.pk)

