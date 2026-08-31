"""
Serializers for the Inventory domain.

Follows the generic ModelSerializer pattern with explicit read_only_fields
to avoid boilerplate. All write operations go through services, not save().
"""

from rest_framework import serializers
from .models import Warehouse, Inventory, StockTransaction, StockTransactionType


class WarehouseSerializer(serializers.ModelSerializer):
    """Full warehouse serializer — used for list and detail views."""

    class Meta:
        model = Warehouse
        fields = [
            "id",
            "name",
            "location",
            "contact_number",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InventorySerializer(serializers.ModelSerializer):
    """
    Read-only serializer for viewing inventory levels.
    Includes denormalized human-readable names for warehouse and variant.
    """

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    needs_reorder = serializers.BooleanField(read_only=True)

    class Meta:
        model = Inventory
        fields = [
            "id",
            "warehouse",
            "warehouse_name",
            "variant",
            "variant_sku",
            "stock",
            "reserved_stock",
            "available_stock",
            "reorder_level",
            "needs_reorder",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "warehouse_name",
            "variant_sku",
            "available_stock",
            "needs_reorder",
            "updated_at",
        ]


class StockAdjustSerializer(serializers.Serializer):
    """
    Input serializer for the stock adjustment endpoint.
    Services validate business rules; this only validates field types/presence.
    """

    inventory_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(
        required=True,
        help_text="Positive to add stock, negative to remove.",
    )
    transaction_type = serializers.ChoiceField(
        choices=StockTransactionType.choices,
        required=True,
    )
    reference_id = serializers.CharField(max_length=100, required=False, default="")
    notes = serializers.CharField(required=False, default="")

    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError("Quantity cannot be zero.")
        return value


class StockTransactionSerializer(serializers.ModelSerializer):
    """Read-only serializer for the stock transaction audit log."""

    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    warehouse_name = serializers.CharField(
        source="inventory.warehouse.name", read_only=True
    )
    performed_by = serializers.CharField(
        source="employee.username", read_only=True, default=None
    )

    class Meta:
        model = StockTransaction
        fields = [
            "id",
            "variant",
            "variant_sku",
            "warehouse_name",
            "type",
            "quantity",
            "transaction_date",
            "reference_id",
            "notes",
            "performed_by",
            "created_at",
        ]
        read_only_fields = fields  # Transactions are immutable — read-only
