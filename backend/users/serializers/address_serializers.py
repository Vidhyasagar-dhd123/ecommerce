import logging

from rest_framework import serializers
from ..models import Address

logger = logging.getLogger(__name__)


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "address_type",
            "name",
            "street",
            "city",
            "state",
            "country",
            "zipcode",
            "landmark",
            "is_default",
        ]
        # optional fields
        extra_kwargs = {
            "name": {"required": False},
            "country": {"required": False},
            "zipcode": {"required": False},
            "landmark": {"required": False},
            "is_default": {"required": False},
        }
        read_only_fields = ["id"]

    def create(self, validated_data):
        customer = self.context["request"].user.customer_profile
        logger.debug("Creating address for customer: %s | data: %s", customer, validated_data)
        return Address.objects.create(customer=customer, **validated_data)
