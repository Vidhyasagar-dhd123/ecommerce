"""
management/commands/seed.py
───────────────────────────
Idempotent seed command that populates the database with rich, realistic test
data across all 12 application domains.

Usage:
    python manage.py seed              # seed everything
    python manage.py seed --flush      # wipe & re-seed (DANGER: deletes all data)

Design principles:
  • get_or_create / update_or_create throughout — safe to re-run.
  • Deterministic primary business keys (slugs, SKUs, codes, emails).
  • Relationships wired correctly so every domain endpoint returns real data.
"""

from __future__ import annotations

import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _days_ago(n: int) -> date:
    return (timezone.now() - timedelta(days=n)).date()


def _days_from_now(n: int) -> date:
    return (timezone.now() + timedelta(days=n)).date()


def _rand_price(lo: float, hi: float) -> Decimal:
    return Decimal(str(round(random.uniform(lo, hi), 2)))


def _rand_bool(prob_true: float = 0.7) -> bool:
    return random.random() < prob_true


# ─────────────────────────────────────────────────────────────────────────────
#  Raw seed data
# ─────────────────────────────────────────────────────────────────────────────

WAREHOUSES = [
    {"name": "Mumbai Central Warehouse", "location": "Andheri East, Mumbai, Maharashtra 400069", "contact_number": "+91-22-4000-1111"},
    {"name": "Delhi North Hub",          "location": "Rohini Sector 9, Delhi 110085",              "contact_number": "+91-11-2700-2222"},
    {"name": "Bangalore Tech Park WH",  "location": "Whitefield, Bengaluru, Karnataka 560066",    "contact_number": "+91-80-6700-3333"},
]

CATEGORIES = [
    # root
    {"name": "Electronics",     "parent": None, "description": "Gadgets, devices & accessories"},
    {"name": "Fashion",         "parent": None, "description": "Clothing, footwear & accessories"},
    {"name": "Home & Kitchen",  "parent": None, "description": "Furniture, appliances & décor"},
    {"name": "Sports & Fitness","parent": None, "description": "Equipment, activewear & nutrition"},
    # sub-categories
    {"name": "Smartphones",    "parent": "Electronics",      "description": "Flagship & mid-range phones"},
    {"name": "Laptops",        "parent": "Electronics",      "description": "Ultrabooks & gaming laptops"},
    {"name": "Headphones",     "parent": "Electronics",      "description": "Over-ear, in-ear & wireless"},
    {"name": "Men's Clothing", "parent": "Fashion",          "description": "Shirts, jeans, formals & casuals"},
    {"name": "Women's Clothing","parent": "Fashion",         "description": "Kurtas, dresses & more"},
    {"name": "Cookware",       "parent": "Home & Kitchen",   "description": "Pans, pots & kitchen tools"},
    {"name": "Gym Equipment",  "parent": "Sports & Fitness", "description": "Weights, benches & cardio"},
    {"name": "Running Shoes",  "parent": "Sports & Fitness", "description": "Road & trail running footwear"},
]

BRANDS = [
    {"name": "NovaTech",    "description": "Premium consumer electronics brand"},
    {"name": "ZenStyle",    "description": "Contemporary fashion label"},
    {"name": "HomeBliss",   "description": "Quality home & kitchen products"},
    {"name": "ActivePulse", "description": "Performance sports & fitness gear"},
    {"name": "SwiftRun",    "description": "Professional running footwear"},
    {"name": "CookMaster",  "description": "Chef-grade cookware & utensils"},
    {"name": "SoundWave",   "description": "Hi-fi audio equipment"},
    {"name": "PureForm",    "description": "Minimalist lifestyle clothing brand"},
]

PRODUCTS = [
    # Electronics – Smartphones
    {
        "name": "NovaTech X12 Pro", "category": "Smartphones", "brand": "NovaTech",
        "base_price": "34999.00",
        "description": {
            "summary": {"text": "Flagship smartphone with 6.7\" AMOLED display and triple camera system.", "priority": 1},
            "lists": [{"title": "Key Features", "items": ["6.7\" 120Hz AMOLED", "108MP triple camera", "5000mAh battery", "5G ready"], "priority": 2}],
            "tables": [{"title": "Specifications", "headers": ["Spec", "Value"], "rows": [["Processor", "Octa-core 3.2GHz"], ["RAM", "12GB"], ["Storage", "256GB"], ["OS", "Android 14"]], "priority": 3}],
        },
        "variants": [
            {"color": "Midnight Black", "size": "256GB", "price": "34999.00", "stock": 50, "weight": "0.189"},
            {"color": "Pearl White",    "size": "256GB", "price": "34999.00", "stock": 35, "weight": "0.189"},
            {"color": "Midnight Black", "size": "512GB", "price": "39999.00", "stock": 20, "weight": "0.189"},
        ],
    },
    {
        "name": "NovaTech A5 Lite", "category": "Smartphones", "brand": "NovaTech",
        "base_price": "12999.00",
        "description": {
            "summary": "Affordable mid-range phone with long battery life.",
            "lists": [{"title": "Highlights", "items": ["6.5\" IPS LCD", "50MP dual camera", "6000mAh battery", "4G LTE"], "priority": 1}],
        },
        "variants": [
            {"color": "Sky Blue", "size": "64GB",  "price": "12999.00", "stock": 80, "weight": "0.195"},
            {"color": "Graphite", "size": "128GB", "price": "14999.00", "stock": 60, "weight": "0.195"},
        ],
    },
    # Electronics – Laptops
    {
        "name": "NovaTech ProBook 15", "category": "Laptops", "brand": "NovaTech",
        "base_price": "74999.00",
        "description": {
            "summary": {"text": "Ultra-thin business laptop powered by the latest Intel Core i7.", "priority": 1},
            "tables": [{"title": "Specs", "headers": ["Component", "Detail"], "rows": [["CPU", "Intel Core i7-1360P"], ["RAM", "16GB DDR5"], ["SSD", "512GB NVMe"], ["Display", "15.6\" FHD IPS"]], "priority": 2}],
        },
        "variants": [
            {"color": "Space Grey", "size": "16GB/512GB", "price": "74999.00", "stock": 25, "weight": "1.6"},
            {"color": "Silver",     "size": "32GB/1TB",   "price": "94999.00", "stock": 10, "weight": "1.6"},
        ],
    },
    {
        "name": "NovaTech GameForce X", "category": "Laptops", "brand": "NovaTech",
        "base_price": "99999.00",
        "description": {
            "summary": "Gaming beast with RTX 4070 and 165Hz display.",
            "lists": [{"title": "Gaming Highlights", "items": ["RTX 4070 8GB", "165Hz QHD display", "RGB backlit keyboard", "32GB DDR5"], "priority": 1}],
        },
        "variants": [
            {"color": "Black",  "size": "32GB/1TB", "price": "99999.00", "stock": 15, "weight": "2.4"},
            {"color": "Black",  "size": "64GB/2TB", "price": "124999.00","stock": 5,  "weight": "2.4"},
        ],
    },
    # Electronics – Headphones
    {
        "name": "SoundWave Elite ANC", "category": "Headphones", "brand": "SoundWave",
        "base_price": "14999.00",
        "description": {
            "summary": "Premium over-ear headphones with active noise cancellation.",
            "lists": [{"title": "Features", "items": ["40hr battery life", "ANC + Transparency mode", "Foldable design", "Multipoint Bluetooth 5.3"], "priority": 1}],
        },
        "variants": [
            {"color": "Matte Black",  "size": "One Size", "price": "14999.00", "stock": 40, "weight": "0.290"},
            {"color": "Ivory White",  "size": "One Size", "price": "14999.00", "stock": 30, "weight": "0.290"},
        ],
    },
    {
        "name": "SoundWave Buds Pro", "category": "Headphones", "brand": "SoundWave",
        "base_price": "4999.00",
        "description": {"summary": "True wireless earbuds with 36hr total playtime and IPX5 rating."},
        "variants": [
            {"color": "Black",       "size": "One Size", "price": "4999.00", "stock": 100, "weight": "0.055"},
            {"color": "Rose Gold",   "size": "One Size", "price": "4999.00", "stock": 70,  "weight": "0.055"},
            {"color": "Navy Blue",   "size": "One Size", "price": "4999.00", "stock": 50,  "weight": "0.055"},
        ],
    },
    # Fashion – Men's
    {
        "name": "ZenStyle Classic Oxford Shirt", "category": "Men's Clothing", "brand": "ZenStyle",
        "base_price": "1299.00",
        "description": {"summary": "Slim-fit Oxford shirt crafted from 100% Egyptian cotton."},
        "variants": [
            {"color": "White", "size": "S",  "price": "1299.00", "stock": 30, "weight": "0.280"},
            {"color": "White", "size": "M",  "price": "1299.00", "stock": 50, "weight": "0.285"},
            {"color": "White", "size": "L",  "price": "1299.00", "stock": 40, "weight": "0.290"},
            {"color": "Blue",  "size": "M",  "price": "1299.00", "stock": 35, "weight": "0.285"},
            {"color": "Blue",  "size": "L",  "price": "1299.00", "stock": 25, "weight": "0.290"},
        ],
    },
    {
        "name": "PureForm Slim Chinos", "category": "Men's Clothing", "brand": "PureForm",
        "base_price": "1999.00",
        "description": {"summary": "Stretch-cotton slim chinos for office and casual wear."},
        "variants": [
            {"color": "Khaki", "size": "30x32", "price": "1999.00", "stock": 20, "weight": "0.450"},
            {"color": "Khaki", "size": "32x32", "price": "1999.00", "stock": 25, "weight": "0.460"},
            {"color": "Navy",  "size": "32x32", "price": "1999.00", "stock": 20, "weight": "0.460"},
            {"color": "Navy",  "size": "34x32", "price": "1999.00", "stock": 15, "weight": "0.470"},
        ],
    },
    # Fashion – Women's
    {
        "name": "ZenStyle Anarkali Kurta Set", "category": "Women's Clothing", "brand": "ZenStyle",
        "base_price": "2499.00",
        "description": {"summary": "Embroidered Anarkali kurta with matching dupatta in premium georgette."},
        "variants": [
            {"color": "Rose Pink", "size": "XS", "price": "2499.00", "stock": 20, "weight": "0.500"},
            {"color": "Rose Pink", "size": "S",  "price": "2499.00", "stock": 30, "weight": "0.510"},
            {"color": "Rose Pink", "size": "M",  "price": "2499.00", "stock": 25, "weight": "0.520"},
            {"color": "Teal",      "size": "S",  "price": "2499.00", "stock": 20, "weight": "0.510"},
            {"color": "Teal",      "size": "M",  "price": "2499.00", "stock": 15, "weight": "0.520"},
        ],
    },
    {
        "name": "PureForm Wrap Dress", "category": "Women's Clothing", "brand": "PureForm",
        "base_price": "1799.00",
        "description": {"summary": "Versatile midi wrap dress in crinkle georgette."},
        "variants": [
            {"color": "Forest Green", "size": "S", "price": "1799.00", "stock": 25, "weight": "0.350"},
            {"color": "Forest Green", "size": "M", "price": "1799.00", "stock": 20, "weight": "0.360"},
            {"color": "Burgundy",     "size": "S", "price": "1799.00", "stock": 20, "weight": "0.350"},
            {"color": "Burgundy",     "size": "M", "price": "1799.00", "stock": 15, "weight": "0.360"},
        ],
    },
    # Home & Kitchen – Cookware
    {
        "name": "CookMaster Tri-Ply Kadai 26cm", "category": "Cookware", "brand": "CookMaster",
        "base_price": "2999.00",
        "description": {
            "summary": "Stainless-steel tri-ply kadai with ergonomic handles.",
            "lists": [{"title": "Includes", "items": ["26cm Kadai", "Glass lid", "Silicone handle sleeves"], "priority": 1}],
        },
        "variants": [
            {"color": "Silver", "size": "26cm", "price": "2999.00", "stock": 45, "weight": "1.200"},
            {"color": "Silver", "size": "30cm", "price": "3499.00", "stock": 30, "weight": "1.500"},
        ],
    },
    {
        "name": "CookMaster Non-Stick Fry Pan", "category": "Cookware", "brand": "CookMaster",
        "base_price": "1499.00",
        "description": {"summary": "PFOA-free ceramic non-stick fry pan suitable for all cooktops including induction."},
        "variants": [
            {"color": "Black", "size": "22cm", "price": "1499.00", "stock": 60, "weight": "0.800"},
            {"color": "Black", "size": "26cm", "price": "1799.00", "stock": 50, "weight": "0.950"},
            {"color": "Red",   "size": "26cm", "price": "1799.00", "stock": 30, "weight": "0.950"},
        ],
    },
    # Sports – Gym
    {
        "name": "ActivePulse Adjustable Dumbbell Set", "category": "Gym Equipment", "brand": "ActivePulse",
        "base_price": "7999.00",
        "description": {
            "summary": "Adjustable dumbbell pair (2.5kg–25kg) with quick-lock mechanism.",
            "tables": [{"title": "Weight Range", "headers": ["Setting", "Weight (kg)"], "rows": [["1", "2.5"], ["2", "5"], ["3", "10"], ["4", "15"], ["5", "25"]], "priority": 1}],
        },
        "variants": [
            {"color": "Black", "size": "2.5-25kg", "price": "7999.00", "stock": 20, "weight": "52.0"},
        ],
    },
    {
        "name": "ActivePulse Yoga Mat Pro", "category": "Gym Equipment", "brand": "ActivePulse",
        "base_price": "1299.00",
        "description": {"summary": "6mm thick anti-slip yoga mat with alignment lines and carry strap."},
        "variants": [
            {"color": "Purple", "size": "183x61cm", "price": "1299.00", "stock": 80, "weight": "1.000"},
            {"color": "Blue",   "size": "183x61cm", "price": "1299.00", "stock": 70, "weight": "1.000"},
            {"color": "Green",  "size": "183x61cm", "price": "1299.00", "stock": 60, "weight": "1.000"},
        ],
    },
    # Sports – Running Shoes
    {
        "name": "SwiftRun Velocity 2.0", "category": "Running Shoes", "brand": "SwiftRun",
        "base_price": "5999.00",
        "description": {
            "summary": "Responsive road-running shoe with carbon-fibre plate and FlexFoam midsole.",
            "lists": [{"title": "Technology", "items": ["Carbon-fibre plate", "FlexFoam midsole", "Breathable mesh upper", "Reflective heel tab"], "priority": 1}],
        },
        "variants": [
            {"color": "Neon Yellow/Black", "size": "UK8",  "price": "5999.00", "stock": 15, "weight": "0.280"},
            {"color": "Neon Yellow/Black", "size": "UK9",  "price": "5999.00", "stock": 20, "weight": "0.290"},
            {"color": "Neon Yellow/Black", "size": "UK10", "price": "5999.00", "stock": 12, "weight": "0.300"},
            {"color": "All Black",         "size": "UK8",  "price": "5999.00", "stock": 10, "weight": "0.280"},
            {"color": "All Black",         "size": "UK9",  "price": "5999.00", "stock": 15, "weight": "0.290"},
        ],
    },
]

COUPONS = [
    {"code": "WELCOME10",  "discount_type": "percent", "discount_value": "10.00", "min_order_amount": "500.00",   "start_date": _days_ago(30), "end_date": _days_from_now(60), "usage_limit": 1000},
    {"code": "FLAT500",    "discount_type": "fixed",   "discount_value": "500.00","min_order_amount": "3000.00",  "start_date": _days_ago(15), "end_date": _days_from_now(45), "usage_limit": 500},
    {"code": "TECH20",     "discount_type": "percent", "discount_value": "20.00", "min_order_amount": "10000.00", "start_date": _days_ago(10), "end_date": _days_from_now(20), "usage_limit": 200},
    {"code": "FREESHIP",   "discount_type": "fixed",   "discount_value": "99.00", "min_order_amount": "0.00",     "start_date": _days_ago(5),  "end_date": _days_from_now(90), "usage_limit": None},
    {"code": "EXPIRED50",  "discount_type": "percent", "discount_value": "50.00", "min_order_amount": "0.00",     "start_date": _days_ago(90), "end_date": _days_ago(10),     "usage_limit": 100, "status": False},
]

OFFERS = [
    {"title": "Monsoon Sale",     "discount_type": "percent", "discount_value": "15.00", "start_date": _days_ago(5),  "end_date": _days_from_now(25)},
    {"title": "Tech Festival",    "discount_type": "percent", "discount_value": "10.00", "start_date": _days_ago(1),  "end_date": _days_from_now(10)},
    {"title": "Fashion Week",     "discount_type": "fixed",   "discount_value": "300.00","start_date": _days_ago(3),  "end_date": _days_from_now(7)},
    {"title": "Kitchen Clearance","discount_type": "percent", "discount_value": "25.00", "start_date": _days_ago(10), "end_date": _days_from_now(5)},
]

VENDORS = [
    {"name": "TechSource India",  "contact_person": "Rajesh Mehta",  "phone": "+91-98200-11111", "email": "rajesh@techsource.in",  "address": "SEEPZ SEZ, Andheri East, Mumbai 400096"},
    {"name": "FashionHub Ltd",    "contact_person": "Priya Sharma",  "phone": "+91-95820-22222", "email": "priya@fashionhub.in",   "address": "Karol Bagh, New Delhi 110005"},
    {"name": "HomeGoods Direct",  "contact_person": "Anil Kumar",    "phone": "+91-98100-33333", "email": "anil@homegoods.in",     "address": "Bommasandra KIADB, Bengaluru 560099"},
    {"name": "SportsPro Supply",  "contact_person": "Deepak Nair",   "phone": "+91-96500-44444", "email": "deepak@sportspro.in",   "address": "Whitefield, Bengaluru 560066"},
    {"name": "AudioWorld Imports","contact_person": "Meera Pillai",  "phone": "+91-99200-55555", "email": "meera@audioworld.in",   "address": "Nariman Point, Mumbai 400021"},
]

CUSTOMER_DATA = [
    {"username": "alice_smith",   "email": "alice@example.com",    "first_name": "Alice",    "last_name": "Smith",    "gender": "F", "dob": date(1992, 3, 15)},
    {"username": "bob_jones",     "email": "bob@example.com",      "first_name": "Bob",      "last_name": "Jones",    "gender": "M", "dob": date(1988, 7, 22)},
    {"username": "carol_white",   "email": "carol@example.com",    "first_name": "Carol",    "last_name": "White",    "gender": "F", "dob": date(1995, 11, 5)},
    {"username": "david_brown",   "email": "david@example.com",    "first_name": "David",    "last_name": "Brown",    "gender": "M", "dob": date(1990, 1, 30)},
    {"username": "emma_davis",    "email": "emma@example.com",     "first_name": "Emma",     "last_name": "Davis",    "gender": "F", "dob": date(1998, 6, 18)},
    {"username": "frank_miller",  "email": "frank@example.com",    "first_name": "Frank",    "last_name": "Miller",   "gender": "M", "dob": date(1985, 9, 11)},
    {"username": "grace_wilson",  "email": "grace@example.com",    "first_name": "Grace",    "last_name": "Wilson",   "gender": "F", "dob": date(1993, 4, 27)},
    {"username": "harry_moore",   "email": "harry@example.com",    "first_name": "Harry",    "last_name": "Moore",    "gender": "M", "dob": date(1997, 2, 14)},
    {"username": "isla_taylor",   "email": "isla@example.com",     "first_name": "Isla",     "last_name": "Taylor",   "gender": "F", "dob": date(1991, 8, 8)},
    {"username": "jack_anderson", "email": "jack@example.com",     "first_name": "Jack",     "last_name": "Anderson", "gender": "M", "dob": date(1986, 12, 3)},
    {"username": "karen_thomas",  "email": "karen@example.com",    "first_name": "Karen",    "last_name": "Thomas",   "gender": "F", "dob": date(1994, 5, 20)},
    {"username": "leo_jackson",   "email": "leo@example.com",      "first_name": "Leo",      "last_name": "Jackson",  "gender": "M", "dob": date(1989, 10, 16)},
    {"username": "mia_harris",    "email": "mia@example.com",      "first_name": "Mia",      "last_name": "Harris",   "gender": "F", "dob": date(1996, 3, 9)},
    {"username": "noah_martin",   "email": "noah@example.com",     "first_name": "Noah",     "last_name": "Martin",   "gender": "M", "dob": date(1987, 7, 31)},
    {"username": "olivia_garcia", "email": "olivia@example.com",   "first_name": "Olivia",   "last_name": "Garcia",   "gender": "F", "dob": date(1999, 1, 7)},
    {"username": "paul_martinez", "email": "paul@example.com",     "first_name": "Paul",     "last_name": "Martinez", "gender": "M", "dob": date(1983, 6, 24)},
    {"username": "quinn_robinson","email": "quinn@example.com",    "first_name": "Quinn",    "last_name": "Robinson", "gender": "O", "dob": date(2000, 11, 12)},
    {"username": "rose_clark",    "email": "rose@example.com",     "first_name": "Rose",     "last_name": "Clark",    "gender": "F", "dob": date(1992, 8, 29)},
    {"username": "sam_rodriguez", "email": "sam@example.com",      "first_name": "Sam",      "last_name": "Rodriguez","gender": "M", "dob": date(1994, 2, 5)},
    {"username": "tina_lewis",    "email": "tina@example.com",     "first_name": "Tina",     "last_name": "Lewis",    "gender": "F", "dob": date(1990, 9, 18)},
]

EMPLOYEE_DATA = [
    {"username": "emp_ship_mumbai",  "email": "ship1.mumbai@store.com",  "first_name": "Vikram",  "last_name": "Patil",   "designation": "ShippingExecutive", "code": "EMP-001", "warehouse_idx": 0},
    {"username": "emp_ship_delhi",   "email": "ship1.delhi@store.com",   "first_name": "Suresh",  "last_name": "Yadav",   "designation": "ShippingExecutive", "code": "EMP-002", "warehouse_idx": 1},
    {"username": "emp_ship_blr",     "email": "ship1.blr@store.com",     "first_name": "Ananya",  "last_name": "Rao",     "designation": "ShippingExecutive", "code": "EMP-003", "warehouse_idx": 2},
    {"username": "emp_inv_mumbai",   "email": "inv1.mumbai@store.com",   "first_name": "Neha",    "last_name": "Joshi",   "designation": "InventoryManager",  "code": "EMP-004", "warehouse_idx": 0},
    {"username": "emp_inv_delhi",    "email": "inv1.delhi@store.com",    "first_name": "Kiran",   "last_name": "Gupta",   "designation": "InventoryManager",  "code": "EMP-005", "warehouse_idx": 1},
    {"username": "emp_support",      "email": "support1@store.com",      "first_name": "Pradeep", "last_name": "Nair",    "designation": "SupportAgent",      "code": "EMP-006", "warehouse_idx": 2},
]

REVIEW_COMMENTS = [
    "Absolutely love this product! Exceeded all my expectations.",
    "Great value for money. Would definitely buy again.",
    "Good product but packaging could be better.",
    "Works perfectly fine. Delivery was fast too.",
    "Average product. Nothing special but gets the job done.",
    "Excellent build quality. Feels premium in hand.",
    "Highly recommended! Customer service was also very helpful.",
    "Decent product for the price range.",
    "Not satisfied. Expected better quality from this brand.",
    "Fantastic! This is exactly what I was looking for.",
    "Good overall but slightly overpriced.",
    "Works as described. Happy with the purchase.",
]


# ─────────────────────────────────────────────────────────────────────────────
#  Command
# ─────────────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed the database with rich test data across all domains."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Wipe all app data before seeding (DESTRUCTIVE).",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write(self.style.WARNING("Flushing existing data…"))
            self._flush()

        with transaction.atomic():
            self.stdout.write("Seeding groups…")
            groups = self._seed_groups()

            self.stdout.write("Seeding warehouses…")
            warehouses = self._seed_warehouses()

            self.stdout.write("Seeding admin user…")
            admin = self._seed_admin()

            self.stdout.write("Seeding employees…")
            employees = self._seed_employees(warehouses, groups)

            self.stdout.write("Seeding customers…")
            customers = self._seed_customers(groups)

            self.stdout.write("Seeding categories…")
            categories = self._seed_categories()

            self.stdout.write("Seeding brands…")
            brands = self._seed_brands()

            self.stdout.write("Seeding products & variants…")
            products, variants_map = self._seed_products(categories, brands)

            self.stdout.write("Seeding inventory…")
            inventory_map = self._seed_inventory(variants_map, warehouses)

            self.stdout.write("Seeding vendors…")
            self._seed_vendors()

            self.stdout.write("Seeding coupons & offers…")
            self._seed_coupons()
            self._seed_offers(products)

            self.stdout.write("Seeding carts…")
            self._seed_carts(customers, variants_map)

            self.stdout.write("Seeding orders…")
            orders = self._seed_orders(customers, variants_map, inventory_map, warehouses, admin)

            self.stdout.write("Seeding fulfillment…")
            self._seed_fulfillment(orders, warehouses, admin)

            self.stdout.write("Seeding reviews…")
            self._seed_reviews(customers, products, orders)

            self.stdout.write("Seeding wishlists…")
            self._seed_wishlists(customers, products)

            self.stdout.write("Seeding dues…")
            self._seed_dues(customers, warehouses)

        self.stdout.write(self.style.SUCCESS("Seeding complete! Database is ready for frontend testing."))

    # ─────────────────────────────────────────────────────────────────────────
    #  Flush
    # ─────────────────────────────────────────────────────────────────────────

    def _flush(self):
        from finance.models import Dues
        from fulfillment.models import Refund, Exchange, Return, Shipment
        from reviews.models import Review
        from wishlist.models import WishlistItem, Wishlist
        from cart.models import CartItem, Cart
        from orders.models import Invoice, Payment, OrderItem, Order
        from inventory.models import StockTransaction, Inventory
        from promotions.models import HasActiveOffer, Offer, Coupon
        from vendors.models import Vendor
        from products.models import ProductImage, ProductVariant, Product, Brand, Category
        from users.models import Address, Customer, Employee, AdminProfile
        from django.contrib.auth import get_user_model
        User = get_user_model()

        for model in [
            Dues, Refund, Exchange, Return, Shipment,
            Review, WishlistItem, Wishlist,
            CartItem, Cart,
            Invoice, Payment, OrderItem, Order,
            StockTransaction, Inventory,
            HasActiveOffer, Offer, Coupon,
            Vendor,
            ProductImage, ProductVariant, Product, Brand, Category,
            Address, Customer, Employee, AdminProfile,
        ]:
            model.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    # ─────────────────────────────────────────────────────────────────────────
    #  Groups
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_groups(self) -> dict:
        names = ["ShippingExecutive", "InventoryManager", "SupportAgent", "PremiumCustomer"]
        return {name: Group.objects.get_or_create(name=name)[0] for name in names}

    # ─────────────────────────────────────────────────────────────────────────
    #  Warehouses
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_warehouses(self) -> list:
        from inventory.models import Warehouse
        result = []
        for wh_data in WAREHOUSES:
            wh, _ = Warehouse.objects.get_or_create(
                name=wh_data["name"],
                defaults={"location": wh_data["location"], "contact_number": wh_data["contact_number"]},
            )
            result.append(wh)
        return result

    # ─────────────────────────────────────────────────────────────────────────
    #  Admin
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_admin(self):
        from django.contrib.auth import get_user_model
        from users.models import AdminProfile
        from users.models.user import UserRole
        User = get_user_model()

        admin, created = User.objects.get_or_create(
            email="admin@store.com",
            defaults={
                "username": "store_admin",
                "first_name": "Store",
                "last_name": "Admin",
                "role": UserRole.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("Admin@1234")
            admin.save()
        AdminProfile.objects.get_or_create(user=admin, defaults={"admin_level": 3})
        return admin

    # ─────────────────────────────────────────────────────────────────────────
    #  Employees
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_employees(self, warehouses: list, groups: dict) -> list:
        from django.contrib.auth import get_user_model
        from users.models import Employee
        from users.models.user import UserRole
        User = get_user_model()
        result = []

        for idx, emp_data in enumerate(EMPLOYEE_DATA):
            user, created = User.objects.get_or_create(
                email=emp_data["email"],
                defaults={
                    "username": emp_data["username"],
                    "first_name": emp_data["first_name"],
                    "last_name": emp_data["last_name"],
                    "role": UserRole.EMPLOYEE,
                    "is_staff": True,
                },
            )
            if created:
                user.set_password("Emp@1234")
                user.save()

            wh = warehouses[emp_data["warehouse_idx"]]
            emp, _ = Employee.objects.get_or_create(
                user=user,
                defaults={
                    "employee_code": emp_data["code"],
                    "designation": emp_data["designation"],
                    "hire_date": _days_ago(random.randint(100, 1000)),
                    "warehouse": wh,
                },
            )
            # Add to relevant group
            user.groups.add(groups[emp_data["designation"]])
            result.append(emp)

        return result

    # ─────────────────────────────────────────────────────────────────────────
    #  Customers
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_customers(self, groups: dict) -> list:
        from django.contrib.auth import get_user_model
        from users.models import Customer, Address
        from users.models.user import UserRole
        from users.models.address import AddressType
        User = get_user_model()
        result = []

        cities = [
            ("Mumbai", "Maharashtra", "400001"),
            ("Delhi",  "Delhi",       "110001"),
            ("Bengaluru", "Karnataka","560001"),
            ("Chennai", "Tamil Nadu", "600001"),
            ("Hyderabad","Telangana", "500001"),
            ("Pune",   "Maharashtra", "411001"),
            ("Kolkata", "West Bengal","700001"),
            ("Ahmedabad","Gujarat",   "380001"),
        ]

        for cust_data in CUSTOMER_DATA:
            user, created = User.objects.get_or_create(
                email=cust_data["email"],
                defaults={
                    "username": cust_data["username"],
                    "first_name": cust_data["first_name"],
                    "last_name": cust_data["last_name"],
                    "role": UserRole.CUSTOMER,
                },
            )
            if created:
                user.set_password("Customer@1234")
                user.save()

            customer, _ = Customer.objects.get_or_create(
                user=user,
                defaults={"date_of_birth": cust_data["dob"], "gender": cust_data["gender"]},
            )

            # Default shipping address
            if not customer.addresses.filter(address_type=AddressType.SHIPPING, is_default=True).exists():
                city_data = random.choice(cities)
                Address.objects.create(
                    customer=customer,
                    address_type=AddressType.SHIPPING,
                    name=f"{user.first_name} {user.last_name}",
                    street=f"{random.randint(1, 999)}, {random.choice(['MG Road', 'Linking Road', 'Park Street', 'FC Road', 'Jubilee Hills'])}",
                    city=city_data[0],
                    state=city_data[1],
                    country="India",
                    zipcode=city_data[2],
                    is_default=True,
                )

            # Premium for first 5 customers
            if result.__len__() < 5:
                user.groups.add(groups["PremiumCustomer"])

            result.append(customer)

        return result

    # ─────────────────────────────────────────────────────────────────────────
    #  Categories
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_categories(self) -> dict:
        from products.models import Category
        cat_map: dict = {}

        # First pass: root categories
        for cat_data in CATEGORIES:
            if cat_data["parent"] is None:
                cat, _ = Category.objects.get_or_create(
                    slug=slugify(cat_data["name"]),
                    defaults={"name": cat_data["name"], "description": cat_data["description"]},
                )
                cat_map[cat_data["name"]] = cat

        # Second pass: sub-categories
        for cat_data in CATEGORIES:
            if cat_data["parent"] is not None:
                parent = cat_map[cat_data["parent"]]
                cat, _ = Category.objects.get_or_create(
                    slug=slugify(cat_data["name"]),
                    defaults={"name": cat_data["name"], "description": cat_data["description"], "parent": parent},
                )
                cat_map[cat_data["name"]] = cat

        return cat_map

    # ─────────────────────────────────────────────────────────────────────────
    #  Brands
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_brands(self) -> dict:
        from products.models import Brand
        brand_map = {}
        for b in BRANDS:
            brand, _ = Brand.objects.get_or_create(
                slug=slugify(b["name"]),
                defaults={"brand_name": b["name"], "description": b["description"]},
            )
            brand_map[b["name"]] = brand
        return brand_map

    # ─────────────────────────────────────────────────────────────────────────
    #  Products & Variants
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_products(self, categories: dict, brands: dict) -> tuple[list, dict]:
        from products.models import Product, ProductVariant, ProductImage
        products = []
        variants_map: dict[str, ProductVariant] = {}

        for idx, p_data in enumerate(PRODUCTS):
            category = categories[p_data["category"]]
            brand = brands.get(p_data["brand"])

            product, _ = Product.objects.get_or_create(
                slug=slugify(p_data["name"]),
                defaults={
                    "name": p_data["name"],
                    "category": category,
                    "brand": brand,
                    "base_price": Decimal(p_data["base_price"]),
                    "description": p_data.get("description", {}),
                    "status": True,
                },
            )

            # Image placeholder (URL-based, no file upload needed)
            if not product.images.exists():
                ProductImage.objects.create(
                    product=product,
                    image_url=f"https://placehold.co/800x800/1a1a2e/white?text={slugify(p_data['name'])}",
                    is_primary=True,
                )

            for v_idx, v_data in enumerate(p_data["variants"]):
                sku = f"{slugify(p_data['name'])[:15].upper().replace('-','')}-{v_idx + 1:02d}"
                variant, _ = ProductVariant.objects.get_or_create(
                    sku=sku,
                    defaults={
                        "product": product,
                        "color": v_data["color"],
                        "size": v_data["size"],
                        "price": Decimal(v_data["price"]),
                        "stock": v_data["stock"],
                        "weight": Decimal(v_data["weight"]) if v_data.get("weight") else None,
                        "status": True,
                    },
                )
                variants_map[sku] = variant

            products.append(product)

        return products, variants_map

    # ─────────────────────────────────────────────────────────────────────────
    #  Inventory
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_inventory(self, variants_map: dict, warehouses: list) -> dict:
        from inventory.models import Inventory
        inv_map: dict[tuple, Inventory] = {}

        for sku, variant in variants_map.items():
            for wh in warehouses:
                stock = random.randint(5, 80)
                reserved = random.randint(0, min(5, stock))
                inv, _ = Inventory.objects.get_or_create(
                    warehouse=wh,
                    variant=variant,
                    defaults={
                        "stock": stock,
                        "reserved_stock": reserved,
                        "available_stock": stock - reserved,
                        "reorder_level": random.randint(5, 15),
                    },
                )
                inv_map[(wh.pk, sku)] = inv

        return inv_map

    # ─────────────────────────────────────────────────────────────────────────
    #  Vendors
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_vendors(self):
        from vendors.models import Vendor
        for v in VENDORS:
            Vendor.objects.get_or_create(name=v["name"], defaults=v)

    # ─────────────────────────────────────────────────────────────────────────
    #  Coupons & Offers
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_coupons(self):
        from promotions.models import Coupon
        for c in COUPONS:
            Coupon.objects.get_or_create(
                code=c["code"],
                defaults={
                    "discount_type": c["discount_type"],
                    "discount_value": Decimal(c["discount_value"]),
                    "min_order_amount": Decimal(c["min_order_amount"]),
                    "start_date": c["start_date"],
                    "end_date": c["end_date"],
                    "status": c.get("status", True),
                    "usage_limit": c.get("usage_limit"),
                    "used_count": 0,
                },
            )

    def _seed_offers(self, products: list):
        from promotions.models import Offer, HasActiveOffer
        offer_objs = []
        for o in OFFERS:
            offer, _ = Offer.objects.get_or_create(
                title=o["title"],
                defaults={
                    "discount_type": o["discount_type"],
                    "discount_value": Decimal(o["discount_value"]),
                    "start_date": o["start_date"],
                    "end_date": o["end_date"],
                    "status": True,
                },
            )
            offer_objs.append(offer)

        # Attach offers to a few products (no overlap per product)
        offered_products: set = set()
        for offer in offer_objs:
            pool = [p for p in products if p.pk not in offered_products]
            if not pool:
                break
            chosen = random.sample(pool, min(3, len(pool)))
            for product in chosen:
                HasActiveOffer.objects.get_or_create(
                    offer=offer,
                    product=product,
                    defaults={"start_date": offer.start_date, "end_date": offer.end_date},
                )
                offered_products.add(product.pk)

    # ─────────────────────────────────────────────────────────────────────────
    #  Carts
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_carts(self, customers: list, variants_map: dict):
        from cart.models import Cart, CartItem
        all_variants = list(variants_map.values())

        for customer in customers[:10]:
            cart, _ = Cart.objects.get_or_create(
                customer=customer,
                is_active=True,
                defaults={},
            )
            # Add 1-4 items
            chosen = random.sample(all_variants, random.randint(1, 4))
            for variant in chosen:
                CartItem.objects.get_or_create(
                    cart=cart,
                    variant=variant,
                    defaults={"quantity": random.randint(1, 3), "price": variant.price},
                )

    # ─────────────────────────────────────────────────────────────────────────
    #  Orders
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_orders(self, customers, variants_map, inventory_map, warehouses, admin) -> list:
        from orders.models import Order, OrderItem, Payment, Invoice
        from orders.models.order import OrderStatus
        from orders.models.payment import PaymentMethod, PaymentStatus
        from users.models.address import AddressType

        all_variants = list(variants_map.values())
        orders = []
        statuses = [
            OrderStatus.PENDING,
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.DELIVERED,
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
            OrderStatus.RETURNED,
        ]
        payment_methods = [PaymentMethod.COD, PaymentMethod.UPI, PaymentMethod.NETBANKING, PaymentMethod.CASH]

        order_counter = 0
        for customer in customers:
            address = customer.addresses.filter(
                address_type=AddressType.SHIPPING, is_default=True
            ).first()
            if not address:
                continue

            num_orders = random.randint(0, 3)
            for _ in range(num_orders):
                status = statuses[order_counter % len(statuses)]
                order_counter += 1

                chosen_variants = random.sample(all_variants, random.randint(1, 4))
                sub_total = Decimal("0.00")
                item_rows = []
                for variant in chosen_variants:
                    qty = random.randint(1, 3)
                    unit_price = variant.price
                    discount = Decimal("0.00")
                    item_total = (unit_price * qty) - discount
                    sub_total += item_total
                    item_rows.append((variant, qty, unit_price, discount, item_total))

                shipping = Decimal("99.00") if sub_total < Decimal("1000") else Decimal("0.00")
                grand_total = sub_total + shipping

                wh = random.choice(warehouses) if status not in (OrderStatus.PENDING, OrderStatus.CANCELLED) else None

                order = Order.objects.create(
                    customer=customer,
                    address=address,
                    status=status,
                    total_amount=grand_total,
                    coupon_code="",
                    locked_by_warehouse=wh,
                    locked_by=admin if wh else None,
                    locked_at=timezone.now() if wh else None,
                )

                for variant, qty, unit_price, discount, item_total in item_rows:
                    inv = inventory_map.get((wh.pk if wh else warehouses[0].pk, variant.sku))
                    OrderItem.objects.create(
                        order=order,
                        variant=variant,
                        inventory=inv,
                        quantity=qty,
                        unit_price=unit_price,
                        discount=discount,
                        total_price=item_total,
                    )

                # Payment
                p_method = random.choice(payment_methods)
                p_status = (
                    PaymentStatus.PAID if status in (OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.CONFIRMED)
                    else PaymentStatus.PENDING if status == OrderStatus.PENDING
                    else PaymentStatus.FAILED if status == OrderStatus.CANCELLED
                    else PaymentStatus.REFUNDED
                )
                Payment.objects.create(
                    order=order,
                    payment_method=p_method,
                    transaction_id=f"TXN-{order.pk:06d}" if p_status == PaymentStatus.PAID else "",
                    amount=grand_total,
                    payment_status=p_status,
                    paid_at=timezone.now() if p_status == PaymentStatus.PAID else None,
                )

                # Invoice for non-cancelled orders
                if status not in (OrderStatus.CANCELLED,):
                    invoice_num = f"INV-{timezone.now().year}-{order.pk:05d}"
                    if not Invoice.objects.filter(invoice_number=invoice_num).exists():
                        Invoice.objects.create(
                            order=order,
                            invoice_number=invoice_num,
                            sub_total=sub_total,
                            discount=Decimal("0.00"),
                            tax_amount=(sub_total * Decimal("0.18")).quantize(Decimal("0.01")),
                            shipping_charge=shipping,
                            grand_total=grand_total,
                        )

                orders.append(order)

        return orders

    # ─────────────────────────────────────────────────────────────────────────
    #  Fulfillment
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_fulfillment(self, orders: list, warehouses: list, admin):
        from orders.models.order import OrderStatus
        from fulfillment.models import Shipment, Return, Refund, Exchange
        from fulfillment.models.return_model import ReturnStatus
        from fulfillment.models.refund import RefundStatus
        from fulfillment.models.exchange import ExchangeStatus

        carriers = ["BlueDart", "Delhivery", "FedEx India", "Ekart", "Shadowfax"]
        return_reasons = [
            "Product arrived damaged.",
            "Wrong item delivered.",
            "Size/colour not as described.",
            "Changed my mind — no longer needed.",
            "Defective product stopped working after 2 days.",
        ]

        for order in orders:
            status = order.status
            wh = order.locked_by_warehouse or warehouses[0]

            # Shipped / Delivered → create shipment
            if status in (OrderStatus.SHIPPED, OrderStatus.DELIVERED):
                if not hasattr(order, "_shipment_created"):
                    ship_date = _days_ago(random.randint(2, 15))
                    delivery_date = (
                        ship_date + timedelta(days=random.randint(2, 7))
                        if status == OrderStatus.DELIVERED else None
                    )
                    Shipment.objects.get_or_create(
                        order=order,
                        defaults={
                            "warehouse": wh,
                            "tracking_number": f"TRACK{order.pk:08d}",
                            "carrier": random.choice(carriers),
                            "ship_date": ship_date,
                            "delivery_date": delivery_date,
                        },
                    )

            # Returned → create return + possible refund
            if status == OrderStatus.RETURNED:
                Shipment.objects.get_or_create(
                    order=order,
                    defaults={
                        "warehouse": wh,
                        "tracking_number": f"TRACK{order.pk:08d}",
                        "carrier": random.choice(carriers),
                        "ship_date": _days_ago(20),
                        "delivery_date": _days_ago(15),
                    },
                )
                ret, created = Return.objects.get_or_create(
                    order=order,
                    defaults={
                        "reason": random.choice(return_reasons),
                        "status": ReturnStatus.COMPLETED,
                    },
                )
                if created:
                    # Refund against payment
                    payment = getattr(order, "payment", None)
                    if payment:
                        Refund.objects.get_or_create(
                            payment=payment,
                            defaults={
                                "amount": order.total_amount,
                                "reason": ret.reason,
                                "status": RefundStatus.PROCESSED,
                                "refunded_at": timezone.now() - timedelta(days=random.randint(1, 10)),
                            },
                        )

            # A couple of exchanges on delivered orders
            if status == OrderStatus.DELIVERED and random.random() < 0.2:
                Exchange.objects.get_or_create(
                    order=order,
                    defaults={
                        "contact_person": admin,
                        "reason": "Customer requested size exchange.",
                        "status": ExchangeStatus.APPROVED,
                    },
                )

    # ─────────────────────────────────────────────────────────────────────────
    #  Reviews
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_reviews(self, customers, products, orders):
        from orders.models.order import OrderStatus
        from reviews.models import Review

        # Only customers with delivered orders can leave reviews
        delivered_customer_pks = set(
            o.customer.pk for o in orders if o.status == OrderStatus.DELIVERED
        )

        reviewed = set()
        for customer in customers:
            if customer.pk not in delivered_customer_pks:
                continue
            # Review 1–4 random products
            chosen = random.sample(products, random.randint(1, min(4, len(products))))
            for product in chosen:
                key = (customer.pk, product.pk)
                if key in reviewed:
                    continue
                Review.objects.get_or_create(
                    product=product,
                    customer=customer,
                    defaults={
                        "rating": random.randint(3, 5),
                        "comment": random.choice(REVIEW_COMMENTS),
                    },
                )
                reviewed.add(key)

    # ─────────────────────────────────────────────────────────────────────────
    #  Wishlists
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_wishlists(self, customers, products):
        from wishlist.models import Wishlist, WishlistItem

        for customer in customers:
            wishlist, _ = Wishlist.objects.get_or_create(customer=customer)
            chosen = random.sample(products, random.randint(0, min(5, len(products))))
            for product in chosen:
                WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)

    # ─────────────────────────────────────────────────────────────────────────
    #  Finance Dues
    # ─────────────────────────────────────────────────────────────────────────

    def _seed_dues(self, customers, warehouses):
        from finance.models import Dues
        from finance.models.dues import DuesStatus

        statuses = [DuesStatus.PENDING, DuesStatus.PENDING, DuesStatus.OVERDUE, DuesStatus.PAID]

        for customer in customers[:10]:
            if random.random() < 0.5:
                due_status = random.choice(statuses)
                due_date = (
                    _days_ago(random.randint(1, 30)) if due_status == DuesStatus.OVERDUE
                    else _days_from_now(random.randint(5, 30))
                )
                Dues.objects.get_or_create(
                    customer=customer,
                    status=due_status,
                    defaults={
                        "warehouse": random.choice(warehouses),
                        "amount": _rand_price(200, 5000),
                        "due_date": due_date,
                    },
                )
