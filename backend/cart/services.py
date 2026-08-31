"""
Service layer for the Cart domain.

Contains all business use-cases for cart management with concurrency guards
and atomic database transactions.
"""

import logging
from typing import Optional
from django.db import transaction

from core.exceptions import (
    ProductOutOfStockError,
    InsufficientStockError,
    CartEmptyError,
)
from products.models import ProductVariant
from .models import Cart, CartItem

logger = logging.getLogger(__name__)


def get_or_create_active_cart(*, customer) -> Cart:
    """
    Return the customer's active cart, creating one atomically if none exists.
    """
    cart, created = Cart.objects.get_or_create(customer=customer, is_active=True)
    if created:
        logger.info("Created new active cart #%s for customer #%s", cart.pk, customer.pk)
    return cart


@transaction.atomic
def add_item_to_cart(*, customer, variant_id, quantity: int = 1) -> CartItem:
    """
    Add a product variant to the customer's active cart.
    If the item is already present, its quantity is incremented.

    Raises:
        ProductOutOfStockError: If variant has 0 stock.
        InsufficientStockError: If requested quantity exceeds available stock.
    """
    if quantity <= 0:
        raise ValueError("Quantity must be a positive integer.")

    try:
        variant = ProductVariant.objects.select_for_update().get(pk=variant_id)
    except ProductVariant.DoesNotExist:
        logger.warning("Attempted to add non-existent variant ID %s to cart", variant_id)
        raise ProductOutOfStockError("Product variant does not exist.")

    if variant.stock == 0:
        logger.warning("Variant %s is out of stock", variant.sku)
        raise ProductOutOfStockError(f'"{variant.sku}" is out of stock.')

    if quantity > variant.stock:
        logger.warning(
            "Insufficient stock for variant %s: requested %s, available %s",
            variant.sku,
            quantity,
            variant.stock,
        )
        raise InsufficientStockError(
            f'Only {variant.stock} units of "{variant.sku}" are available.'
        )

    cart = get_or_create_active_cart(customer=customer)

    item, created = CartItem.objects.select_for_update().get_or_create(
        cart=cart,
        variant=variant,
        defaults={"price": variant.price, "quantity": quantity},
    )

    if not created:
        new_qty = item.quantity + quantity
        if new_qty > variant.stock:
            logger.warning(
                "Cannot increment variant %s: total requested %s > stock %s",
                variant.sku,
                new_qty,
                variant.stock,
            )
            raise InsufficientStockError(
                f'Cannot add {quantity} more — only {variant.stock} units available.'
            )
        item.quantity = new_qty
        item.save(update_fields=["quantity", "updated_at"])
        logger.info(
            "Incremented quantity of variant %s in cart #%s to %s",
            variant.sku,
            cart.pk,
            item.quantity,
        )
    else:
        logger.info(
            "Added variant %s to cart #%s (qty=%s)", variant.sku, cart.pk, quantity
        )

    return item


@transaction.atomic
def update_cart_item(*, customer, cart_item_id, quantity: int) -> Optional[CartItem]:
    """
    Update the quantity of an existing item in the customer's active cart.
    Setting quantity to 0 removes the item.

    Raises:
        InsufficientStockError: If requested quantity exceeds available stock.
        CartEmptyError: If the item does not exist in the active cart.
    """
    if quantity < 0:
        raise ValueError("Quantity cannot be negative.")

    cart = get_or_create_active_cart(customer=customer)

    try:
        item = CartItem.objects.select_for_update().get(pk=cart_item_id, cart=cart)
    except CartItem.DoesNotExist:
        logger.warning("CartItem ID %s not found in cart #%s", cart_item_id, cart.pk)
        raise CartEmptyError("Cart item not found in your active cart.")

    if quantity == 0:
        logger.info("Removing cart item #%s as quantity is set to 0", cart_item_id)
        item.delete()
        return None

    variant = ProductVariant.objects.get(pk=item.variant_id)
    if quantity > variant.stock:
        logger.warning(
            "Insufficient stock updating item #%s: requested %s, available %s",
            cart_item_id,
            quantity,
            variant.stock,
        )
        raise InsufficientStockError(f"Only {variant.stock} units available.")

    item.quantity = quantity
    item.save(update_fields=["quantity", "updated_at"])
    logger.info("Updated cart item #%s quantity to %s", cart_item_id, quantity)
    return item


def remove_cart_item(*, customer, cart_item_id) -> None:
    """
    Remove an item from the customer's active cart.
    """
    cart = get_or_create_active_cart(customer=customer)
    deleted_count, _ = CartItem.objects.filter(pk=cart_item_id, cart=cart).delete()
    if deleted_count:
        logger.info("Removed cart item #%s from cart #%s", cart_item_id, cart.pk)


def clear_cart(*, customer) -> None:
    """
    Remove all items from the customer's active cart.
    """
    cart = get_or_create_active_cart(customer=customer)
    deleted_count, _ = cart.items.all().delete()
    logger.info("Cleared cart #%s (%s items removed)", cart.pk, deleted_count)
