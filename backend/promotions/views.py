from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.mixins import DomainErrorMixin
from core.permissions import IsAdminUser
from cart.services import get_or_create_active_cart
from users.models import Customer
from promotions.models import Offer, Coupon
from promotions.services import create_offer, apply_offer_to_product, validate_coupon
from promotions.serializers import (
    OfferSerializer,
    OfferCreateSerializer,
    HasActiveOfferSerializer,
    ApplyOfferSerializer,
    CouponSerializer,
    CouponValidateSerializer,
)


class OfferListView(DomainErrorMixin, generics.ListAPIView):
    """
    Public listing of all currently active offers.
    """

    permission_classes = [AllowAny]
    serializer_class = OfferSerializer
    queryset = Offer.objects.filter(status=True)


class OfferCreateView(DomainErrorMixin, generics.CreateAPIView):
    """
    Admin endpoint to create a new promotional offer.
    """

    permission_classes = [IsAdminUser]
    serializer_class = OfferCreateSerializer

    def perform_create(self, serializer):
        offer = create_offer(
            title=serializer.validated_data["title"],
            discount_type=serializer.validated_data["discount_type"],
            discount_value=serializer.validated_data["discount_value"],
            start_date=serializer.validated_data["start_date"],
            end_date=serializer.validated_data["end_date"],
            description=serializer.validated_data.get("description", ""),
            status=serializer.validated_data.get("status", True),
            created_by=self.request.user,
        )
        serializer.instance = offer


class ApplyOfferView(DomainErrorMixin, generics.GenericAPIView):
    """
    Admin endpoint to attach an existing offer to a product.
    """

    permission_classes = [IsAdminUser]
    serializer_class = ApplyOfferSerializer

    def post(self, request, pk, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        active_offer = apply_offer_to_product(
            offer_id=pk,
            product_id=serializer.validated_data["product_id"],
            applied_by=request.user,
        )
        return Response(
            HasActiveOfferSerializer(active_offer).data,
            status=status.HTTP_201_CREATED,
        )


class CouponValidateView(DomainErrorMixin, generics.GenericAPIView):
    """
    Customer endpoint to validate a coupon code against their active cart.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = CouponValidateSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer, _ = Customer.objects.get_or_create(user=request.user)
        cart = get_or_create_active_cart(customer=customer)

        coupon = validate_coupon(
            code=serializer.validated_data["code"],
            cart=cart,
        )
        return Response(
            {
                "coupon": CouponSerializer(coupon).data,
                "message": f"Coupon '{coupon.code}' is valid.",
            },
            status=status.HTTP_200_OK,
        )
