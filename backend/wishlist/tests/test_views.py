from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from users.models import Customer
from products.models import Category, Product
from wishlist.models import Wishlist, WishlistItem
from wishlist.services import add_to_wishlist

User = get_user_model()


class WishlistViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="wishviewuser", email="wishview@test.com", password="password123", role="customer"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.category = Category.objects.create(name="WishViewCat", slug="wishview-cat")
        self.product = Product.objects.create(
            name="WishViewProduct",
            slug="wishview-prod",
            category=self.category,
            base_price=Decimal("60.00"),
        )

    def test_authenticated_customer_can_retrieve_wishlist(self):
        self.client.force_authenticate(user=self.user)
        add_to_wishlist(customer=self.customer, product_id=self.product.pk)

        response = self.client.get(reverse("wishlist:detail"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data") if "data" in response.data else response.data
        self.assertEqual(data["total_items"], 1)

    def test_authenticated_customer_can_add_item_to_wishlist(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("wishlist:add"),
            {"product_id": self.product.pk},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WishlistItem.objects.filter(product=self.product).count(), 1)

    def test_authenticated_customer_can_remove_item_from_wishlist(self):
        self.client.force_authenticate(user=self.user)
        add_to_wishlist(customer=self.customer, product_id=self.product.pk)

        response = self.client.delete(
            reverse("wishlist:remove", kwargs={"product_id": self.product.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(WishlistItem.objects.filter(product=self.product).count(), 0)

    def test_unauthenticated_cannot_access_wishlist(self):
        response = self.client.get(reverse("wishlist:detail"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
