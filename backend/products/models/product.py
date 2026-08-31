from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify
from core.models import BaseModel
from products.managers import ProductManager


def validate_document_structure(value):
    """
    Ensures the JSON follows the required document structure with priority levels.
    Stores lists, labels, details, summary, and table data.

    Supported formats:
    - Empty dict ({}) or None: valid default.
    - Dict with structures such as 'summary', 'details', 'lists', 'labels', 'tables', 'sections':
      - 'summary': string or dict with {'text': str, 'priority': int}
      - 'details': dict or list with optional 'priority' (int)
      - 'lists': list of items or list of dicts [{'title': str, 'items': list, 'priority': int}]
      - 'labels': dict/list of tags/labels with optional 'priority' (int)
      - 'tables': list of dicts [{'title': str, 'headers': list, 'rows': list, 'priority': int}] or table dict
      - Any custom section / block with optional 'priority' (int)
    """
    if value is None or value == {}:
        return

    if not isinstance(value, dict):
        raise ValidationError("Description must be a JSON object (dictionary).")

    for key, content in value.items():
        if isinstance(content, dict):
            priority = content.get("priority")
            if priority is not None and not isinstance(priority, int):
                raise ValidationError(f"Priority for '{key}' must be an integer.")

            if key == "tables":
                headers = content.get("headers")
                rows = content.get("rows")
                if headers is not None and not isinstance(headers, list):
                    raise ValidationError("Table 'headers' must be a list.")
                if rows is not None and not isinstance(rows, list):
                    raise ValidationError("Table 'rows' must be a list.")

        elif isinstance(content, list):
            for idx, item in enumerate(content):
                if isinstance(item, dict):
                    priority = item.get("priority")
                    if priority is not None and not isinstance(priority, int):
                        raise ValidationError(f"Priority for item at index {idx} in '{key}' must be an integer.")
                    if key == "tables":
                        headers = item.get("headers")
                        rows = item.get("rows")
                        if headers is not None and not isinstance(headers, list):
                            raise ValidationError(f"Table 'headers' at index {idx} must be a list.")
                        if rows is not None and not isinstance(rows, list):
                            raise ValidationError(f"Table 'rows' at index {idx} must be a list.")
                    elif key == "lists":
                        items = item.get("items")
                        if items is not None and not isinstance(items, list):
                            raise ValidationError(f"List 'items' at index {idx} must be a list.")
        elif isinstance(content, (str, int, float, bool)):
            # simple scalar section e.g. "summary": "Short description"
            pass
        else:
            raise ValidationError(f"Invalid format for '{key}'. Expected dict, list, or text.")


class Product(BaseModel):
    category = models.ForeignKey(
        "products.Category",
        on_delete=models.PROTECT,
        related_name="products",
    )
    brand = models.ForeignKey(
        "products.Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.JSONField(
        default=dict,
        blank=True,
        validators=[validate_document_structure],
        help_text="Stores lists, labels, details, summary, and table data."
    )
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.BooleanField(default=True)

    objects = ProductManager()          # active + not soft-deleted
    all_objects = models.Manager()      # admin use: includes inactive/deleted

    class Meta(BaseModel.Meta):
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["status", "category"]),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

