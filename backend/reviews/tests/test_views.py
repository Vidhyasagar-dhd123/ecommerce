from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from users.models import Customer, Address, AddressType
from products.models import Category, Product, ProductVariant
from orders.models import Order, OrderItem, OrderStatus
from reviews.models import Review

User = get_user_model()


class ReviewViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reviewerviewer", email="revview@test.com", password="password123", role="customer"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.address = Address.objects.create(
            customer=self.customer,
            name="Rev View Address",
            street="123 Rev View Rd",
            city="Metropolis",
            state="State",
            zipcode="12345",
            country="Country",
            address_type=AddressType.SHIPPING,
        )
        self.category = Category.objects.create(name="RevViewCat", slug="revview-cat")
        self.product = Product.objects.create(
            name="ViewProd",
            slug="view-prod",
            category=self.category,
            base_price=Decimal("70.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="VIEW-PROD-1",
            price=Decimal("70.00"),
            stock=10,
        )

    def test_anonymous_can_list_reviews(self):
        Review.objects.create(
            product=self.product,
            customer=self.customer,
            rating=5,
            comment="Awesome!",
        )
        response = self.client.get(
            reverse("reviews:product-reviews", kwargs={"product_id": self.product.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data") if "data" in response.data else response.data
        results = data.get("results", data) if isinstance(data, dict) else data
        self.assertEqual(len(results), 1)

    def test_authenticated_customer_with_delivered_order_can_submit_review(self):
        order = Order.objects.create(
            customer=self.customer,
            address=self.address,
            total_amount=Decimal("70.00"),
            status=OrderStatus.DELIVERED,
        )
        OrderItem.objects.create(
            order=order,
            variant=self.variant,
            quantity=1,
            unit_price=Decimal("70.00"),
            total_price=Decimal("70.00"),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("reviews:submit-review", kwargs={"product_id": self.product.pk}),
            {"rating": 5, "comment": "Loved it!"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.filter(product=self.product).count(), 1)

    def test_customer_without_purchase_gets_403(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("reviews:submit-review", kwargs={"product_id": self.product.pk}),
            {"rating": 4, "comment": "Trying to review without buy"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
