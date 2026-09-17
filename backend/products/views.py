from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404

from core.permissions import IsAdminUser
from core.mixins import DomainErrorMixin
from .models import Category, Brand, Product, ProductVariant
from .serializers import (
    CategorySerializer,
    BrandSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateSerializer,
    ProductUpdateSerializer,
    ProductVariantSerializer,
    VariantCreateSerializer,
    VariantUpdateSerializer,
)
from .services import get_product_listing, get_product_detail, ProductNotFoundError, DuplicateSKUError

class CategoryListView(generics.ListAPIView):
    """Public: list all active categories."""
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    queryset = Category.objects.filter(status=True, is_deleted=False).order_by("name")


class BrandListView(generics.ListAPIView):
    """Public: list all active brands."""
    serializer_class = BrandSerializer
    permission_classes = [AllowAny]
    queryset = Brand.objects.filter(status=True, is_deleted=False).order_by("brand_name")


class ProductListView(generics.ListAPIView):
    """
    Public: browse products with optional filtering.
    Query params: category, brand, search, min_price, max_price
    """
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        params = self.request.query_params
        return get_product_listing(
            category_id=params.get("category"),
            brand_id=params.get("brand"),
            search=params.get("search", ""),
            min_price=params.get("min_price"),
            max_price=params.get("max_price"),
        )


class ProductDetailView(generics.RetrieveAPIView):
    """Public: full product detail by slug."""
    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_object(self):
        slug = self.kwargs["slug"]
        try:
            return get_product_detail(slug=slug)
        except ProductNotFoundError:
            from rest_framework.exceptions import NotFound
            raise NotFound(f'Product "{slug}" not found.')


class ProductCreateView(generics.CreateAPIView):
    """Admin-only: create a new product."""
    serializer_class = ProductCreateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(
            ProductDetailSerializer(product, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class VariantListCreateView(DomainErrorMixin, generics.GenericAPIView):
    """
    GET  /api/v1/products/<slug>/variants/
         Public: list all active variants for a product.
    POST /api/v1/products/<slug>/variants/
         Admin-only: add a new variant to a product.
    """

    def get_serializer_class(self):
        if self.request.method == "POST":
            return VariantCreateSerializer
        return ProductVariantSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsAdminUser()]
        return [AllowAny()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if self.request.method == "POST":
            ctx["product"] = get_object_or_404(
                Product.all_objects, slug=self.kwargs["slug"]
            )
        return ctx

    def get(self, request, slug, *args, **kwargs):
        """List active variants for the product."""
        product = get_object_or_404(Product, slug=slug)
        variants = ProductVariant.objects.filter(
            product=product, status=True, is_deleted=False
        )
        serializer = ProductVariantSerializer(variants, many=True)
        return Response(serializer.data)

    def post(self, request, slug, *args, **kwargs):
        """Admin-only: add a variant to this product."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            variant = serializer.save()
        except DuplicateSKUError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            ProductVariantSerializer(variant).data,
            status=status.HTTP_201_CREATED,
        )


class ProductUpdateView(DomainErrorMixin, generics.UpdateAPIView):
    """
    PATCH /api/v1/products/<slug>/update/
    Admin-only: partially update a product's core fields and dispatch operations on images.
    """
    serializer_class = ProductUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = "slug"
    queryset = Product.all_objects.filter(is_deleted=False)

    def update(self, request, *args, **kwargs):
        partial = True
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(
            ProductDetailSerializer(product, context=self.get_serializer_context()).data,
            status=status.HTTP_200_OK,
        )



class ProductDeleteView(DomainErrorMixin, generics.DestroyAPIView):
    """
    DELETE /api/v1/products/<slug>/delete/
    Admin-only: soft-delete a product.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = "slug"
    queryset = Product.all_objects.filter(is_deleted=False)

    def perform_destroy(self, instance):
        instance.soft_delete()



class VariantDetailView(DomainErrorMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/v1/products/variants/<pk>/
    Retrieve a variant (public) or update/soft-delete it (admin-only).
    """
    serializer_class = ProductVariantSerializer
    queryset = ProductVariant.objects.filter(is_deleted=False)

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [IsAuthenticated(), IsAdminUser()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return VariantUpdateSerializer
        return ProductVariantSerializer

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        instance.soft_delete()


class AllVariantsListView(generics.ListAPIView):
    """Public/Staff: list all product variants with product names for stock selection."""
    serializer_class = ProductVariantSerializer
    permission_classes = [AllowAny]
    queryset = ProductVariant.objects.select_related("product").filter(is_deleted=False).order_by("sku")
    pagination_class = None

