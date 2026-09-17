"""
Serializers for the Orders domain.
"""

from rest_framework import serializers

from products.serializers import ProductVariantSerializer
from users.serializers import AddressSerializer
from .models import Order, OrderItem, Payment, Invoice, PaymentMethod


class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for order items with price snapshot, variant details, and product metadata.
    """

    variant_details = ProductVariantSerializer(source="variant", read_only=True)
    product_name = serializers.CharField(
        source="variant.product.name", read_only=True, default="Product"
    )
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order",
            "variant",
            "variant_details",
            "product_name",
            "product_image",
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

    def get_product_image(self, obj) -> str | None:
        if obj.variant and obj.variant.product:
            img = obj.variant.product.images.filter(is_primary=True).first() or obj.variant.product.images.first()
            return img.image_url if img else None
        return None


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
    Compact serializer for order list views with staff indicators.
    """

    items_count = serializers.IntegerField(source="items.count", read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    locked_by_warehouse_name = serializers.CharField(
        source="locked_by_warehouse.name", read_only=True, default=None
    )
    customer_username = serializers.CharField(
        source="customer.user.username", read_only=True, default=None
    )
    customer_email = serializers.CharField(
        source="customer.user.email", read_only=True, default=None
    )
    customer_id = serializers.IntegerField(source="customer.id", read_only=True)
    address_details = AddressSerializer(source="address", read_only=True)
    has_dues = serializers.SerializerMethodField()
    dues_amount = serializers.SerializerMethodField()
    warehouse_availability = serializers.SerializerMethodField()
    can_reopen = serializers.SerializerMethodField()
    shipment = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "customer_id",
            "customer_username",
            "customer_email",
            "status",
            "order_date",
            "total_amount",
            "coupon_code",
            "items_count",
            "can_cancel",
            "can_reopen",
            "locked_by_warehouse",
            "locked_by_warehouse_name",
            "is_locked",
            "locked_at",
            "address_details",
            "has_dues",
            "dues_amount",
            "warehouse_availability",
            "shipment",
            "created_at",
        ]
        read_only_fields = fields

    def get_shipment(self, obj) -> dict | None:
        try:
            if hasattr(obj, "shipment") and obj.shipment:
                from fulfillment.serializers import ShipmentSerializer
                return ShipmentSerializer(obj.shipment).data
        except Exception:
            pass
        return None

    def get_can_reopen(self, obj) -> bool:
        if obj.status != "cancelled":
            return False
        if obj.updated_by and hasattr(obj, "customer") and hasattr(obj.customer, "user"):
            if obj.updated_by_id == obj.customer.user_id:
                return False
        return True

    def get_has_dues(self, obj) -> bool:
        from finance.models import Dues
        return Dues.objects.filter(customer=obj.customer, status="pending").exists()

    def get_dues_amount(self, obj) -> str:
        from finance.models import Dues
        from django.db.models import Sum
        total = Dues.objects.filter(customer=obj.customer, status="pending").aggregate(Sum("amount"))["amount__sum"]
        return str(total or "0.00")

    def get_warehouse_availability(self, obj) -> dict:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return {"all_available": True, "warehouse_id": None, "details": []}

        profile = getattr(user, "employee_profile", None)
        wh = getattr(profile, "warehouse", None) if profile else None
        if not wh:
            return {"all_available": True, "warehouse_id": None, "warehouse_name": None, "details": []}

        from inventory.models import Inventory
        details = []
        all_available = True
        for item in obj.items.all():
            inv = Inventory.objects.filter(warehouse=wh, variant_id=item.variant_id).first()
            avail_stock = inv.available_stock if inv else 0
            is_item_available = avail_stock >= item.quantity
            if not is_item_available:
                all_available = False
            details.append({
                "variant_id": item.variant_id,
                "product_name": getattr(item.variant.product, "name", "Product") if hasattr(item, "variant") and item.variant else "Product",
                "required": item.quantity,
                "available": avail_stock,
                "is_sufficient": is_item_available,
            })
        return {
            "all_available": all_available,
            "warehouse_id": wh.id,
            "warehouse_name": wh.name,
            "details": details,
        }


class OrderDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for full order view including items, address, payment, and invoice.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    address_details = AddressSerializer(source="address", read_only=True)
    payment = PaymentSerializer(read_only=True)
    invoice = InvoiceSerializer(read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    can_reopen = serializers.SerializerMethodField()
    locked_by_warehouse_name = serializers.CharField(
        source="locked_by_warehouse.name", read_only=True, default=None
    )
    locked_by_username = serializers.CharField(
        source="locked_by.username", read_only=True, default=None
    )
    updated_by_username = serializers.CharField(
        source="updated_by.username", read_only=True, default=None
    )
    customer_username = serializers.CharField(
        source="customer.user.username", read_only=True, default=None
    )
    customer_email = serializers.CharField(
        source="customer.user.email", read_only=True, default=None
    )
    has_dues = serializers.SerializerMethodField()
    dues_amount = serializers.SerializerMethodField()
    warehouse_availability = serializers.SerializerMethodField()
    shipment = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "customer",
            "customer_username",
            "customer_email",
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
            "updated_by_username",
            "locked_at",
            "is_locked",
            "items",
            "payment",
            "invoice",
            "shipment",
            "has_dues",
            "dues_amount",
            "warehouse_availability",
            "can_cancel",
            "can_reopen",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_shipment(self, obj) -> dict | None:
        try:
            if hasattr(obj, "shipment") and obj.shipment:
                from fulfillment.serializers import ShipmentSerializer
                return ShipmentSerializer(obj.shipment).data
        except Exception:
            pass
        return None

    def get_can_reopen(self, obj) -> bool:
        if obj.status != "cancelled":
            return False
        if obj.updated_by and hasattr(obj, "customer") and hasattr(obj.customer, "user"):
            if obj.updated_by_id == obj.customer.user_id:
                return False
        return True

    def get_has_dues(self, obj) -> bool:
        from finance.models import Dues
        return Dues.objects.filter(customer=obj.customer, status="pending").exists()

    def get_dues_amount(self, obj) -> str:
        from finance.models import Dues
        from django.db.models import Sum
        total = Dues.objects.filter(customer=obj.customer, status="pending").aggregate(Sum("amount"))["amount__sum"]
        return str(total or "0.00")

    def get_warehouse_availability(self, obj) -> dict:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return {"all_available": True, "warehouse_id": None, "details": []}

        profile = getattr(user, "employee_profile", None)
        wh = getattr(profile, "warehouse", None) if profile else None
        if not wh:
            return {"all_available": True, "warehouse_id": None, "warehouse_name": None, "details": []}

        from inventory.models import Inventory
        details = []
        all_available = True
        for item in obj.items.all():
            inv = Inventory.objects.filter(warehouse=wh, variant_id=item.variant_id).first()
            avail_stock = inv.available_stock if inv else 0
            is_item_available = avail_stock >= item.quantity
            if not is_item_available:
                all_available = False
            details.append({
                "variant_id": item.variant_id,
                "product_name": getattr(item.variant.product, "name", "Product") if hasattr(item, "variant") and item.variant else "Product",
                "required": item.quantity,
                "available": avail_stock,
                "is_sufficient": is_item_available,
            })
        return {
            "all_available": all_available,
            "warehouse_id": wh.id,
            "warehouse_name": wh.name,
            "details": details,
        }



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
