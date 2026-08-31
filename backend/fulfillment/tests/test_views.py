from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APITestCase
from rest_framework import status

from users.models import Customer, Address, AddressType
from orders.models import Order, OrderStatus, Payment, PaymentMethod, PaymentStatus
from inventory.models import Warehouse
from fulfillment.models import Shipment, Return, ReturnStatus

from fulfillment.services import dispatch_order, mark_delivered

User = get_user_model()


class FulfillmentViewTests(APITestCase):
    def setUp(self):
        # Create RBAC groups
        self.shipping_group, _ = Group.objects.get_or_create(name="ShippingExecutive")
        self.support_group, _ = Group.objects.get_or_create(name="SupportAgent")

        # Customer User
        self.customer_user = User.objects.create_user(
            username="fulfillbuyer", email="fbuyer@test.com", password="password123", role="customer"
        )
        self.customer = Customer.objects.create(user=self.customer_user)

        # Shipping Executive User
        self.shipping_user = User.objects.create_user(
            username="shipuser", email="ship@test.com", password="password123", role="employee"
        )
        self.shipping_user.groups.add(self.shipping_group)

        # Support Agent User
        self.support_user = User.objects.create_user(
            username="supportuser", email="support@test.com", password="password123", role="employee"
        )
        self.support_user.groups.add(self.support_group)

        # Warehouse
        self.warehouse = Warehouse.objects.create(
            name="Main Depot",
            location="Industrial Area",
        )
        from users.models import Employee, Designation
        Employee.objects.create(
            user=self.shipping_user,
            employee_code="SHIP-1",
            designation=Designation.SHIPPING_EXECUTIVE,
            hire_date="2026-01-01",
            warehouse=self.warehouse,
        )

        # Order and Address
        self.address = Address.objects.create(
            customer=self.customer,
            name="Dispatch Address",
            street="300 Dispatch Rd",
            city="Metropolis",
            state="State",
            zipcode="55555",
            country="Country",
            address_type=AddressType.SHIPPING,
        )
        self.order = Order.objects.create(
            customer=self.customer,
            address=self.address,
            total_amount=Decimal("120.00"),
            status=OrderStatus.CONFIRMED,
        )
        self.payment = Payment.objects.create(
            order=self.order,
            payment_method=PaymentMethod.UPI,
            amount=Decimal("120.00"),
            payment_status=PaymentStatus.PAID,
        )


    def test_shipping_executive_can_dispatch_order(self):
        self.client.force_authenticate(user=self.shipping_user)
        response = self.client.post(
            reverse("fulfillment:dispatch"),
            {
                "order_id": self.order.pk,
                "warehouse_id": self.warehouse.pk,
                "tracking_number": "TRK-001",
                "carrier": "BlueDart",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.SHIPPED)

    def test_customer_cannot_dispatch_order(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.post(
            reverse("fulfillment:dispatch"),
            {
                "order_id": self.order.pk,
                "warehouse_id": self.warehouse.pk,
                "tracking_number": "TRK-002",
                "carrier": "BlueDart",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_can_request_return_for_delivered_order(self):
        # Dispatch & deliver order
        shipment = dispatch_order(
            order=self.order,
            warehouse_id=self.warehouse.pk,
            tracking_number="TRK-DELIV",
            carrier="BlueDart",
        )
        mark_delivered(shipment=shipment)

        self.client.force_authenticate(user=self.customer_user)
        response = self.client.post(
            reverse("fulfillment:return-create"),
            {
                "order_id": self.order.pk,
                "reason": "Not fitting properly",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Return.objects.filter(order=self.order).count(), 1)

    def test_support_agent_can_approve_return(self):
        shipment = dispatch_order(
            order=self.order,
            warehouse_id=self.warehouse.pk,
            tracking_number="TRK-APP",
            carrier="BlueDart",
        )
        mark_delivered(shipment=shipment)

        return_obj = Return.objects.create(
            order=self.order,
            reason="Color mismatched",
            status=ReturnStatus.RECEIVED,
        )

        self.client.force_authenticate(user=self.support_user)
        response = self.client.post(
            reverse("fulfillment:return-approve", kwargs={"pk": return_obj.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return_obj.refresh_from_db()
        self.assertEqual(return_obj.status, ReturnStatus.APPROVED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.RETURNED)
