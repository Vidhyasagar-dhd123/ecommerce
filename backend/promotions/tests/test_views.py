from datetime import date, timedelta
from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APITestCase
from rest_framework import status

from users.models import Customer
from products.models import Category, Product, ProductVariant
from cart.services import add_item_to_cart
from promotions.models import DiscountType, CouponDiscountType, Offer, Coupon

User = get_user_model()


class PromotionViewTests(APITestCase):
    def setUp(self):
        self.today = date.today()
        self.admin_group, _ = Group.objects.get_or_create(name="Admin")

        # Admin user
        self.admin_user = User.objects.create_user(
            username="promoadmin", email="promoadmin@test.com", password="password123", role="admin", is_staff=True
        )
        self.admin_user.groups.add(self.admin_group)

        # Customer user
        self.customer_user = User.objects.create_user(
            username="promocustomer", email="promocustomer@test.com", password="password123", role="customer"
        )
        self.customer = Customer.objects.create(user=self.customer_user)

        self.category = Category.objects.create(name="PromoViewCat", slug="promoview-cat")
        self.product = Product.objects.create(
            name="PromoViewProduct",
            slug="promoview-product",
            category=self.category,
            base_price=Decimal("120.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="VIEW-VAR-1",
            price=Decimal("120.00"),
            stock=10,
        )

    def test_anonymous_can_list_offers(self):
        Offer.objects.create(
            title="Public Deal",
            discount_type=DiscountType.PERCENT,
            discount_value=Decimal("15.00"),
            start_date=self.today,
            end_date=self.today + timedelta(days=5),
            status=True,
        )
        response = self.client.get(reverse("promotions:offer-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data") if "data" in response.data else response.data
        results = data.get("results", data) if isinstance(data, dict) else data
        self.assertEqual(len(results), 1)

    def test_admin_can_create_offer(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "title": "New Year Discount",
            "discount_type": "percent",
            "discount_value": "20.00",
            "start_date": str(self.today),
            "end_date": str(self.today + timedelta(days=10)),
        }
        response = self.client.post(reverse("promotions:offer-create"), payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Offer.objects.filter(title="New Year Discount").count(), 1)

    def test_customer_cannot_create_offer(self):
        self.client.force_authenticate(user=self.customer_user)
        payload = {
            "title": "Unauthorized Offer",
            "discount_type": "percent",
            "discount_value": "20.00",
            "start_date": str(self.today),
            "end_date": str(self.today + timedelta(days=10)),
        }
        response = self.client.post(reverse("promotions:offer-create"), payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_coupon_validate_view(self):
        Coupon.objects.create(
            code="SAVE10NOW",
            discount_type=CouponDiscountType.FIXED,
            discount_value=Decimal("10.00"),
            min_order_amount=Decimal("50.00"),
            start_date=self.today - timedelta(days=1),
            end_date=self.today + timedelta(days=5),
            status=True,
        )

        self.client.force_authenticate(user=self.customer_user)
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=1)

        response = self.client.post(
            reverse("promotions:coupon-validate"),
            {"code": "SAVE10NOW"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
