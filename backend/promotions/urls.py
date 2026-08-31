from django.urls import path
from promotions.views import (
    OfferListView,
    OfferCreateView,
    ApplyOfferView,
    CouponValidateView,
)

app_name = "promotions"

urlpatterns = [
    path("offers/", OfferListView.as_view(), name="offer-list"),
    path("offers/create/", OfferCreateView.as_view(), name="offer-create"),
    path("offers/<int:pk>/apply/", ApplyOfferView.as_view(), name="offer-apply"),
    path("coupons/validate/", CouponValidateView.as_view(), name="coupon-validate"),
]
