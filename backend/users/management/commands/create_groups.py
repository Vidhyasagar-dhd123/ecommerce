from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group

GROUP_NAMES = [
    "Customer",
    "ShippingExecutive",
    "InventoryManager",
    "SupportAgent",
    "Admin",
]


class Command(BaseCommand):
    help = "Create default RBAC groups for the application"

    def handle(self, *args, **options):
        for group_name in GROUP_NAMES:
            _, created = Group.objects.get_or_create(name=group_name)
            status = "created" if created else "already exists"
            self.stdout.write(f'  Group "{group_name}" — {status}.')
        self.stdout.write(self.style.SUCCESS("All RBAC groups are ready."))
