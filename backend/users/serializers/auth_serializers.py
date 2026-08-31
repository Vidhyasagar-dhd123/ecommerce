from rest_framework import serializers
from django.contrib.auth import get_user_model


from ..services import register_user

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """

    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ("username", "email", "password", "password_confirm")

    def validate(self, data):
        """
        Validate that the two password fields match.
        """
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        user = register_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user information.
    """

    class Meta:
        model = User
        fields = ("username", "email")
        extra_kwargs = {
            "username": {"required": False},
            "email": {"required": False},
        }


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        if user.role == "employee" or hasattr(user, "employee_profile"):
            role = "employee"
        elif user.is_superuser or user.role == "admin":
            role = "admin"
        else:
            role = user.role

        token["role"] = role
        token["username"] = user.username
        token["email"] = user.email

        if role == "employee":
            try:
                emp = user.employee_profile
                token["designation"] = emp.designation
                token["warehouse_id"] = emp.warehouse_id
            except Exception:
                pass
        return token


