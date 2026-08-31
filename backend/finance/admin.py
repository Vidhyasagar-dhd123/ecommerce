from django.contrib import admin
from finance.models import Dues


@admin.register(Dues)
class DuesAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "amount", "due_date", "status", "created_at"]
    list_filter = ["status", "due_date"]
    search_fields = ["customer__user__username", "customer__user__email"]
