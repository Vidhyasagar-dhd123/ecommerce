from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from core.exceptions import ProductOutOfStockError, InsufficientStockError, CartEmptyError
from users.models import Customer
from products.models import Category, Product, ProductVariant
from cart.models import Cart, CartItem
from cart.services import (
    get_or_create_active_cart,
    add_item_to_cart,
    update_cart_item,
    remove_cart_item,
    clear_cart,
)

User = get_user_model()


class CartServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testbuyer", email="buyer@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.category = Category.objects.create(name="Electronics", slug="electronics")
        self.product = Product.objects.create(
            name="Laptop",
            slug="laptop",
            category=self.category,
            base_price=Decimal("999.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="LAPTOP-16GB",
            price=Decimal("999.00"),
            stock=5,
        )
        self.out_of_stock_variant = ProductVariant.objects.create(
            product=self.product,
            sku="LAPTOP-32GB",
            price=Decimal("1299.00"),
            stock=0,
        )

    def test_get_or_create_active_cart(self):
        cart1 = get_or_create_active_cart(customer=self.customer)
        cart2 = get_or_create_active_cart(customer=self.customer)
        self.assertEqual(cart1.pk, cart2.pk)
        self.assertTrue(cart1.is_active)

    def test_add_item_to_cart_success_and_increment(self):
        item = add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=2)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.price, Decimal("999.00"))

        # Adding again increments quantity
        item_updated = add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=1)
        self.assertEqual(item_updated.quantity, 3)

    def test_add_item_out_of_stock_raises_error(self):
        with self.assertRaises(ProductOutOfStockError):
            add_item_to_cart(customer=self.customer, variant_id=self.out_of_stock_variant.pk, quantity=1)

    def test_add_item_insufficient_stock_raises_error(self):
        with self.assertRaises(InsufficientStockError):
            add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=10)

    def test_update_cart_item_and_remove_on_zero(self):
        item = add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=2)
        updated = update_cart_item(customer=self.customer, cart_item_id=item.pk, quantity=4)
        self.assertEqual(updated.quantity, 4)

        # Update to 0 removes the item
        result = update_cart_item(customer=self.customer, cart_item_id=item.pk, quantity=0)
        self.assertIsNone(result)
        self.assertFalse(CartItem.objects.filter(pk=item.pk).exists())

    def test_clear_cart(self):
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=2)
        cart = get_or_create_active_cart(customer=self.customer)
        self.assertEqual(cart.items.count(), 1)

        clear_cart(customer=self.customer)
        self.assertEqual(cart.items.count(), 0)
