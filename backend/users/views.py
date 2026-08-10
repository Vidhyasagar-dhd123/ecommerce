from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer

class RegisterView(APIView):
    """
    API view for user registration.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            serializer.data['message'] = 'User registered successfully.'
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    API view for user logout.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")

            if not refresh_token:
                return Response({"message":"Refresh Token Required"}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({"meassage":"User logged out successfully"}, status=status.HTTP_205_RESET_CONTENT)
        
        except Exception as e:
            return Response({'message': 'User logged out successfully.'}, status=status.HTTP_400_BAD_REQUEST)