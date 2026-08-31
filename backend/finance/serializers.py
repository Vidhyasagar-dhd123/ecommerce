from rest_framework import serializers
from finance.models import Dues


class DuesSerializer(serializers.ModelSerializer):
    """
    Serializer for customer dues records.
    Hides warehouse internal information for customers; exposes warehouse for staff/admin.
    """

    customer_username = serializers.CharField(source="customer.user.username", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)

    class Meta:
        model = Dues
        fields = [
            "id",
            "customer",
            "customer_username",
            "warehouse",
            "warehouse_name",
            "amount",
            "due_date",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "customer", "customer_username", "warehouse", "warehouse_name", "created_at", "updated_at"]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        # If the requesting user is a customer, omit all warehouse details
        if request and request.user and getattr(request.user, "is_authenticated", False):
            if request.user.is_customer and not (request.user.is_admin_user or request.user.is_employee):
                ret.pop("warehouse", None)
                ret.pop("warehouse_name", None)
        return ret


class CreateDuesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dues
        fields = [
            "id",
            "customer",
            "warehouse",
            "amount",
            "due_date",
            "status",
        ]
        read_only_fields = ["id"]


class DuesSummarySerializer(serializers.Serializer):
    customer_id = serializers.IntegerField()
    total_due = serializers.DecimalField(max_digits=14, decimal_places=2)
    pending_dues_count = serializers.IntegerField()
    overdue_dues_count = serializers.IntegerField()

