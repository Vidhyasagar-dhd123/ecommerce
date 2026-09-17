from django.utils import timezone
from rest_framework import serializers
from .models import Product, ProductVariant, ProductImage, Category, Brand


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "status"]
        read_only_fields = ["id"]


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "brand_name", "slug", "status"]
        read_only_fields = ["id"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image_url", "is_primary"]
        read_only_fields = ["id"]


class ProductVariantSerializer(serializers.ModelSerializer):
    is_in_stock = serializers.BooleanField(read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "product_name", "sku", "color", "size", "price", "stock", "weight", "status", "is_in_stock"]
        read_only_fields = ["id"]


class ProductListSerializer(serializers.ModelSerializer):
    """Compact serializer for product listing pages."""
    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.brand_name", read_only=True, default=None)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "base_price",
            "category_name", "brand_name", "primary_image", "status",
        ]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first()
        return img.image_url if img else None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for product detail pages — includes nested relations and active offers."""
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    active_offers = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "base_price",
            "category", "brand", "images", "variants",
            "active_offers", "status", "created_at",
        ]

    def get_active_offers(self, obj):
        """Return all currently-active offers attached to this product."""
        today = timezone.now().date()
        from promotions.serializers import HasActiveOfferSerializer
        qs = obj.active_offers.filter(
            start_date__lte=today, end_date__gte=today
        ).select_related("offer")
        return HasActiveOfferSerializer(qs, many=True).data


class ProductImageInputSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    image_url = serializers.URLField(max_length=500, required=False)
    is_primary = serializers.BooleanField(required=False, default=False)
    is_deleted = serializers.BooleanField(required=False, default=False)


class ProductCreateSerializer(serializers.ModelSerializer):
    """Admin-only: create a new product with optional images."""
    description = serializers.JSONField(required=False, default=dict)
    images = ProductImageInputSerializer(many=True, required=False, default=list)

    class Meta:
        model = Product
        fields = ["name", "description", "base_price", "category", "brand", "status", "images"]

    def create(self, validated_data):
        from .services import create_product
        images_data = validated_data.pop("images", [])
        return create_product(
            name=validated_data["name"],
            category_id=validated_data["category"].pk,
            brand_id=validated_data.get("brand") and validated_data["brand"].pk,
            description=validated_data.get("description", {}),
            base_price=validated_data["base_price"],
            images=images_data,
            created_by=self.context["request"].user,
        )


class VariantCreateSerializer(serializers.ModelSerializer):
    """Admin-only: add a variant to a product."""

    class Meta:
        model = ProductVariant
        fields = ["sku", "color", "size", "price", "stock", "weight"]

    def create(self, validated_data):
        from .services import add_variant
        return add_variant(
            product=self.context["product"],
            sku=validated_data["sku"],
            price=validated_data["price"],
            stock=validated_data.get("stock", 0),
            color=validated_data.get("color", ""),
            size=validated_data.get("size", ""),
            weight=validated_data.get("weight"),
            created_by=self.context["request"].user,
        )


class ProductUpdateSerializer(serializers.ModelSerializer):
    """Admin-only: update product fields and dispatch operations on images."""
    description = serializers.JSONField(required=False)
    images = ProductImageInputSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = ["name", "description", "base_price", "category", "brand", "status", "images"]

    def update(self, instance, validated_data):
        from .services import update_product
        images_data = validated_data.pop("images", None)
        category = validated_data.get("category")
        brand = validated_data.get("brand")
        return update_product(
            product=instance,
            name=validated_data.get("name"),
            category_id=category.pk if category else None,
            brand_id=brand.pk if brand else (brand if "brand" in validated_data else None),
            description=validated_data.get("description"),
            base_price=validated_data.get("base_price"),
            status=validated_data.get("status"),
            images=images_data,
            updated_by=self.context["request"].user if "request" in self.context else None,
        )


class VariantUpdateSerializer(serializers.ModelSerializer):
    """Admin-only: update an existing product variant."""

    class Meta:
        model = ProductVariant
        fields = ["sku", "color", "size", "price", "stock", "weight", "status"]

