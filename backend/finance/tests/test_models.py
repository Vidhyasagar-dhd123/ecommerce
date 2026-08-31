from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from users.models import Customer
from finance.models import Dues, DuesStatus

User = get_user_model()


class FinanceModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="financeuser", email="fin@test.com", password="password123"
        )
        self.customer = Customer.objects.create(user=self.user)

    def test_dues_str_and_creation(self):
        due = Dues.objects.create(
            customer=self.customer,
            amount=Decimal("150.00"),
            due_date=date.today() + timedelta(days=7),
            status=DuesStatus.PENDING,
        )
        self.assertIn("150.00", str(due))
        self.assertIn("pending", str(due))
