import logging
from django.db import transaction

from core.exceptions import (
    DomainError,
    ProductNotFoundError,
    NotPurchasedError,
    AlreadyReviewedError,
    InvalidRatingError,
)
from products.models import Product
from orders.models import Order, OrderStatus
from reviews.models import Review

logger = logging.getLogger(__name__)


@transaction.atomic
def submit_review(
    *,
    customer,
    product_id: int,
    rating: int,
    comment: str = "",
) -> Review:
    """
    Submits a customer review for a purchased product.
    Requires at least one DELIVERED order containing a variant of the product.
    Enforces single review per customer per product.
    """
    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        raise ProductNotFoundError(f"Product #{product_id} not found.")

    if not (1 <= rating <= 5):
        raise InvalidRatingError("Rating must be between 1 and 5.")

    has_delivered_order = Order.objects.filter(
        customer=customer,
        status=OrderStatus.DELIVERED,
        items__variant__product=product,
    ).exists()

    if not has_delivered_order:
        logger.warning(
            "Review rejected: Customer #%s has not purchased/received product #%s",
            customer.pk,
            product.pk,
        )
        raise NotPurchasedError("You can only review products from delivered orders.")

    if Review.objects.filter(product=product, customer=customer).exists():
        logger.warning(
            "Review rejected: Customer #%s has already reviewed product #%s",
            customer.pk,
            product.pk,
        )
        raise AlreadyReviewedError("You have already reviewed this product.")

    review = Review.objects.create(
        product=product,
        customer=customer,
        rating=rating,
        comment=comment.strip(),
    )
    logger.info(
        "Review #%s created for Product #%s by Customer #%s (rating=%s★)",
        review.pk,
        product.pk,
        customer.pk,
        rating,
    )
    return review
