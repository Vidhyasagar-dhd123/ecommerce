from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.mixins import DomainErrorMixin
from users.models import Customer
from wishlist.models import Wishlist
from wishlist.services import (
    get_or_create_wishlist,
    add_to_wishlist,
    remove_from_wishlist,
    clear_wishlist,
)
from wishlist.serializers import (
    WishlistSerializer,
    WishlistItemSerializer,
    AddWishlistItemSerializer,
)


class WishlistView(DomainErrorMixin, generics.RetrieveAPIView):
    """
    Retrieve the authenticated customer's wishlist with all saved products.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = WishlistSerializer

    def get_object(self):
        customer, _ = Customer.objects.get_or_create(user=self.request.user)
        return get_or_create_wishlist(customer=customer)


class WishlistItemAddView(DomainErrorMixin, generics.GenericAPIView):
    """
    Add a product to the authenticated customer's wishlist.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = AddWishlistItemSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer, _ = Customer.objects.get_or_create(user=request.user)
        item = add_to_wishlist(
            customer=customer,
            product_id=serializer.validated_data["product_id"],
        )
        return Response(
            WishlistItemSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )


class WishlistItemRemoveView(DomainErrorMixin, generics.GenericAPIView):
    """
    Remove a product from the authenticated customer's wishlist.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, product_id, *args, **kwargs):
        customer, _ = Customer.objects.get_or_create(user=request.user)
        removed = remove_from_wishlist(customer=customer, product_id=product_id)
        if removed:
            return Response(
                {"message": "Item removed from wishlist."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"message": "Item not found in wishlist."},
            status=status.HTTP_404_NOT_FOUND,
        )


class WishlistClearView(DomainErrorMixin, generics.GenericAPIView):
    """
    Clear all items from the customer's wishlist.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        customer, _ = Customer.objects.get_or_create(user=request.user)
        count = clear_wishlist(customer=customer)
        return Response(
            {"message": f"Wishlist cleared ({count} items removed)."},
            status=status.HTTP_200_OK,
        )
