from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from users.models import Customer
from products.models import Category, Product
from wishlist.models import Wishlist, WishlistItem

User = get_user_model()


class WishlistModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="wishuser", email="wish@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.category = Category.objects.create(name="WishCat", slug="wish-cat")
        self.product = Product.objects.create(
            name="WishProduct",
            slug="wish-product",
            category=self.category,
            base_price=Decimal("45.00"),
        )

    def test_wishlist_and_item_str(self):
        wishlist = Wishlist.objects.create(customer=self.customer)
        self.assertIn("Wishlist of", str(wishlist))

        item = WishlistItem.objects.create(wishlist=wishlist, product=self.product)
        self.assertIn("WishProduct in Wishlist", str(item))
