from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from core.exceptions import NotPurchasedError, AlreadyReviewedError, InvalidRatingError
from users.models import Customer, Address, AddressType
from products.models import Category, Product, ProductVariant
from orders.models import Order, OrderItem, OrderStatus
from reviews.models import Review
from reviews.services import submit_review

User = get_user_model()


class ReviewServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="revserviceuser", email="revserv@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.address = Address.objects.create(
            customer=self.customer,
            name="Rev Address",
            street="123 Rev St",
            city="Metropolis",
            state="State",
            zipcode="12345",
            country="Country",
            address_type=AddressType.SHIPPING,
        )
        self.category = Category.objects.create(name="ReviewServCat", slug="revserv-cat")
        self.product = Product.objects.create(
            name="ServProduct",
            slug="serv-product",
            category=self.category,
            base_price=Decimal("95.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="SERV-PROD-1",
            price=Decimal("95.00"),
            stock=10,
        )

    def test_submit_review_without_delivered_order_raises_error(self):
        with self.assertRaises(NotPurchasedError):
            submit_review(
                customer=self.customer,
                product_id=self.product.pk,
                rating=5,
                comment="Great!",
            )

    def test_submit_review_success_and_duplicate_raises_error(self):
        # Create delivered order with product variant
        order = Order.objects.create(
            customer=self.customer,
            address=self.address,
            total_amount=Decimal("95.00"),
            status=OrderStatus.DELIVERED,
        )
        OrderItem.objects.create(
            order=order,
            variant=self.variant,
            quantity=1,
            unit_price=Decimal("95.00"),
            total_price=Decimal("95.00"),
        )

        # 1. First review succeeds
        review = submit_review(
            customer=self.customer,
            product_id=self.product.pk,
            rating=4,
            comment="Very solid quality.",
        )
        self.assertEqual(review.rating, 4)
        self.assertEqual(Review.objects.filter(product=self.product).count(), 1)

        # 2. Second review on same product raises error
        with self.assertRaises(AlreadyReviewedError):
            submit_review(
                customer=self.customer,
                product_id=self.product.pk,
                rating=5,
            )

    def test_invalid_rating_raises_error(self):
        with self.assertRaises(InvalidRatingError):
            submit_review(
                customer=self.customer,
                product_id=self.product.pk,
                rating=10,
            )
