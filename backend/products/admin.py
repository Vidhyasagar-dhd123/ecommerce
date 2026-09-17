from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Sum
from .models import Category, Brand, Product, ProductVariant, ProductImage


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ["sku", "color", "size", "price", "stock", "status"]
    show_change_link = True


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ["image_preview", "image_url", "is_primary"]
    readonly_fields = ["image_preview"]

    def image_preview(self, obj):
        if obj and obj.image_url:
            return format_html(
                '<img src="{}" class="admin-thumb-img" alt="Product Image" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid var(--se-border);"/>',
                obj.image_url,
            )
        return mark_safe('<span style="color: var(--body-quiet-color); font-size: 11px;">No image</span>')
    image_preview.short_description = "Preview"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "parent_category", "slug", "status_badge", "products_count"]
    list_filter = ["status", "parent"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    actions = ["activate_categories", "deactivate_categories"]

    def parent_category(self, obj):
        return obj.parent.name if obj.parent else "— (Top Level)"
    parent_category.short_description = "Parent"

    def status_badge(self, obj):
        if obj.status:
            return mark_safe('<span class="badge-pill badge-success">Active</span>')
        return mark_safe('<span class="badge-pill badge-danger">Inactive</span>')
    status_badge.short_description = "Status"

    def products_count(self, obj):
        return obj.products.count()
    products_count.short_description = "Products"

    @admin.action(description="Activate selected categories")
    def activate_categories(self, request, queryset):
        queryset.update(status=True)

    @admin.action(description="Deactivate selected categories")
    def deactivate_categories(self, request, queryset):
        queryset.update(status=False)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["brand_name", "slug", "status_badge", "products_count"]
    list_filter = ["status"]
    search_fields = ["brand_name", "slug"]
    prepopulated_fields = {"slug": ("brand_name",)}
    actions = ["activate_brands", "deactivate_brands"]

    def status_badge(self, obj):
        if obj.status:
            return mark_safe('<span class="badge-pill badge-success">Active</span>')
        return mark_safe('<span class="badge-pill badge-danger">Inactive</span>')
    status_badge.short_description = "Status"

    def products_count(self, obj):
        return obj.products.count()
    products_count.short_description = "Products"

    @admin.action(description="Activate selected brands")
    def activate_brands(self, request, queryset):
        queryset.update(status=True)

    @admin.action(description="Deactivate selected brands")
    def deactivate_brands(self, request, queryset):
        queryset.update(status=False)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "product_identity",
        "category",
        "brand_display",
        "formatted_price",
        "total_stock_display",
        "variants_count",
        "status_badge",
        "created_at_display",
    ]
    list_filter = ["status", "category", "brand", "created_at"]
    search_fields = ["name", "slug", "variants__sku", "category__name", "brand__brand_name"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductVariantInline, ProductImageInline]
    raw_id_fields = ["category", "brand"]
    readonly_fields = ["image_large_preview", "total_stock_display", "created_at", "updated_at"]
    actions = ["activate_products", "deactivate_products", "clone_products"]

    def product_identity(self, obj):
        primary_img = obj.images.filter(is_primary=True).first() or obj.images.first()
        img_tag = (
            f'<img src="{primary_img.image_url}" class="admin-thumb-img" alt="{obj.name}" />'
            if primary_img and primary_img.image_url
            else '<div class="admin-thumb-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>'
        )
        first_variant = obj.variants.first()
        sku_text = f"SKU: {first_variant.sku}" if first_variant else "No SKUs"
        return format_html(
            '<div class="admin-cell-identity">{}<div class="admin-cell-identity-text"><a href="{}" class="admin-product-link">{}</a><span class="admin-meta-text">{}</span></div></div>',
            mark_safe(img_tag),
            f"/admin/products/product/{obj.id}/change/",
            obj.name,
            sku_text,
        )
    product_identity.short_description = "Product"

    def brand_display(self, obj):
        if obj.brand:
            return obj.brand.brand_name
        return mark_safe('<span class="admin-meta-text">—</span>')
    brand_display.short_description = "Brand"

    def image_large_preview(self, obj):
        primary_img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if primary_img and primary_img.image_url:
            return format_html(
                '<div class="admin-preview-box"><img src="{}" class="admin-preview-img" alt="{}" /><div><strong>Primary Image</strong><br><span style="font-size: 12px; color: var(--body-quiet-color);">{}</span></div></div>',
                primary_img.image_url,
                obj.name,
                primary_img.image_url,
            )
        return "No image uploaded yet."
    image_large_preview.short_description = "Image Preview"

    def formatted_price(self, obj):
        return f"₹{obj.base_price:,.2f}"
    formatted_price.short_description = "Price"
    formatted_price.admin_order_field = "base_price"

    def total_stock_display(self, obj):
        total = obj.variants.aggregate(total=Sum("stock"))["total"] or 0
        if total == 0:
            return mark_safe('<span class="stock-pill stock-out"><span class="stock-dot"></span> Out of Stock</span>')
        elif total < 10:
            return format_html('<span class="stock-pill stock-low"><span class="stock-dot"></span> Low Stock ({})</span>', total)
        return format_html('<span class="stock-pill stock-healthy"><span class="stock-dot"></span> {} in stock</span>', total)
    total_stock_display.short_description = "Inventory"

    def variants_count(self, obj):
        count = obj.variants.count()
        if count == 0:
            return mark_safe('<span class="badge-pill badge-dark">0 SKUs</span>')
        return format_html('<span class="badge-pill badge-info">{} SKUs</span>', count)
    variants_count.short_description = "SKUs"

    def status_badge(self, obj):
        if obj.status:
            return mark_safe('<span class="badge-pill badge-success">Active</span>')
        return mark_safe('<span class="badge-pill badge-dark">Draft</span>')
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    def created_at_display(self, obj):
        return obj.created_at.strftime("%b %d, %Y · %I:%M %p")
    created_at_display.short_description = "Created"
    created_at_display.admin_order_field = "created_at"

    @admin.action(description="Publish / Activate selected products")
    def activate_products(self, request, queryset):
        queryset.update(status=True)

    @admin.action(description="Unpublish / Deactivate selected products")
    def deactivate_products(self, request, queryset):
        queryset.update(status=False)

    @admin.action(description="Duplicate / Clone selected products as Draft")
    def clone_products(self, request, queryset):
        for prod in queryset:
            prod.pk = None
            prod.name = f"{prod.name} (Copy)"
            prod.slug = f"{prod.slug}-copy"
            prod.status = False
            prod.save()


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = [
        "product_thumb",
        "sku",
        "product",
        "color",
        "size",
        "formatted_price",
        "stock_level_badge",
        "status_badge",
    ]
    list_filter = ["status", "color", "size"]
    search_fields = ["sku", "product__name"]
    raw_id_fields = ["product"]
    actions = ["activate_variants", "deactivate_variants"]

    def product_thumb(self, obj):
        primary_img = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
        if primary_img and primary_img.image_url:
            return format_html(
                '<img src="{}" class="admin-thumb-img" alt="{}" />',
                primary_img.image_url,
                obj.sku,
            )
        return "—"
    product_thumb.short_description = "Preview"

    def formatted_price(self, obj):
        return f"${obj.price:.2f}"
    formatted_price.short_description = "Price"
    formatted_price.admin_order_field = "price"

    def stock_level_badge(self, obj):
        if obj.stock <= 0:
            return mark_safe('<span class="badge-pill badge-danger">0 Out of Stock</span>')
        elif obj.stock < 10:
            return format_html('<span class="badge-pill badge-warning">{} Low Stock</span>', obj.stock)
        return format_html('<span class="badge-pill badge-success">{} In Stock</span>', obj.stock)
    stock_level_badge.short_description = "Stock"
    stock_level_badge.admin_order_field = "stock"

    def status_badge(self, obj):
        if obj.status:
            return mark_safe('<span class="badge-pill badge-success">Active</span>')
        return mark_safe('<span class="badge-pill badge-danger">Inactive</span>')
    status_badge.short_description = "Status"

    @admin.action(description="Activate selected variants")
    def activate_variants(self, request, queryset):
        queryset.update(status=True)

    @admin.action(description="Deactivate selected variants")
    def deactivate_variants(self, request, queryset):
        queryset.update(status=False)


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ["image_thumb", "product", "image_url_truncated", "is_primary_badge", "created_at"]
    list_filter = ["is_primary", "created_at"]
    search_fields = ["product__name", "image_url"]
    raw_id_fields = ["product"]
    readonly_fields = ["large_preview", "created_at", "updated_at"]
    actions = ["set_as_primary"]

    def image_thumb(self, obj):
        if obj.image_url:
            return format_html(
                '<img src="{}" class="admin-thumb-img" alt="Gallery item" />',
                obj.image_url,
            )
        return "No image"
    image_thumb.short_description = "Preview"

    def image_url_truncated(self, obj):
        if len(obj.image_url) > 60:
            return obj.image_url[:57] + "..."
        return obj.image_url
    image_url_truncated.short_description = "Image URL"

    def is_primary_badge(self, obj):
        if obj.is_primary:
            return mark_safe('<span class="badge-pill badge-primary">Primary</span>')
        return mark_safe('<span class="badge-pill badge-dark">Secondary</span>')
    is_primary_badge.short_description = "Primary"

    def large_preview(self, obj):
        if obj.image_url:
            return format_html(
                '<div class="admin-preview-box"><img src="{}" class="admin-preview-img" /><div><strong>Image Preview</strong><br><a href="{}" target="_blank" style="color: var(--link-fg);">Open full original</a></div></div>',
                obj.image_url,
                obj.image_url,
            )
        return "—"
    large_preview.short_description = "Full Preview"

    @admin.action(description="Set selected image as primary")
    def set_as_primary(self, request, queryset):
        for img in queryset:
            ProductImage.objects.filter(product=img.product).update(is_primary=False)
            img.is_primary = True
            img.save(update_fields=["is_primary"])
