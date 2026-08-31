from django.contrib import admin
from .models import Category, Brand, Product, ProductVariant, ProductImage


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ["sku", "color", "size", "price", "stock", "status"]
    show_change_link = True


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ["image_url", "is_primary"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "slug", "status"]
    list_filter = ["status", "parent"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["brand_name", "slug", "status"]
    search_fields = ["brand_name", "slug"]
    prepopulated_fields = {"slug": ("brand_name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "brand", "base_price", "status"]
    list_filter = ["status", "category", "brand"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductVariantInline, ProductImageInline]
    raw_id_fields = ["category", "brand"]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ["sku", "product", "price", "stock", "status"]
    list_filter = ["status"]
    search_fields = ["sku", "product__name"]
    raw_id_fields = ["product"]


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ["product", "image_url", "is_primary"]
    raw_id_fields = ["product"]
