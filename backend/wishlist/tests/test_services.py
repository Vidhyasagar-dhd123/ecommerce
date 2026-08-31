from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from users.models import Customer
from products.models import Category, Product
from wishlist.models import Wishlist, WishlistItem
from wishlist.services import (
    get_or_create_wishlist,
    add_to_wishlist,
    remove_from_wishlist,
    clear_wishlist,
)

User = get_user_model()


class WishlistServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="wishservuser", email="wishserv@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.category = Category.objects.create(name="WishServCat", slug="wishserv-cat")
        self.product1 = Product.objects.create(
            name="WishServProd1",
            slug="wishserv-prod-1",
            category=self.category,
            base_price=Decimal("50.00"),
        )
        self.product2 = Product.objects.create(
            name="WishServProd2",
            slug="wishserv-prod-2",
            category=self.category,
            base_price=Decimal("75.00"),
        )

    def test_get_or_create_and_add_to_wishlist(self):
        wishlist = get_or_create_wishlist(customer=self.customer)
        self.assertEqual(wishlist.items.count(), 0)

        item = add_to_wishlist(customer=self.customer, product_id=self.product1.pk)
        self.assertEqual(item.product, self.product1)
        self.assertEqual(wishlist.items.count(), 1)

        # Adding same product again is idempotent
        item2 = add_to_wishlist(customer=self.customer, product_id=self.product1.pk)
        self.assertEqual(item.pk, item2.pk)
        self.assertEqual(wishlist.items.count(), 1)

    def test_remove_from_wishlist(self):
        add_to_wishlist(customer=self.customer, product_id=self.product1.pk)
        add_to_wishlist(customer=self.customer, product_id=self.product2.pk)

        removed = remove_from_wishlist(customer=self.customer, product_id=self.product1.pk)
        self.assertTrue(removed)

        wishlist = get_or_create_wishlist(customer=self.customer)
        self.assertEqual(wishlist.items.count(), 1)
        self.assertEqual(wishlist.items.first().product, self.product2)

    def test_clear_wishlist(self):
        add_to_wishlist(customer=self.customer, product_id=self.product1.pk)
        add_to_wishlist(customer=self.customer, product_id=self.product2.pk)

        count = clear_wishlist(customer=self.customer)
        self.assertEqual(count, 2)
        wishlist = get_or_create_wishlist(customer=self.customer)
        self.assertEqual(wishlist.items.count(), 0)
