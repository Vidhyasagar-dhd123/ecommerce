from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase

from products.models import Category, Product
from promotions.models import (
    DiscountType,
    Offer,
    HasActiveOffer,
    CouponDiscountType,
    Coupon,
)


class PromotionModelTests(TestCase):
    def setUp(self):
        self.today = date.today()
        self.category = Category.objects.create(name="PromoCategory", slug="promo-cat")
        self.product = Product.objects.create(
            name="PromoProduct",
            slug="promo-product",
            category=self.category,
            base_price=Decimal("100.00"),
        )

    def test_offer_model_and_is_active_today(self):
        offer = Offer.objects.create(
            title="Summer Sale",
            discount_type=DiscountType.PERCENT,
            discount_value=Decimal("20.00"),
            start_date=self.today - timedelta(days=1),
            end_date=self.today + timedelta(days=10),
            status=True,
        )
        self.assertIn("Summer Sale", str(offer))
        self.assertTrue(offer.is_active_today())

        # Expired offer
        expired_offer = Offer.objects.create(
            title="Past Offer",
            discount_type=DiscountType.FIXED,
            discount_value=Decimal("10.00"),
            start_date=self.today - timedelta(days=10),
            end_date=self.today - timedelta(days=2),
            status=True,
        )
        self.assertFalse(expired_offer.is_active_today())

    def test_has_active_offer_model(self):
        offer = Offer.objects.create(
            title="Flash Deal",
            discount_type=DiscountType.FIXED,
            discount_value=Decimal("15.00"),
            start_date=self.today,
            end_date=self.today + timedelta(days=5),
        )
        active_offer = HasActiveOffer.objects.create(
            offer=offer,
            product=self.product,
            start_date=offer.start_date,
            end_date=offer.end_date,
        )
        self.assertIn("Flash Deal", str(active_offer))
        self.assertIn("PromoProduct", str(active_offer))

    def test_coupon_is_valid_and_calculate_discount(self):
        coupon = Coupon.objects.create(
            code="SAVE25",
            discount_type=CouponDiscountType.PERCENT,
            discount_value=Decimal("25.00"),
            min_order_amount=Decimal("50.00"),
            start_date=self.today - timedelta(days=1),
            end_date=self.today + timedelta(days=5),
            usage_limit=5,
            used_count=2,
            status=True,
        )
        self.assertTrue(coupon.is_valid())
        self.assertEqual(coupon.calculate_discount(Decimal("100.00")), Decimal("25.00"))

        # Test limit reached
        coupon.used_count = 5
        coupon.save()
        self.assertFalse(coupon.is_valid())
