from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.views import APIView

from .models import MyDummy
from .serializers import MyDummySerializer


@api_view(["GET"])
def hello(request):
    return Response({
        "message": "Hello from Django REST Framework"
    })



class DummyAPIView(APIView):
    def get(self, request):
        queryset = MyDummy.objects.live()
        serializer = MyDummySerializer(queryset, many=True)

        return Response({
            "message": "Dummy rows loaded through manager -> queryset -> serializer",
            "count": len(serializer.data),
            "results": serializer.data,
        })

    def post(self, request):
        serializer = MyDummySerializer(data=request.data)

        if serializer.is_valid():
            instance = serializer.save()
            response_serializer = MyDummySerializer(instance)

            return Response({
                "message": "Dummy row created successfully",
                "data": response_serializer.data,
            }, status=status.HTTP_201_CREATED)

        return Response({
            "message": "Validation failed",
            "errors": serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)