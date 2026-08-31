import logging
from django.db import transaction
from django.utils.text import slugify

from core.exceptions import ProductNotFoundError, DuplicateSKUError
from .models import Product, ProductVariant, ProductImage

logger = logging.getLogger(__name__)


def get_product_listing(
    *,
    category_id=None,
    brand_id=None,
    search: str = "",
    min_price=None,
    max_price=None,
):
    """
    Return a filtered, optimised product queryset for the listing page.
    """
    qs = Product.objects.with_relations()
    if category_id:
        qs = qs.by_category(category_id)
    if brand_id:
        qs = qs.by_brand(brand_id)
    if search:
        qs = qs.search(search)
    qs = qs.price_range(min_price=min_price, max_price=max_price)
    return qs


def get_product_detail(*, slug: str) -> Product:
    """
    Return a single active product with all relations prefetched.
    Raises ProductNotFoundError if not found.
    """
    try:
        return (
            Product.objects.with_relations()
            .prefetch_related("variants", "images")
            .get(slug=slug)
        )
    except Product.DoesNotExist:
        logger.warning("Product detail lookup failed for slug: %s", slug)
        raise ProductNotFoundError(f'Product "{slug}" not found.')


@transaction.atomic
def sync_product_images(*, product: Product, images_data: list[dict], user=None) -> list[ProductImage]:
    """
    Synchronise and dispatch operations on product images.
    Handles adding new images, updating existing ones, soft-deleting images marked is_deleted=True,
    and atomically ensuring default / is_primary image selection.
    """
    if images_data is None:
        return list(product.images.filter(is_deleted=False))

    # Identify if a specific image was marked as primary
    primary_id_or_index = None
    for idx, img_data in enumerate(images_data):
        if img_data.get("is_primary") and not img_data.get("is_deleted", False):
            primary_id_or_index = img_data.get("id") if img_data.get("id") is not None else idx

    active_images = []

    for idx, img_data in enumerate(images_data):
        img_id = img_data.get("id")
        is_deleted = img_data.get("is_deleted", False)
        image_url = img_data.get("image_url")

        if img_id:
            try:
                img_obj = ProductImage.all_objects.get(id=img_id, product=product)
            except ProductImage.DoesNotExist:
                logger.warning("ProductImage ID %s not found for product %s", img_id, product.slug)
                continue

            if is_deleted:
                img_obj.soft_delete()
                continue

            if image_url:
                img_obj.image_url = image_url
            img_obj.is_deleted = False
            if user:
                img_obj.updated_by = user
            img_obj.save()
            active_images.append((img_obj, img_id))
        else:
            if not is_deleted and image_url:
                img_obj = ProductImage.all_objects.create(
                    product=product,
                    image_url=image_url,
                    is_primary=False,
                    created_by=user,
                )
                active_images.append((img_obj, idx))

    # Determine primary image assignment
    has_primary = False
    if primary_id_or_index is not None:
        for img_obj, identifier in active_images:
            if identifier == primary_id_or_index:
                img_obj.is_primary = True
                has_primary = True
            else:
                img_obj.is_primary = False
            img_obj.save(update_fields=["is_primary"])

    # If no primary is explicitly designated and active images exist, make first image primary
    if not has_primary and active_images:
        existing_primaries = [img for img, _ in active_images if img.is_primary]
        if len(existing_primaries) == 1:
            has_primary = True
        else:
            for i, (img_obj, _) in enumerate(active_images):
                img_obj.is_primary = (i == 0)
                img_obj.save(update_fields=["is_primary"])

    # Clear primary on any other existing images if active images have a primary
    if active_images:
        primary_pks = [img.pk for img, _ in active_images if img.is_primary]
        if primary_pks:
            ProductImage.all_objects.filter(product=product).exclude(pk__in=primary_pks).update(is_primary=False)

    return [img for img, _ in active_images]


@transaction.atomic
def create_product(
    *,
    name: str,
    category_id,
    brand_id=None,
    description=None,
    base_price,
    images: list[dict] = None,
    created_by,
) -> Product:
    """
    Create a new product. Admin-only. Generates slug from name.
    Dispatches image operations if image data is provided.
    """
    if description is None:
        description = {}

    slug = slugify(name)
    # Ensure slug uniqueness
    if Product.all_objects.filter(slug=slug).exists():
        slug = f"{slug}-{Product.all_objects.count()}"

    logger.info("Creating product '%s' (slug=%s)", name, slug)
    product = Product.all_objects.create(
        name=name,
        slug=slug,
        category_id=category_id,
        brand_id=brand_id,
        description=description,
        base_price=base_price,
        created_by=created_by,
    )

    if images:
        sync_product_images(product=product, images_data=images, user=created_by)

    return product


@transaction.atomic
def update_product(
    *,
    product: Product,
    name: str = None,
    category_id=None,
    brand_id=None,
    description=None,
    base_price=None,
    status: bool = None,
    images: list[dict] = None,
    updated_by=None,
) -> Product:
    """
    Partially or fully update product fields and dispatch operations on images.
    """
    update_fields = []
    if name is not None:
        product.name = name
        update_fields.append("name")
    if category_id is not None:
        product.category_id = category_id
        update_fields.append("category")
    if brand_id is not None:
        product.brand_id = brand_id
        update_fields.append("brand")
    if description is not None:
        product.description = description
        update_fields.append("description")
    if base_price is not None:
        product.base_price = base_price
        update_fields.append("base_price")
    if status is not None:
        product.status = status
        update_fields.append("status")
    if updated_by is not None:
        product.updated_by = updated_by
        update_fields.append("updated_by")

    if update_fields:
        product.save(update_fields=update_fields)

    if images is not None:
        sync_product_images(product=product, images_data=images, user=updated_by)

    return product


@transaction.atomic
def add_variant(
    *,
    product: Product,
    sku: str,
    price,
    stock: int,
    color: str = "",
    size: str = "",
    weight=None,
    created_by,
) -> ProductVariant:
    """
    Add a variant (SKU) to an existing product.
    Raises DuplicateSKUError on conflict.
    """
    if ProductVariant.all_objects.filter(sku=sku).exists():
        logger.warning("Variant creation failed: Duplicate SKU '%s'", sku)
        raise DuplicateSKUError(f'SKU "{sku}" is already in use.')

    logger.info("Adding variant SKU '%s' to product '%s'", sku, product.name)
    return ProductVariant.all_objects.create(
        product=product,
        sku=sku,
        price=price,
        stock=stock,
        color=color,
        size=size,
        weight=weight,
        created_by=created_by,
    )

