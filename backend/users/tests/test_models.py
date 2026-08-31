from django.test import TestCase

from ..models import Address, AddressType, Customer, User

class AddressDefaultTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username="address-test", email="address-test@example.com", password="test-password", first_name="Address", last_name="Test", phone="1234567890"
		)
		self.customer = Customer.objects.create(user=self.user)

	def make_address(self, address_type, *, is_default=False):
		return Address.objects.create(
			customer=self.customer,
			address_type=address_type,
			name="Test Address",
			street="1 Test Street",
			city="Test City",
			state="Test State",
			country="Test Country",
			zipcode="12345",
			is_default=is_default,
		)

	def test_default_is_unique_per_address_type(self):
		billing = self.make_address(AddressType.BILLING, is_default=True)
		shipping = self.make_address(AddressType.SHIPPING, is_default=True)

		self.assertTrue(billing.is_default)
		self.assertTrue(shipping.is_default)

	def test_saving_default_clears_previous_default_of_same_type(self):
		previous = self.make_address(AddressType.SHIPPING, is_default=True)
		replacement = self.make_address(AddressType.SHIPPING, is_default=True)

		previous.refresh_from_db()
		replacement.refresh_from_db()

		self.assertFalse(previous.is_default)
		self.assertTrue(replacement.is_default)

class UserModelTests(TestCase):
    def test_user_creation(self):
        user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="testpassword",
			first_name="John",
			last_name="Doe",
			phone="4789809832"
        )
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.email, "testuser@example.com")
        self.assertTrue(user.check_password("testpassword"))
        self.assertEqual(user.role,'customer')