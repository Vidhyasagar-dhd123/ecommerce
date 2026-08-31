import logging
from decimal import Decimal
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from core.exceptions import (
    DomainError,
    OverlappingOfferError,
    InvalidCouponError,
    CouponExpiredError,
    CouponUsageLimitReachedError,
    CouponMinOrderAmountError,
    ProductNotFoundError,
)
from products.models import Product
from promotions.models import Offer, HasActiveOffer, Coupon

logger = logging.getLogger(__name__)


@transaction.atomic
def create_offer(
    *,
    title: str,
    discount_type: str,
    discount_value: Decimal,
    start_date,
    end_date,
    description: str = "",
    status: bool = True,
    created_by=None,
) -> Offer:
    """Creates a new promotional offer."""
    if start_date > end_date:
        raise DomainError("Offer start_date cannot be after end_date.")

    offer = Offer.objects.create(
        title=title,
        description=description,
        discount_type=discount_type,
        discount_value=discount_value,
        start_date=start_date,
        end_date=end_date,
        status=status,
    )
    logger.info("Offer #%s created: '%s'", offer.pk, offer.title)
    return offer


@transaction.atomic
def apply_offer_to_product(
    *,
    offer_id: int,
    product_id: int,
    applied_by=None,
) -> HasActiveOffer:
    """
    Attaches an offer to a product.
    Ensures that the product does not have an overlapping active offer in the date range.
    """
    try:
        offer = Offer.objects.get(pk=offer_id)
    except Offer.DoesNotExist:
        raise DomainError("Offer does not exist.")

    try:
        product = Product.objects.select_for_update().get(pk=product_id)
    except Product.DoesNotExist:
        raise ProductNotFoundError(f"Product #{product_id} not found.")

    overlapping = HasActiveOffer.objects.filter(
        product=product,
        end_date__gte=offer.start_date,
        start_date__lte=offer.end_date,
    ).exists()

    if overlapping:
        logger.warning(
            "Overlapping offer rejected for product #%s and offer #%s",
            product.pk,
            offer.pk,
        )
        raise OverlappingOfferError(
            f"Product '{product.name}' already has an active offer in this date range."
        )

    active_offer, _ = HasActiveOffer.objects.update_or_create(
        offer=offer,
        product=product,
        defaults={
            "start_date": offer.start_date,
            "end_date": offer.end_date,
        },
    )
    logger.info("Offer #%s attached to Product #%s", offer.pk, product.pk)
    return active_offer


def get_active_offer_for_product(product) -> Offer | None:
    """
    Returns the currently active Offer for a product if one exists and is valid today.
    """
    today = timezone.now().date()
    active_link = (
        HasActiveOffer.objects.filter(
            product=product,
            start_date__lte=today,
            end_date__gte=today,
            offer__status=True,
        )
        .select_related("offer")
        .first()
    )
    if active_link and active_link.offer.is_active_today():
        return active_link.offer
    return None


def calculate_product_discount(*, product, unit_price: Decimal, quantity: int = 1) -> Decimal:
    """
    Calculates total promotional offer discount for given product, unit price, and quantity.
    """
    offer = get_active_offer_for_product(product)
    if not offer:
        return Decimal("0.00")
    discount_per_unit = offer.calculate_discount(unit_price)
    return (discount_per_unit * quantity).quantize(Decimal("0.01"))


def validate_coupon(*, code: str, cart) -> Coupon:

    """
    Validates a coupon code against a shopping cart.
    Verifies existence, active status, valid date range, usage limit, and min order threshold.
    """
    if not code:
        raise InvalidCouponError("Coupon code cannot be blank.")

    try:
        coupon = Coupon.objects.get(code__iexact=code.strip())
    except Coupon.DoesNotExist:
        raise InvalidCouponError(f"Coupon '{code}' is not valid.")

    today = timezone.now().date()
    if not coupon.status or not (coupon.start_date <= today <= coupon.end_date):
        raise CouponExpiredError(f"Coupon '{coupon.code}' has expired or is inactive.")

    if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
        raise CouponUsageLimitReachedError(
            f"Coupon '{coupon.code}' has reached its maximum usage limit."
        )

    cart_total = sum((item.price * item.quantity for item in cart.items.all()), Decimal("0.00"))
    if cart_total < coupon.min_order_amount:
        raise CouponMinOrderAmountError(
            f"Coupon '{coupon.code}' requires a minimum cart total of {coupon.min_order_amount}."
        )

    logger.info("Coupon '%s' validated successfully for cart #%s", coupon.code, cart.pk)
    return coupon


@transaction.atomic
def redeem_coupon(*, code: str) -> Coupon:
    """
    Atomically increments coupon used_count upon order completion.
    """
    try:
        coupon = Coupon.objects.select_for_update().get(code__iexact=code.strip())
    except Coupon.DoesNotExist:
        raise InvalidCouponError(f"Coupon '{code}' not found.")

    if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
        raise CouponUsageLimitReachedError(
            f"Coupon '{coupon.code}' has already reached its usage limit."
        )

    Coupon.objects.filter(pk=coupon.pk).update(used_count=F("used_count") + 1)
    coupon.refresh_from_db()
    logger.info("Coupon '%s' redeemed (used_count=%s)", coupon.code, coupon.used_count)
    return coupon
