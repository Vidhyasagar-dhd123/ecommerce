from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from users.models import Customer, Address, AddressType
from orders.models import Order, OrderStatus, Payment, PaymentMethod
from inventory.models import Warehouse
from fulfillment.models import Shipment, Return, ReturnStatus, Exchange, Refund


User = get_user_model()


class FulfillmentModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="fulfilluser", email="fulfill@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.address = Address.objects.create(
            customer=self.customer,
            name="Delivery Spot",
            street="100 Shipping Ln",
            city="Metropolis",
            state="State",
            zipcode="55555",
            country="Country",
            address_type=AddressType.SHIPPING,
        )
        self.order = Order.objects.create(
            customer=self.customer,
            address=self.address,
            total_amount=Decimal("150.00"),
            status=OrderStatus.CONFIRMED,
        )
        self.warehouse = Warehouse.objects.create(
            name="Main Warehouse",
            location="Zone 1",
            contact_number="555-0100",
        )

    def test_warehouse_and_shipment_str(self):
        self.assertEqual(str(self.warehouse), "Main Warehouse")

        shipment = Shipment.objects.create(
            order=self.order,
            warehouse=self.warehouse,
            tracking_number="TRACK-123",
            carrier="FedEx",
        )
        self.assertIn("TRACK-123", str(shipment))

    def test_return_and_refund_str(self):
        return_obj = Return.objects.create(
            order=self.order,
            reason="Damaged item",
            status=ReturnStatus.RECEIVED,
        )
        self.assertIn("received", str(return_obj))

        payment = Payment.objects.create(
            order=self.order,
            payment_method=PaymentMethod.UPI,
            amount=Decimal("150.00"),
        )
        refund = Refund.objects.create(
            payment=payment,
            amount=Decimal("150.00"),
            reason="Item return approved",
        )
        self.assertIn("150.00", str(refund))
