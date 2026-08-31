from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from users.models import Customer
from products.models import Category, Product
from reviews.models import Review

User = get_user_model()


class ReviewModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reviewer1", email="rev1@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.category = Category.objects.create(name="ReviewCat", slug="review-cat")
        self.product = Product.objects.create(
            name="ReviewProduct",
            slug="review-product",
            category=self.category,
            base_price=Decimal("80.00"),
        )

    def test_review_str_and_creation(self):
        review = Review.objects.create(
            product=self.product,
            customer=self.customer,
            rating=5,
            comment="Amazing product, highly recommend!",
        )
        self.assertIn("5★", str(review))
        self.assertIn("ReviewProduct", str(review))
