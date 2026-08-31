from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from core.exceptions import (
    OverlappingOfferError,
    InvalidCouponError,
    CouponExpiredError,
    CouponUsageLimitReachedError,
    CouponMinOrderAmountError,
)
from users.models import Customer
from products.models import Category, Product, ProductVariant
from cart.services import add_item_to_cart, get_or_create_active_cart
from promotions.models import DiscountType, CouponDiscountType, Coupon
from promotions.services import (
    create_offer,
    apply_offer_to_product,
    validate_coupon,
    redeem_coupon,
)

User = get_user_model()


class PromotionServiceTests(TestCase):
    def setUp(self):
        self.today = date.today()
        self.user = User.objects.create_user(
            username="promotester", email="promotester@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)
        self.category = Category.objects.create(name="PromoServCat", slug="promoserv-cat")
        self.product = Product.objects.create(
            name="PromoServProduct",
            slug="promoserv-product",
            category=self.category,
            base_price=Decimal("100.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="PROMO-VAR-1",
            price=Decimal("100.00"),
            stock=10,
        )

    def test_apply_offer_overlapping_raises_error(self):
        offer1 = create_offer(
            title="Deal 1",
            discount_type=DiscountType.PERCENT,
            discount_value=Decimal("10.00"),
            start_date=self.today,
            end_date=self.today + timedelta(days=10),
        )
        apply_offer_to_product(offer_id=offer1.pk, product_id=self.product.pk)

        offer2 = create_offer(
            title="Deal 2",
            discount_type=DiscountType.FIXED,
            discount_value=Decimal("5.00"),
            start_date=self.today + timedelta(days=2),
            end_date=self.today + timedelta(days=15),
        )

        with self.assertRaises(OverlappingOfferError):
            apply_offer_to_product(offer_id=offer2.pk, product_id=self.product.pk)

    def test_validate_coupon_success_and_failures(self):
        coupon = Coupon.objects.create(
            code="WELCOME10",
            discount_type=CouponDiscountType.FIXED,
            discount_value=Decimal("10.00"),
            min_order_amount=Decimal("50.00"),
            start_date=self.today - timedelta(days=1),
            end_date=self.today + timedelta(days=5),
            usage_limit=2,
            used_count=0,
            status=True,
        )

        cart = get_or_create_active_cart(customer=self.customer)

        # Empty cart fails min_order_amount
        with self.assertRaises(CouponMinOrderAmountError):
            validate_coupon(code="WELCOME10", cart=cart)

        # Add item to meet min_order_amount
        add_item_to_cart(customer=self.customer, variant_id=self.variant.pk, quantity=1)
        valid_coupon = validate_coupon(code="WELCOME10", cart=cart)
        self.assertEqual(valid_coupon.pk, coupon.pk)

        # Non-existent coupon
        with self.assertRaises(InvalidCouponError):
            validate_coupon(code="NONEXISTENT", cart=cart)

    def test_redeem_coupon_increments_used_count(self):
        coupon = Coupon.objects.create(
            code="REDEEMME",
            discount_type=CouponDiscountType.PERCENT,
            discount_value=Decimal("10.00"),
            start_date=self.today - timedelta(days=1),
            end_date=self.today + timedelta(days=5),
            usage_limit=2,
            used_count=0,
        )
        redeem_coupon(code="REDEEMME")
        coupon.refresh_from_db()
        self.assertEqual(coupon.used_count, 1)

        redeem_coupon(code="REDEEMME")
        coupon.refresh_from_db()
        self.assertEqual(coupon.used_count, 2)

        # Next redeem raises limit reached
        with self.assertRaises(CouponUsageLimitReachedError):
            redeem_coupon(code="REDEEMME")
