from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from users.models import Customer, Address, AddressType
from products.models import Category, Product, ProductVariant
from orders.models import Order, OrderItem, Payment, Invoice, OrderStatus, PaymentMethod

User = get_user_model()


class OrderModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ordertester", email="order@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.address = Address.objects.create(
            customer=self.customer,
            name="Home Address",
            street="123 Tech Blvd",
            city="Metropolis",
            state="State",
            zipcode="12345",
            country="Country",
            address_type=AddressType.SHIPPING,
        )
        self.category = Category.objects.create(name="Gadgets", slug="gadgets")
        self.product = Product.objects.create(
            name="Smartwatch",
            slug="smartwatch",
            category=self.category,
            base_price=Decimal("199.99"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="WATCH-BLK",
            price=Decimal("199.99"),
            stock=10,
        )

    def test_order_creation_and_can_cancel(self):
        order = Order.objects.create(
            customer=self.customer,
            address=self.address,
            total_amount=Decimal("285.99"),
            status=OrderStatus.PENDING,
        )
        self.assertTrue(order.can_cancel())
        self.assertIn(f"Order #{order.pk}", str(order))

        order.status = OrderStatus.CONFIRMED
        self.assertTrue(order.can_cancel())

        order.status = OrderStatus.SHIPPED
        self.assertFalse(order.can_cancel())

    def test_order_item_total_price_calculation(self):
        order = Order.objects.create(
            customer=self.customer,
            address=self.address,
            total_amount=Decimal("399.98"),
        )
        item = OrderItem.objects.create(
            order=order,
            variant=self.variant,
            quantity=2,
            unit_price=Decimal("199.99"),
            discount=Decimal("10.00"),
            total_price=Decimal("0.00"),
        )
        self.assertEqual(item.total_price, Decimal("389.98"))

    def test_payment_and_invoice_models(self):
        order = Order.objects.create(
            customer=self.customer,
            address=self.address,
            total_amount=Decimal("200.00"),
        )
        payment = Payment.objects.create(
            order=order,
            payment_method=PaymentMethod.UPI,
            amount=Decimal("200.00"),
        )
        self.assertIn("Payment for Order", str(payment))

        invoice = Invoice.objects.create(
            order=order,
            invoice_number="INV-TEST12345",
            sub_total=Decimal("150.00"),
            discount=Decimal("0.00"),
            tax_amount=Decimal("27.00"),
            shipping_charge=Decimal("50.00"),
            grand_total=Decimal("227.00"),
        )
        self.assertIn("INV-TEST12345", str(invoice))
