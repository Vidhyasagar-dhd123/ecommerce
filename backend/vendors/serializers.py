"""
Serializers for the Vendors domain.

Uses ModelSerializer generics for standard CRUD and custom Serializers for
nested write operations (creating POs/Imports with line items).
"""

from decimal import Decimal
from rest_framework import serializers
from .models import Vendor, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Import, ImportItem


class VendorSerializer(serializers.ModelSerializer):
    """Full vendor serializer — read and write."""

    class Meta:
        model = Vendor
        fields = [
            "id",
            "name",
            "contact_person",
            "phone",
            "email",
            "address",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ─── Purchase Orders ───────────────────────────────────────────────────────────

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Nested serializer for line items within a purchase order."""

    variant_sku = serializers.CharField(source="variant.sku", read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "variant", "variant_sku", "quantity", "unit_cost", "total_cost"]
        read_only_fields = ["id", "variant_sku", "total_cost"]


class PurchaseOrderItemCreateSerializer(serializers.Serializer):
    """Input serializer for a single PO line item."""

    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2)


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Full PO serializer including nested items."""

    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    items = PurchaseOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "vendor",
            "vendor_name",
            "po_date",
            "status",
            "total_amount",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "vendor_name", "po_date", "total_amount", "created_at", "updated_at"]


class PurchaseOrderCreateSerializer(serializers.Serializer):
    """Input serializer for creating a PurchaseOrder with line items."""

    vendor_id = serializers.IntegerField()
    items = PurchaseOrderItemCreateSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value


class PurchaseOrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Admin: update PO status only."""

    class Meta:
        model = PurchaseOrder
        fields = ["status"]

    def validate_status(self, value):
        valid_transitions = {
            PurchaseOrderStatus.DRAFT: [PurchaseOrderStatus.SENT, PurchaseOrderStatus.CANCELLED],
            PurchaseOrderStatus.SENT: [PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.CANCELLED],
            PurchaseOrderStatus.CONFIRMED: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
        }
        current = self.instance.status if self.instance else None
        allowed = valid_transitions.get(current, [])
        if value not in allowed:
            raise serializers.ValidationError(
                f"Cannot transition from '{current}' to '{value}'."
            )
        return value


# ─── Imports ──────────────────────────────────────────────────────────────────

class ImportItemSerializer(serializers.ModelSerializer):
    """Nested serializer for import line items."""

    variant_sku = serializers.CharField(source="variant.sku", read_only=True)

    class Meta:
        model = ImportItem
        fields = ["id", "variant", "variant_sku", "quantity", "unit_cost", "total_cost"]
        read_only_fields = ["id", "variant_sku", "total_cost"]


class ImportItemCreateSerializer(serializers.Serializer):
    """Input for a single import line item."""

    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2)


class ImportSerializer(serializers.ModelSerializer):
    """Full import record serializer including nested items."""

    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    items = ImportItemSerializer(many=True, read_only=True)

    class Meta:
        model = Import
        fields = [
            "id",
            "vendor",
            "vendor_name",
            "warehouse",
            "warehouse_name",
            "import_date",
            "status",
            "total_amount",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "vendor_name", "warehouse_name",
            "total_amount", "created_at", "updated_at",
        ]


class ImportCreateSerializer(serializers.Serializer):
    """Input serializer for creating an Import with line items."""

    vendor_id = serializers.IntegerField()
    warehouse_id = serializers.IntegerField(required=False, allow_null=True)
    import_date = serializers.DateField(required=False, allow_null=True)
    items = ImportItemCreateSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value
