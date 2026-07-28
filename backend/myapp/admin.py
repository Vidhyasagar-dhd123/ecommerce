from django.contrib import admin

from .models import MyDummy

@admin.register(MyDummy)
class MyDummyAdmin(admin.ModelAdmin):
	list_display = ("id", "name", "age", "active")
	list_filter = ("active",)
	search_fields = ("name",)
