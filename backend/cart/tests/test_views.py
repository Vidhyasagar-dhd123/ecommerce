from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from users.models import Customer
from products.models import Category, Product, ProductVariant
from cart.models import Cart, CartItem
from cart.services import add_item_to_cart

User = get_user_model()


class CartViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="buyer1", email="buyer1@test.com", password="password123", role="customer"
        )
        self.customer = Customer.objects.create(user=self.user)

        self.other_user = User.objects.create_user(
            username="buyer2", email="buyer2@test.com", password="password123", role="customer"
        )
        self.other_customer = Customer.objects.create(user=self.other_user)

        self.category = Category.objects.create(name="Electronics", slug="electronics")
        self.product = Product.objects.create(
            name="Headphones",
            slug="headphones",
            category=self.category,
            base_price=Decimal("150.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="HP-BLACK",
            price=Decimal("150.00"),
            stock=10,
        )

    def test_get_cart_authenticated(self):
        self.client.force_authenticate(user=self.user)
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=2)

        response = self.client.get(reverse("cart:detail"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Note: StandardJsonRenderer wraps output in { "success": True, "data": ... }
        data = response.data.get("data") if "data" in response.data else response.data
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(Decimal(str(data["total"])), Decimal("300.00"))

    def test_add_item_to_cart_api(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("cart:item-create"),
            {"variant_id": self.variant.pk, "quantity": 3},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cart = Cart.objects.get(customer=self.customer, is_active=True)
        self.assertEqual(cart.items.count(), 1)
        self.assertEqual(cart.items.first().quantity, 3)

    def test_update_cart_item_api(self):
        self.client.force_authenticate(user=self.user)
        item = add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=2)

        response = self.client.patch(
            reverse("cart:item-detail", kwargs={"pk": item.pk}),
            {"quantity": 5},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 5)

    def test_cannot_access_other_customer_cart_item(self):
        item = add_item_to_cart(customer=self.other_customer, variant_id=self.variant.pk, quantity=2)
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("cart:item-detail", kwargs={"pk": item.pk}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_clear_cart_api(self):
        self.client.force_authenticate(user=self.user)
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=2)

        response = self.client.post(reverse("cart:clear"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cart = Cart.objects.get(customer=self.customer, is_active=True)
        self.assertEqual(cart.items.count(), 0)
