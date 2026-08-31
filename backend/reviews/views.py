from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.mixins import DomainErrorMixin
from users.models import Customer
from reviews.models import Review
from reviews.services import submit_review
from reviews.serializers import ReviewSerializer, SubmitReviewSerializer


class ProductReviewListView(DomainErrorMixin, generics.ListAPIView):
    """
    Public listing of customer reviews for a given product.
    """

    permission_classes = [AllowAny]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        product_id = self.kwargs["product_id"]
        return Review.objects.filter(product_id=product_id).select_related("customer__user", "product")


class SubmitReviewView(DomainErrorMixin, generics.GenericAPIView):
    """
    Customer endpoint to submit a verified purchase review.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = SubmitReviewSerializer

    def post(self, request, product_id, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer = Customer.objects.get(user=request.user)
        review = submit_review(
            customer=customer,
            product_id=product_id,
            rating=serializer.validated_data["rating"],
            comment=serializer.validated_data.get("comment", ""),
        )
        return Response(
            ReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )
