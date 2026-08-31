import logging
from django.db import transaction

from core.exceptions import ProductNotFoundError
from products.models import Product
from wishlist.models import Wishlist, WishlistItem

logger = logging.getLogger(__name__)


@transaction.atomic
def get_or_create_wishlist(*, customer) -> Wishlist:
    """Retrieves or initializes a wishlist for the customer."""
    wishlist, created = Wishlist.objects.get_or_create(customer=customer)
    if created:
        logger.info("Created new wishlist #%s for customer #%s", wishlist.pk, customer.pk)
    return wishlist


@transaction.atomic
def add_to_wishlist(*, customer, product_id: int) -> WishlistItem:
    """Adds a product to the customer's wishlist."""
    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        raise ProductNotFoundError(f"Product #{product_id} not found.")

    wishlist = get_or_create_wishlist(customer=customer)
    item, created = WishlistItem.objects.get_or_create(
        wishlist=wishlist,
        product=product,
    )
    if created:
        logger.info("Product #%s added to wishlist #%s", product.pk, wishlist.pk)
    return item


@transaction.atomic
def remove_from_wishlist(*, customer, product_id: int) -> bool:
    """Removes a product from the customer's wishlist."""
    try:
        wishlist = Wishlist.objects.get(customer=customer)
        deleted_count, _ = WishlistItem.objects.filter(
            wishlist=wishlist,
            product_id=product_id,
        ).delete()
        logger.info(
            "Product #%s removed from wishlist #%s (deleted=%s)",
            product_id,
            wishlist.pk,
            deleted_count,
        )
        return deleted_count > 0
    except Wishlist.DoesNotExist:
        return False


@transaction.atomic
def clear_wishlist(*, customer) -> int:
    """Clears all products from the customer's wishlist."""
    try:
        wishlist = Wishlist.objects.get(customer=customer)
        deleted_count, _ = wishlist.items.all().delete()
        logger.info("Cleared wishlist #%s (%s items removed)", wishlist.pk, deleted_count)
        return deleted_count
    except Wishlist.DoesNotExist:
        return 0
