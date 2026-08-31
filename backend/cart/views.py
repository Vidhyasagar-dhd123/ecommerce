"""
Presentation views for the Cart domain using generic DRF view classes.
"""

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.mixins import DomainErrorMixin
from core.permissions import IsCustomer
from .models import Cart, CartItem
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    AddToCartSerializer,
    UpdateCartItemSerializer,
)
from .services import (
    get_or_create_active_cart,
    add_item_to_cart,
    update_cart_item,
    remove_cart_item,
    clear_cart,
)


class CartView(DomainErrorMixin, generics.RetrieveAPIView):
    """
    GET /api/v1/cart/
    Retrieve the current customer's active shopping cart and its items.
    """

    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_object(self) -> Cart:
        return get_or_create_active_cart(customer=self.request.user.customer_profile)


class CartItemCreateView(DomainErrorMixin, generics.CreateAPIView):
    """
    POST /api/v1/cart/items/
    Add a product variant to the customer's active cart.
    """

    serializer_class = AddToCartSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item = add_item_to_cart(
            customer=request.user.customer_profile,
            variant_id=serializer.validated_data["variant_id"],
            quantity=serializer.validated_data["quantity"],
        )
        return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(DomainErrorMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    GET, PUT, PATCH, DELETE /api/v1/cart/items/<id>/
    Manage a specific item within the customer's active cart.
    Setting quantity=0 or calling DELETE removes the item.
    """

    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return CartItem.objects.filter(
            cart__customer__user=self.request.user,
            cart__is_active=True,
        )

    def update(self, request, *args, **kwargs):
        input_serializer = UpdateCartItemSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        item = update_cart_item(
            customer=request.user.customer_profile,
            cart_item_id=self.kwargs["pk"],
            quantity=input_serializer.validated_data["quantity"],
        )

        if item is None:
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(CartItemSerializer(item).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        remove_cart_item(
            customer=self.request.user.customer_profile,
            cart_item_id=instance.pk,
        )


class ClearCartView(DomainErrorMixin, generics.GenericAPIView):
    """
    POST /api/v1/cart/clear/
    Empty all items from the customer's active shopping cart.
    """

    permission_classes = [IsAuthenticated, IsCustomer]

    def post(self, request, *args, **kwargs):
        clear_cart(customer=request.user.customer_profile)
        return Response(
            {"message": "Cart cleared successfully."},
            status=status.HTTP_200_OK,
        )
