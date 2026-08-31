from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from .models import Category, Brand, Product, ProductVariant
from .services import DuplicateSKUError, ProductNotFoundError, get_product_detail
from users.models import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_admin(username="prod_admin", email="prod_admin@example.com"):
    user = User.objects.create_user(
        username=username, email=email, password="pass1234",
        first_name="Prod", last_name="Admin",
    )
    user.role = "admin"
    user.save(update_fields=["role"])
    return user


def make_category(name="Electronics", slug="electronics"):
    return Category.objects.create(name=name, slug=slug)


def make_brand(name="Sony", slug="sony"):
    return Brand.objects.create(brand_name=name, slug=slug)


def make_product(category, brand=None, name="Test Product", price="99.99"):
    return Product.all_objects.create(
        name=name,
        slug=name.lower().replace(" ", "-"),
        category=category,
        brand=brand,
        base_price=Decimal(price),
    )


def make_variant(product, sku="SKU-001", price="99.99", stock=10):
    return ProductVariant.all_objects.create(
        product=product, sku=sku, price=Decimal(price), stock=stock
    )


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class CategoryModelTests(TestCase):
    def test_get_full_path_root(self):
        cat = make_category("Electronics", "electronics")
        self.assertEqual(cat.get_full_path(), "Electronics")

    def test_get_full_path_nested(self):
        parent = make_category("Electronics", "electronics")
        child = Category.objects.create(name="Phones", slug="phones", parent=parent)
        self.assertEqual(child.get_full_path(), "Electronics > Phones")

    def test_product_auto_slug(self):
        cat = make_category()
        product = Product.all_objects.create(
            name="Cool Gadget", category=cat, base_price=Decimal("49.99")
        )
        self.assertEqual(product.slug, "cool-gadget")

    def test_variant_is_in_stock(self):
        cat = make_category()
        product = make_product(cat)
        v_in = make_variant(product, sku="IN-001", stock=5)
        v_out = make_variant(product, sku="OUT-001", stock=0)
        self.assertTrue(v_in.is_in_stock)
        self.assertFalse(v_out.is_in_stock)


# ---------------------------------------------------------------------------
# Service tests
# ---------------------------------------------------------------------------

class ProductServiceTests(TestCase):
    def setUp(self):
        self.admin = make_admin()
        self.category = make_category()
        self.brand = make_brand()
        self.product = make_product(self.category, self.brand)

    def test_get_product_detail_returns_product(self):
        product = get_product_detail(slug=self.product.slug)
        self.assertEqual(product.pk, self.product.pk)

    def test_get_product_detail_not_found_raises(self):
        with self.assertRaises(ProductNotFoundError):
            get_product_detail(slug="does-not-exist")

    def test_duplicate_sku_raises(self):
        make_variant(self.product, sku="DUP-001")
        from .services import add_variant
        with self.assertRaises(DuplicateSKUError):
            add_variant(
                product=self.product,
                sku="DUP-001",
                price=Decimal("10.00"),
                stock=1,
                created_by=self.admin,
            )

    def test_soft_deleted_product_excluded_from_default_manager(self):
        self.product.soft_delete()
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())
        self.assertTrue(Product.all_objects.filter(pk=self.product.pk).exists())

    def test_in_stock_manager_excludes_zero_stock(self):
        make_variant(self.product, sku="STOCK-001", stock=0)
        # product has only a zero-stock variant → not in_stock
        self.assertFalse(Product.objects.in_stock().filter(pk=self.product.pk).exists())
        # add an in-stock variant
        make_variant(self.product, sku="STOCK-002", stock=5)
        self.assertTrue(Product.objects.in_stock().filter(pk=self.product.pk).exists())


# ---------------------------------------------------------------------------
# View tests
# ---------------------------------------------------------------------------

class ProductListViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = make_category()
        self.brand = make_brand()
        self.product = make_product(self.category, self.brand, price="50.00")

    def test_anonymous_can_list_products(self):
        response = self.client.get("/api/v1/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_by_category(self):
        response = self.client.get(f"/api/v1/products/?category={self.category.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)

    def test_filter_by_brand(self):
        response = self.client.get(f"/api/v1/products/?brand={self.brand.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)

    def test_search_by_name(self):
        response = self.client.get("/api/v1/products/?search=Test")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertGreaterEqual(len(results), 1)

    def test_price_range_filter(self):
        response = self.client.get("/api/v1/products/?min_price=10&max_price=100")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)

    def test_price_range_excludes_product(self):
        response = self.client.get("/api/v1/products/?max_price=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 0)

    def test_soft_deleted_excluded_from_listing(self):
        self.product.soft_delete()
        response = self.client.get("/api/v1/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 0)


class ProductDetailViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = make_category()
        self.product = make_product(self.category)

    def test_get_product_detail(self):
        response = self.client.get(f"/api/v1/products/{self.product.slug}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("variants", response.data)
        self.assertIn("images", response.data)

    def test_unknown_slug_returns_404(self):
        response = self.client.get("/api/v1/products/does-not-exist/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ProductCreateViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.category = make_category()

    def test_admin_can_create_product(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "New Gadget",
            "description": {
                "summary": {"text": "A cool gadget", "priority": 1},
                "lists": [{"title": "Features", "items": ["Wireless", "Fast charging"], "priority": 2}],
            },
            "base_price": "149.99",
            "category": self.category.pk,
            "status": True,
        }
        response = self.client.post("/api/v1/products/create/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Product.all_objects.filter(name="New Gadget").exists())
        product = Product.all_objects.get(name="New Gadget")
        self.assertEqual(product.description["summary"]["text"], "A cool gadget")

    def test_anonymous_cannot_create_product(self):
        payload = {"name": "Hack", "base_price": "1.00", "category": self.category.pk}
        response = self.client.post("/api/v1/products/create/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProductDescriptionValidatorTests(TestCase):
    def setUp(self):
        self.category = make_category()

    def test_valid_structured_description(self):
        desc = {
            "summary": {"text": "Ultra-light laptop", "priority": 1},
            "details": {"processor": "M3", "ram": "16GB", "priority": 2},
            "lists": [{"title": "In the Box", "items": ["Laptop", "Charger"], "priority": 3}],
            "labels": [{"label": "Condition", "value": "New", "priority": 4}],
            "tables": [{"title": "Dimensions", "headers": ["Height", "Width"], "rows": [["15mm", "300mm"]], "priority": 5}],
        }
        product = Product.all_objects.create(
            name="Pro Laptop",
            category=self.category,
            base_price=Decimal("1299.99"),
            description=desc,
        )
        product.full_clean()
        self.assertEqual(product.description["summary"]["priority"], 1)

    def test_empty_description_allowed(self):
        product = Product.all_objects.create(
            name="Simple Item",
            category=self.category,
            base_price=Decimal("9.99"),
            description={},
        )
        product.full_clean()

    def test_invalid_description_type_raises_error(self):
        from django.core.exceptions import ValidationError
        product = Product(
            name="Invalid Desc Item",
            category=self.category,
            base_price=Decimal("10.00"),
            description="plain string not allowed",
        )
        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_invalid_priority_raises_error(self):
        from django.core.exceptions import ValidationError
        desc = {
            "summary": {"text": "Bad priority", "priority": "high"},
        }
        product = Product(
            name="Bad Priority Item",
            category=self.category,
            base_price=Decimal("10.00"),
            description=desc,
        )
        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_invalid_table_structure_raises_error(self):
        from django.core.exceptions import ValidationError
        desc = {
            "tables": [{"title": "Bad Table", "headers": "not-a-list", "rows": [["1", "2"]]}],
        }
        product = Product(
            name="Bad Table Item",
            category=self.category,
            base_price=Decimal("10.00"),
            description=desc,
        )
        with self.assertRaises(ValidationError):
            product.full_clean()


class ProductImageNestedOperationsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.category = make_category()
        self.product = make_product(self.category)

    def test_create_product_with_images_and_primary_selection(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Camera X",
            "base_price": "599.99",
            "category": self.category.pk,
            "images": [
                {"image_url": "https://example.com/cam1.jpg", "is_primary": False},
                {"image_url": "https://example.com/cam2.jpg", "is_primary": True},
            ],
        }
        response = self.client.post("/api/v1/products/create/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["images"]), 2)

        created_prod = Product.all_objects.get(name="Camera X")
        primary_img = created_prod.images.get(is_primary=True)
        self.assertEqual(primary_img.image_url, "https://example.com/cam2.jpg")

    def test_create_product_auto_defaults_first_image_to_primary(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Phone Y",
            "base_price": "399.99",
            "category": self.category.pk,
            "images": [
                {"image_url": "https://example.com/phone1.jpg", "is_primary": False},
                {"image_url": "https://example.com/phone2.jpg", "is_primary": False},
            ],
        }
        response = self.client.post("/api/v1/products/create/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        created_prod = Product.all_objects.get(name="Phone Y")
        self.assertEqual(created_prod.images.filter(is_primary=True).count(), 1)
        self.assertEqual(created_prod.images.get(is_primary=True).image_url, "https://example.com/phone1.jpg")

    def test_update_product_add_image_and_make_default(self):
        from .models import ProductImage
        self.client.force_authenticate(user=self.admin)
        img1 = ProductImage.all_objects.create(
            product=self.product, image_url="https://example.com/old_primary.jpg", is_primary=True
        )

        update_payload = {
            "images": [
                {"id": img1.id, "image_url": img1.image_url, "is_primary": False},
                {"image_url": "https://example.com/new_default.jpg", "is_primary": True},
            ]
        }
        response = self.client.patch(
            f"/api/v1/products/{self.product.slug}/update/",
            update_payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        img1.refresh_from_db()
        self.assertFalse(img1.is_primary)

        new_img = self.product.images.get(image_url="https://example.com/new_default.jpg")
        self.assertTrue(new_img.is_primary)

    def test_update_product_switch_primary_image(self):
        from .models import ProductImage
        self.client.force_authenticate(user=self.admin)
        img1 = ProductImage.all_objects.create(
            product=self.product, image_url="https://example.com/img1.jpg", is_primary=True
        )
        img2 = ProductImage.all_objects.create(
            product=self.product, image_url="https://example.com/img2.jpg", is_primary=False
        )

        update_payload = {
            "images": [
                {"id": img2.id, "is_primary": True},
            ]
        }
        response = self.client.patch(
            f"/api/v1/products/{self.product.slug}/update/",
            update_payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        img1.refresh_from_db()
        img2.refresh_from_db()
        self.assertFalse(img1.is_primary)
        self.assertTrue(img2.is_primary)

    def test_update_product_soft_delete_image(self):
        from .models import ProductImage
        self.client.force_authenticate(user=self.admin)
        img = ProductImage.all_objects.create(
            product=self.product, image_url="https://example.com/delete_me.jpg", is_primary=False
        )

        update_payload = {
            "images": [
                {"id": img.id, "is_deleted": True},
            ]
        }
        response = self.client.patch(
            f"/api/v1/products/{self.product.slug}/update/",
            update_payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        img.refresh_from_db()
        self.assertTrue(img.is_deleted)


class VariantCreateViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.category = make_category()
        self.product = make_product(self.category)
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_add_variant(self):
        response = self.client.post(
            f"/api/v1/products/{self.product.slug}/variants/",
            {"sku": "VAR-001", "price": "79.99", "stock": 20},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_sku_returns_400(self):
        make_variant(self.product, sku="DUP-V01")
        response = self.client.post(
            f"/api/v1/products/{self.product.slug}/variants/",
            {"sku": "DUP-V01", "price": "79.99", "stock": 5},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

