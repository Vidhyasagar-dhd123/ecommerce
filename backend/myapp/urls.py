from django.urls import path

from .views import DummyAPIView, hello

urlpatterns = [
    path("hello/", hello),
    path("dummy/", DummyAPIView.as_view()),
]