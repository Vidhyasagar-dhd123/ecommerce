"""
Serializers for the Cart domain.
"""

from rest_framework import serializers

from products.models import Product, ProductVariant
from products.serializers import ProductImageSerializer
from .models import Cart, CartItem


class CartProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "images"]


class CartVariantSerializer(serializers.ModelSerializer):
    product = CartProductSerializer(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "color", "size", "price", "stock", "is_in_stock", "product"]


class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for individual items in a shopping cart.
    Includes full variant details for frontend presentation.
    """

    variant_details = CartVariantSerializer(source="variant", read_only=True)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = [
            "id",
            "cart",
            "variant",
            "variant_details",
            "quantity",
            "price",
            "subtotal",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "cart", "price", "subtotal", "created_at", "updated_at"]


class CartSerializer(serializers.ModelSerializer):
    """
    Serializer for the active shopping cart with nested items and total.
    """

    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = [
            "id",
            "customer",
            "is_active",
            "items",
            "total",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "customer", "is_active", "total", "created_at", "updated_at"]


class AddToCartSerializer(serializers.Serializer):
    """
    Input validation serializer for adding an item to the active cart.
    """

    variant_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(default=1, min_value=1)


class UpdateCartItemSerializer(serializers.Serializer):
    """
    Input validation serializer for updating an item's quantity.
    """

    quantity = serializers.IntegerField(required=True, min_value=0)
