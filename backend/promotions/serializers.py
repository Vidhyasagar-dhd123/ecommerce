from decimal import Decimal
from rest_framework import serializers
from promotions.models import Offer, HasActiveOffer, Coupon


class OfferSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(source="is_active_today", read_only=True)

    class Meta:
        model = Offer
        fields = [
            "id",
            "title",
            "description",
            "discount_type",
            "discount_value",
            "start_date",
            "end_date",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_active", "created_at", "updated_at"]


class OfferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = [
            "id",
            "title",
            "description",
            "discount_type",
            "discount_value",
            "start_date",
            "end_date",
            "status",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        if attrs.get("start_date") and attrs.get("end_date"):
            if attrs["start_date"] > attrs["end_date"]:
                raise serializers.ValidationError("start_date cannot be after end_date.")
        return attrs


class HasActiveOfferSerializer(serializers.ModelSerializer):
    offer_title = serializers.CharField(source="offer.title", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = HasActiveOffer
        fields = [
            "id",
            "offer",
            "offer_title",
            "product",
            "product_name",
            "start_date",
            "end_date",
            "created_at",
        ]
        read_only_fields = ["id", "offer_title", "product_name", "created_at"]


class ApplyOfferSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)


class CouponSerializer(serializers.ModelSerializer):
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "discount_type",
            "discount_value",
            "min_order_amount",
            "start_date",
            "end_date",
            "status",
            "usage_limit",
            "used_count",
            "is_valid",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "used_count", "is_valid", "created_at", "updated_at"]


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, required=True)
