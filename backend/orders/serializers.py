"""
Serializers for the Orders domain.
"""

from rest_framework import serializers

from products.serializers import ProductVariantSerializer
from users.serializers import AddressSerializer
from .models import Order, OrderItem, Payment, Invoice, PaymentMethod


class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for order items with price snapshot and variant details.
    """

    variant_details = ProductVariantSerializer(source="variant", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order",
            "variant",
            "variant_details",
            "quantity",
            "unit_price",
            "discount",
            "total_price",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "order",
            "unit_price",
            "discount",
            "total_price",
            "created_at",
            "updated_at",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for order payment records.
    """

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "payment_method",
            "transaction_id",
            "amount",
            "payment_status",
            "paid_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "order", "amount", "created_at", "updated_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    """
    Serializer for official invoice records.
    """

    class Meta:
        model = Invoice
        fields = [
            "id",
            "order",
            "invoice_number",
            "invoice_date",
            "sub_total",
            "discount",
            "tax_amount",
            "shipping_charge",
            "grand_total",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "order",
            "invoice_number",
            "invoice_date",
            "sub_total",
            "discount",
            "tax_amount",
            "shipping_charge",
            "grand_total",
            "created_at",
            "updated_at",
        ]


class OrderListSerializer(serializers.ModelSerializer):
    """
    Compact serializer for order list views.
    """

    items_count = serializers.IntegerField(source="items.count", read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    locked_by_warehouse_name = serializers.CharField(
        source="locked_by_warehouse.name", read_only=True, default=None
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "order_date",
            "total_amount",
            "items_count",
            "can_cancel",
            "locked_by_warehouse",
            "locked_by_warehouse_name",
            "is_locked",
            "locked_at",
            "created_at",
        ]
        read_only_fields = fields


class OrderDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for full order view including items, address, payment, and invoice.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    address_details = AddressSerializer(source="address", read_only=True)
    payment = PaymentSerializer(read_only=True)
    invoice = InvoiceSerializer(read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    locked_by_warehouse_name = serializers.CharField(
        source="locked_by_warehouse.name", read_only=True, default=None
    )
    locked_by_username = serializers.CharField(
        source="locked_by.username", read_only=True, default=None
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "customer",
            "address",
            "address_details",
            "status",
            "order_date",
            "total_amount",
            "coupon_code",
            "locked_by_warehouse",
            "locked_by_warehouse_name",
            "locked_by",
            "locked_by_username",
            "locked_at",
            "is_locked",
            "items",
            "payment",
            "invoice",
            "can_cancel",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields



class CreateOrderSerializer(serializers.Serializer):
    """
    Input serializer for converting an active cart into a placed order.
    """

    address_id = serializers.IntegerField(required=True)
    payment_method = serializers.ChoiceField(
        choices=PaymentMethod.choices,
        default=PaymentMethod.COD,
    )
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
