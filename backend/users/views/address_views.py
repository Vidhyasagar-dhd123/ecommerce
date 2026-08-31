from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404

from ..models import Address, Customer
from ..serializers import AddressSerializer

from core.permissions import IsCustomer


class AddressViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing user addresses.
    """

    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    lookup_field = "pk"

    def get_queryset(self):
        customer = get_object_or_404(Customer, user=self.request.user)
        return Address.objects.filter(customer=customer)

    @action(detail=True, methods=["post"], url_path="set-default")
    def set_default(self, request, pk=None):
        """
        Custom action to set an address as the default address.
        """
        address = self.get_object()
        address.is_default = True
        address.save()
        return Response(
            {"status": "default address set"}, status=status.HTTP_200_OK
        )
