"""
Serializers for the Fulfillment domain.
"""

from rest_framework import serializers

from inventory.models import Warehouse
from inventory.serializers import WarehouseSerializer
from .models import Shipment, Return, Exchange, Refund



class ShipmentSerializer(serializers.ModelSerializer):
    """
    Serializer for order shipments.
    """

    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)

    class Meta:
        model = Shipment
        fields = [
            "id",
            "order",
            "warehouse",
            "warehouse_name",
            "tracking_number",
            "carrier",
            "ship_date",
            "delivery_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DispatchSerializer(serializers.Serializer):
    """
    Input validation serializer for dispatching an order.
    """

    order_id = serializers.IntegerField(required=True)
    warehouse_id = serializers.IntegerField(required=True)
    tracking_number = serializers.CharField(max_length=100, required=True)
    carrier = serializers.CharField(max_length=100, required=True)
    ship_date = serializers.DateField(required=False)


class MarkDeliveredSerializer(serializers.Serializer):
    """
    Input serializer for recording delivery date.
    """

    delivery_date = serializers.DateField(required=False)


class ReturnSerializer(serializers.ModelSerializer):
    """
    Serializer for order return requests.
    """

    class Meta:
        model = Return
        fields = [
            "id",
            "order",
            "return_date",
            "reason",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "return_date", "status", "created_at", "updated_at"]


class ReturnCreateSerializer(serializers.Serializer):
    """
    Input validation serializer for requesting an order return.
    """

    order_id = serializers.IntegerField(required=True)
    reason = serializers.CharField(required=True)


class ExchangeSerializer(serializers.ModelSerializer):
    """
    Serializer for exchange requests.
    """

    class Meta:
        model = Exchange
        fields = [
            "id",
            "order",
            "contact_person",
            "reason",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RefundSerializer(serializers.ModelSerializer):
    """
    Serializer for refunds.
    """

    class Meta:
        model = Refund
        fields = [
            "id",
            "payment",
            "amount",
            "reason",
            "status",
            "refunded_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "refunded_at", "created_at", "updated_at"]


class RefundCreateSerializer(serializers.Serializer):
    """
    Input validation serializer for processing a refund.
    """

    return_id = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=True)
    reason = serializers.CharField(required=True)
