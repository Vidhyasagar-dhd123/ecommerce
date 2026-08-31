from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from core.exceptions import CartEmptyError, InsufficientStockError, OrderCancellationError
from users.models import Customer, Address, AddressType
from products.models import Category, Product, ProductVariant
from cart.models import Cart
from cart.services import add_item_to_cart
from orders.models import Order, OrderStatus, PaymentStatus
from orders.services import create_order_from_cart, confirm_order, cancel_order
from fulfillment.services import dispatch_order
from inventory.models import Inventory, Warehouse, StockTransactionType

User = get_user_model()


class OrderServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="orderserviceuser", email="orderservice@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.address = Address.objects.create(
            customer=self.customer,
            name="Shipping Address",
            street="456 Market St",
            city="Metropolis",
            state="State",
            zipcode="54321",
            country="Country",
            address_type=AddressType.SHIPPING,
        )
        self.category = Category.objects.create(name="Books", slug="books")
        self.product = Product.objects.create(
            name="Django Guide",
            slug="django-guide",
            category=self.category,
            base_price=Decimal("50.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="BOOK-DJANGO",
            price=Decimal("50.00"),
            stock=10,
        )

    def test_create_order_from_empty_cart_raises_error(self):
        with self.assertRaises(CartEmptyError):
            create_order_from_cart(
                customer=self.customer,
                address_id=self.address.pk,
                payment_method="cod",
            )

    def test_create_order_success_and_stock_decrement(self):
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=3)

        order = create_order_from_cart(
            customer=self.customer,
            address_id=self.address.pk,
            payment_method="cod",
        )

        self.assertIsNotNone(order.pk)
        self.assertEqual(order.status, OrderStatus.PENDING)
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.items.first().quantity, 3)
        self.assertEqual(order.items.first().unit_price, Decimal("50.00"))

        # Check stock was decremented
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 7)

        # Check payment and invoice were created
        self.assertIsNotNone(order.payment)
        self.assertIsNotNone(order.invoice)

        # Check cart was deactivated
        cart = Cart.objects.get(customer=self.customer)
        self.assertFalse(cart.is_active)

    def test_cancel_order_restores_stock(self):
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=4)
        order = create_order_from_cart(
            customer=self.customer,
            address_id=self.address.pk,
            payment_method="cod",
        )

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 6)

        cancel_order(order=order, cancelled_by=self.user)
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatus.CANCELLED)

        # Check stock was restored
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 10)

    def test_order_applies_product_offer_discount(self):
        from django.utils import timezone
        from promotions.models import Offer, DiscountType, HasActiveOffer

        today = timezone.now().date()
        offer = Offer.objects.create(
            title="10% Off Books",
            discount_type=DiscountType.PERCENT,
            discount_value=Decimal("10.00"),
            start_date=today,
            end_date=today,
            status=True,
        )
        HasActiveOffer.objects.create(
            offer=offer,
            product=self.product,
            start_date=today,
            end_date=today,
        )

        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=2)
        # Base price 50 * 2 = 100. 10% offer discount = 10. Net subtotal = 90.
        # Shipping = 50. Tax = 90 * 0.18 = 16.20. Grand total = 90 + 50 + 16.20 = 156.20.
        order = create_order_from_cart(
            customer=self.customer,
            address_id=self.address.pk,
            payment_method="cod",
        )

        item = order.items.first()
        self.assertEqual(item.unit_price, Decimal("50.00"))
        self.assertEqual(item.discount, Decimal("10.00"))
        self.assertEqual(item.total_price, Decimal("90.00"))
        self.assertEqual(order.invoice.discount, Decimal("10.00"))
        self.assertEqual(order.total_amount, Decimal("156.20"))

    def test_order_applies_both_product_offer_and_coupon_discount(self):
        from django.utils import timezone
        from promotions.models import Offer, DiscountType, HasActiveOffer, Coupon, CouponDiscountType

        today = timezone.now().date()
        offer = Offer.objects.create(
            title="10% Off Books",
            discount_type=DiscountType.PERCENT,
            discount_value=Decimal("10.00"),
            start_date=today,
            end_date=today,
            status=True,
        )
        HasActiveOffer.objects.create(
            offer=offer,
            product=self.product,
            start_date=today,
            end_date=today,
        )

        coupon = Coupon.objects.create(
            code="SAVE10FLAT",
            discount_type=CouponDiscountType.FIXED,
            discount_value=Decimal("10.00"),
            min_order_amount=Decimal("50.00"),
            start_date=today,
            end_date=today,
            status=True,
        )

        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=2)
        # Base: 100. Product offer: 10. Subtotal after offer: 90.
        # Coupon: 10. Total discount: 20. Taxable: 80. Tax: 14.40. Shipping: 50. Grand total = 144.40.
        order = create_order_from_cart(
            customer=self.customer,
            address_id=self.address.pk,
            payment_method="cod",
            coupon_code="SAVE10FLAT",
        )

        item = order.items.first()
        self.assertEqual(item.discount, Decimal("20.00"))
        self.assertEqual(item.total_price, Decimal("80.00"))
        self.assertEqual(order.invoice.discount, Decimal("20.00"))
        self.assertEqual(order.total_amount, Decimal("144.40"))

    def test_warehouse_order_locking_and_isolation(self):
        from users.models import Employee, Designation
        from inventory.models import Warehouse
        from orders.services import lock_order, unlock_order
        from core.exceptions import OrderAlreadyLockedError, OrderLockedByOtherWarehouseError

        wh1 = Warehouse.objects.create(name="WH Alpha", location="Alpha")
        wh2 = Warehouse.objects.create(name="WH Beta", location="Beta")

        user_wh1 = User.objects.create_user(username="agent_wh1", email="agent1@test.com", password="pass", role="employee")
        Employee.objects.create(user=user_wh1, employee_code="E-1", designation=Designation.SUPPORT_AGENT, hire_date="2026-01-01", warehouse=wh1)

        user_wh2 = User.objects.create_user(username="agent_wh2", email="agent2@test.com", password="pass", role="employee")
        Employee.objects.create(user=user_wh2, employee_code="E-2", designation=Designation.SUPPORT_AGENT, hire_date="2026-01-01", warehouse=wh2)

        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=1)
        order = create_order_from_cart(customer=self.customer, address_id=self.address.pk, payment_method="cod")

        # Lock by WH1
        locked_order = lock_order(order=order, employee=user_wh1)
        self.assertTrue(locked_order.is_locked)
        self.assertEqual(locked_order.locked_by_warehouse, wh1)

        # WH2 employee attempts to lock -> raises OrderAlreadyLockedError
        with self.assertRaises(OrderAlreadyLockedError):
            lock_order(order=order, employee=user_wh2)

        # WH2 employee attempts to unlock -> raises OrderLockedByOtherWarehouseError
        with self.assertRaises(OrderLockedByOtherWarehouseError):
            unlock_order(order=order, employee=user_wh2)

        # WH1 employee unlocks successfully
        unlocked_order = unlock_order(order=order, employee=user_wh1)
        self.assertFalse(unlocked_order.is_locked)

        # Now WH2 employee can lock
        relocked = lock_order(order=order, employee=user_wh2)
        self.assertTrue(relocked.is_locked)
        self.assertEqual(relocked.locked_by_warehouse, wh2)


    def test_confirm_order(self):
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=1)
        order = create_order_from_cart(
            customer=self.customer,
            address_id=self.address.pk,
            payment_method="cod",
        )
        confirmed = confirm_order(order=order, confirmed_by=self.user)
        self.assertEqual(confirmed.status, OrderStatus.CONFIRMED)

    def test_inventory_backed_order_is_used_by_fulfillment(self):
        warehouse = Warehouse.objects.create(name="Main", location="Austin")
        inventory = Inventory.objects.create(
            warehouse=warehouse,
            variant=self.variant,
            stock=10,
        )
        inventory.update_available_stock()
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=3)

        order = create_order_from_cart(
            customer=self.customer,
            address_id=self.address.pk,
            payment_method="cod",
        )
        item = order.items.get()
        self.assertEqual(item.inventory_id, inventory.pk)
        inventory.refresh_from_db()
        self.assertEqual(inventory.reserved_stock, 3)
        self.assertEqual(inventory.available_stock, 7)

        confirm_order(order=order, confirmed_by=self.user)
        admin_employee = User.objects.create_user(
            username="dispatch_admin",
            email="dispatch_admin@test.com",
            password="pass",
            role="admin",
        )
        shipment = dispatch_order(
            order=order,
            warehouse_id=warehouse.pk,
            tracking_number="TRACK-1",
            carrier="Test Carrier",
            dispatched_by=admin_employee,
        )


        self.assertEqual(shipment.warehouse_id, warehouse.pk)
        inventory.refresh_from_db()
        self.assertEqual(inventory.stock, 7)
        self.assertEqual(inventory.reserved_stock, 0)
        self.assertTrue(
            inventory.transactions.filter(type=StockTransactionType.SHIP).exists()
        )
