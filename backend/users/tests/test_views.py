from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from ..models import User, Customer, Employee, Address, AddressType
from ..models.profile import Designation
from ..services import register_user, register_employee, AlreadyEmployeeError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_customer(username="customer1", email="customer1@example.com", password="pass1234"):
    return register_user(username=username, email=email, password=password)


def make_admin(username="admin1", email="admin1@example.com", password="pass1234"):
    user = User.objects.create_user(
        username=username, email=email, password=password,
        first_name="Admin", last_name="User",
    )
    user.role = "admin"
    user.save(update_fields=["role"])
    return user


# ---------------------------------------------------------------------------
# services.py
# ---------------------------------------------------------------------------

class RegisterUserServiceTests(TestCase):
    def test_creates_user_and_customer_profile(self):
        user = register_user(username="svc1", email="svc1@example.com", password="pass1234")
        self.assertEqual(user.role, "customer")
        self.assertTrue(Customer.objects.filter(user=user).exists())

    def test_duplicate_username_raises(self):
        register_user(username="dup", email="dup@example.com", password="pass1234")
        with self.assertRaises(Exception):
            register_user(username="dup", email="dup2@example.com", password="pass1234")


class RegisterEmployeeServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="emp_base", email="emp_base@example.com", password="pass1234",
            first_name="Emp", last_name="Base",
        )

    def test_promotes_user_to_employee(self):
        employee = register_employee(
            user=self.user,
            employee_code="EMP-001",
            designation=Designation.SHIPPING_EXECUTIVE,
            hire_date="2026-01-01",
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, "employee")
        self.assertIsInstance(employee, Employee)

    def test_invalid_designation_raises(self):
        with self.assertRaises(ValueError):
            register_employee(
                user=self.user,
                employee_code="EMP-002",
                designation="SeniorManager",
                hire_date="2026-01-01",
            )

    def test_double_registration_raises(self):
        register_employee(
            user=self.user,
            employee_code="EMP-003",
            designation=Designation.SUPPORT_AGENT,
            hire_date="2026-01-01",
        )
        with self.assertRaises(AlreadyEmployeeError):
            register_employee(
                user=self.user,
                employee_code="EMP-004",
                designation=Designation.SUPPORT_AGENT,
                hire_date="2026-01-01",
            )


# ---------------------------------------------------------------------------
# Auth views
# ---------------------------------------------------------------------------

class RegisterViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("register")

    def test_successful_registration(self):
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "strongpass1",
            "password_confirm": "strongpass1",
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)
        self.assertTrue(User.objects.filter(email="newuser@example.com").exists())

    def test_mismatched_passwords(self):
        payload = {
            "username": "newuser2",
            "email": "newuser2@example.com",
            "password": "strongpass1",
            "password_confirm": "differentpass",
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_username(self):
        make_customer(username="existing", email="existing@example.com")
        payload = {
            "username": "existing",
            "email": "other@example.com",
            "password": "pass1234",
            "password_confirm": "pass1234",
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LogoutViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_customer(username="logoutuser", email="logout@example.com")
        # Get tokens
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": "logout@example.com", "password": "pass1234"},
        )
        self.refresh_token = response.data["refresh"]
        self.access_token = response.data["access"]

    def test_logout_blacklists_refresh_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.post(reverse("logout"), {"refresh": self.refresh_token})
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_without_token_returns_400(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.post(reverse("logout"), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_unauthenticated_returns_401(self):
        response = self.client.post(reverse("logout"), {"refresh": self.refresh_token})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Profile views
# ---------------------------------------------------------------------------

class CustomerProfileViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_customer(username="custview", email="custview@example.com")
        self.client.force_authenticate(user=self.user)

    def test_get_customer_profile(self):
        response = self.client.get(reverse("customer-profile"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("username", response.data)

    def test_update_customer_profile(self):
        response = self.client.put(
            reverse("customer-profile"), {"gender": "M"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["gender"], "M")

    def test_employee_cannot_access_customer_profile(self):
        emp_user = User.objects.create_user(
            username="empview", email="empview@example.com", password="pass1234",
            first_name="Emp", last_name="View",
        )
        register_employee(
            user=emp_user, employee_code="EMP-V01",
            designation=Designation.SUPPORT_AGENT, hire_date="2026-01-01",
        )
        self.client.force_authenticate(user=emp_user)
        response = self.client.get(reverse("customer-profile"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UserUpdateViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_customer(username="updateme", email="updateme@example.com")
        self.client.force_authenticate(user=self.user)

    def test_update_username(self):
        response = self.client.patch(
            reverse("user-update"), {"username": "updated_name"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "updated_name")

    def test_unauthenticated_cannot_update(self):
        self.client.force_authenticate(user=None)
        response = self.client.patch(
            reverse("user-update"), {"username": "hacker"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Employee views
# ---------------------------------------------------------------------------

class EmployeeCreateViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.target_user = User.objects.create_user(
            username="target", email="target@example.com", password="pass1234",
            first_name="Target", last_name="User",
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_create_employee(self):
        response = self.client.post(
            reverse("employee-create"),
            {
                "user": self.target_user.pk,
                "employee_code": "EMP-T01",
                "designation": Designation.SHIPPING_EXECUTIVE,
                "hire_date": "2026-01-15",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Employee.objects.filter(user=self.target_user).exists())

    def test_customer_cannot_create_employee(self):
        customer = make_customer(username="custcreate", email="custcreate@example.com")
        self.client.force_authenticate(user=customer)
        response = self.client.post(
            reverse("employee-create"),
            {
                "user": self.target_user.pk,
                "employee_code": "EMP-T02",
                "designation": Designation.SUPPORT_AGENT,
                "hire_date": "2026-01-15",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_designation_returns_400(self):
        response = self.client.post(
            reverse("employee-create"),
            {
                "user": self.target_user.pk,
                "employee_code": "EMP-T03",
                "designation": "SeniorManager",
                "hire_date": "2026-01-15",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Address ViewSet
# ---------------------------------------------------------------------------

class AddressViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_customer(username="addruser", email="addruser@example.com")
        self.client.force_authenticate(user=self.user)
        self.list_url = "/api/auth/me/addresses/"

    def _make_address(self, address_type=AddressType.SHIPPING, is_default=False):
        return Address.objects.create(
            customer=self.user.customer_profile,
            address_type=address_type,
            name="Test Name",
            street="123 Test St",
            city="Testville",
            state="TS",
            country="Testland",
            zipcode="00000",
            is_default=is_default,
        )

    def test_list_own_addresses(self):
        self._make_address()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)

    def test_create_address(self):
        payload = {
            "address_type": AddressType.BILLING,
            "name": "Home",
            "street": "1 Main St",
            "city": "Citytown",
            "state": "ST",
            "country": "Countryland",
            "zipcode": "11111",
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_set_default_action(self):
        addr = self._make_address()
        url = f"{self.list_url}{addr.pk}/set-default/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        addr.refresh_from_db()
        self.assertTrue(addr.is_default)

    def test_cannot_access_other_users_addresses(self):
        other = make_customer(username="other_addr", email="other_addr@example.com")
        other_addr = Address.objects.create(
            customer=other.customer_profile,
            address_type=AddressType.SHIPPING,
            name="Other",
            street="999 Other St",
            city="Other City",
            state="OT",
            country="Otheria",
            zipcode="99999",
        )
        response = self.client.get(f"{self.list_url}{other_addr.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
