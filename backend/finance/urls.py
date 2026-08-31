from django.urls import path
from finance.views import (
    DuesListView,
    DuesSummaryView,
    DuesCreateView,
    DuesPayView,
    DuesDetailView,
)

app_name = "finance"

urlpatterns = [
    path("dues/", DuesListView.as_view(), name="dues-list"),
    path("dues/summary/", DuesSummaryView.as_view(), name="dues-summary"),
    path("dues/create/", DuesCreateView.as_view(), name="dues-create"),
    path("dues/<int:pk>/pay/", DuesPayView.as_view(), name="dues-pay"),
    path("dues/<int:pk>/", DuesDetailView.as_view(), name="dues-detail"),
]

