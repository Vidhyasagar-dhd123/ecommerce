from rest_framework import serializers

from .models import MyDummy


class MyDummySerializer(serializers.ModelSerializer):
    class Meta:
        model = MyDummy
        fields = ["id", "name", "age", "active"]
        read_only_fields = ["id"]
