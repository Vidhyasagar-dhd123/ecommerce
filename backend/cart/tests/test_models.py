from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from users.models import Customer
from products.models import Category, Product, ProductVariant
from cart.models import Cart, CartItem

User = get_user_model()


class CartModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testbuyer", email="buyer@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.category = Category.objects.create(name="Electronics", slug="electronics")
        self.product = Product.objects.create(
            name="Smartphone",
            slug="smartphone",
            category=self.category,
            base_price=Decimal("499.99"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="PHONE-128GB",
            price=Decimal("499.99"),
            stock=10,
        )

    def test_cart_str_and_total_calculation(self):
        cart = Cart.objects.create(customer=self.customer, is_active=True)
        self.assertIn(f"Cart #{cart.pk}", str(cart))
        self.assertEqual(cart.total, Decimal("0.00"))

        item1 = CartItem.objects.create(
            cart=cart,
            variant=self.variant,
            quantity=2,
            price=Decimal("499.99"),
        )
        self.assertEqual(item1.subtotal, Decimal("999.98"))
        self.assertEqual(cart.total, Decimal("999.98"))
        self.assertIn("PHONE-128GB x2", str(item1))
