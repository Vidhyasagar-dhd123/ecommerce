from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from core.exceptions import (
    DomainError,
    ShipmentAlreadyExistsError,
    InvalidStatusTransitionError,
)
from users.models import Customer, Address, AddressType
from orders.models import Order, OrderStatus, Payment, PaymentMethod, PaymentStatus
from inventory.models import Warehouse
from fulfillment.models import ReturnStatus, RefundStatus

from fulfillment.services import (
    dispatch_order,
    mark_delivered,
    request_return,
    approve_return,
    reject_return,
    process_refund,
)

User = get_user_model()


class FulfillmentServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="fulfillserviceuser", email="fulfillservice@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.address = Address.objects.create(
            customer=self.customer,
            name="Warehouse Hub",
            street="200 Warehouse Way",
            city="Metropolis",
            state="State",
            zipcode="55555",
            country="Country",
            address_type=AddressType.SHIPPING,
        )
        self.order = Order.objects.create(
            customer=self.customer,
            address=self.address,
            total_amount=Decimal("250.00"),
            status=OrderStatus.CONFIRMED,
        )
        self.payment = Payment.objects.create(
            order=self.order,
            payment_method=PaymentMethod.UPI,
            amount=Decimal("250.00"),
            payment_status=PaymentStatus.PAID,
        )
        self.admin_user = User.objects.create_user(
            username="fulfilladmin", email="fadmin@test.com", password="password123", role="admin"
        )
        self.warehouse = Warehouse.objects.create(
            name="Hub 1",
            location="City Center",
        )

    def test_dispatch_order_and_mark_delivered(self):
        shipment = dispatch_order(
            order=self.order,
            warehouse_id=self.warehouse.pk,
            tracking_number="DHL-999",
            carrier="DHL",
            dispatched_by=self.admin_user,
        )

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.SHIPPED)
        self.assertEqual(shipment.tracking_number, "DHL-999")

        # Re-dispatching raises error
        with self.assertRaises(ShipmentAlreadyExistsError):
            dispatch_order(
                order=self.order,
                warehouse_id=self.warehouse.pk,
                tracking_number="DHL-999",
                carrier="DHL",
            )

        # Mark delivered
        mark_delivered(shipment=shipment, updated_by=self.user)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.DELIVERED)

    def test_return_and_refund_lifecycle(self):
        # Dispatch and deliver order first
        shipment = dispatch_order(
            order=self.order,
            warehouse_id=self.warehouse.pk,
            tracking_number="DHL-888",
            carrier="DHL",
        )
        mark_delivered(shipment=shipment)

        # 1. Customer requests return
        return_obj = request_return(
            order=self.order,
            reason="Item defective",
            customer=self.user,
        )
        self.assertEqual(return_obj.status, ReturnStatus.RECEIVED)

        # 2. Support agent approves return
        approve_return(return_obj=return_obj, approved_by=self.user)
        return_obj.refresh_from_db()
        self.assertEqual(return_obj.status, ReturnStatus.APPROVED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.RETURNED)

        # 3. Support agent processes refund
        refund = process_refund(
            return_obj=return_obj,
            amount=Decimal("250.00"),
            reason="Approved refund",
            processed_by=self.user,
        )
        self.assertEqual(refund.status, RefundStatus.PROCESSED)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_status, PaymentStatus.REFUNDED)
