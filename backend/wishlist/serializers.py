from rest_framework import serializers
from wishlist.models import Wishlist, WishlistItem
from products.serializers import ProductDetailSerializer


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductDetailSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = [
            "id",
            "product",
            "created_at",
        ]
        read_only_fields = ["id", "product", "created_at"]


class WishlistSerializer(serializers.ModelSerializer):
    items = WishlistItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = [
            "id",
            "items",
            "total_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "items", "total_items", "created_at", "updated_at"]

    def get_total_items(self, obj) -> int:
        return obj.items.count()


class AddWishlistItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
