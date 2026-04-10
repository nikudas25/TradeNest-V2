from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.catalog.models import Brand, Category, Product, ProductImage, ProductVariant
from apps.commerce.models import Coupon
from apps.accounts.models import SellerProfile

User = get_user_model()


SEED_PRODUCTS = [
    {
        "name": "Jordan 1 Retro High - University Blue",
        "sku": "AUR-SNEAK-001",
        "short_description": "Verified resale pair with original box and light wear on the outsole.",
        "description": "A well-kept pair from a sneaker collector. Includes original packaging, extra laces, and detailed condition photos for TradeNest escrow buyers.",
        "category": "Sneakers",
        "brand": "Northline",
        "seller_email": "mia@tradenest.test",
        "price": "18999.00",
        "compare_at_price": "22999.00",
        "featured": True,
        "best_seller": True,
        "new_arrival": False,
        "free_shipping": True,
        "thumbnail_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
        "tags": ["Sneakers", "Collector"],
        "specs": {"Condition": "Like New", "Includes": "Box + laces", "Size": "UK 8"},
        "condition": "like_new",
        "condition_notes": "Minor heel drag only. Uppers are clean.",
        "authenticity_status": "verified",
        "ships_from": "Mumbai",
        "variants": [
            {"title": "UK 7", "sku": "AUR-SNEAK-001-7", "stock_quantity": 12},
            {"title": "UK 8", "sku": "AUR-SNEAK-001-8", "stock_quantity": 9},
        ],
    },
    {
        "name": "Vintage Leather Work Tote",
        "sku": "VRV-TOTE-002",
        "short_description": "Pre-owned leather tote restored by an independent reseller.",
        "description": "Structured vintage tote with restored handles, polished hardware, and a clean interior. Listed by a TradeNest vintage seller with condition notes included.",
        "category": "Luxury Bags",
        "brand": "Monoco",
        "seller_email": "sana@tradenest.test",
        "price": "6499.00",
        "compare_at_price": "8999.00",
        "featured": True,
        "best_seller": False,
        "new_arrival": True,
        "free_shipping": True,
        "thumbnail_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
        "tags": ["Vintage", "Bags"],
        "specs": {"Material": "Leather", "Compartments": "3", "Strap": "Hand carry"},
        "condition": "gently_used",
        "condition_notes": "Interior lining replaced. Small crease near base.",
        "authenticity_status": "seller_declared",
        "ships_from": "Delhi",
        "variants": [],
    },
    {
        "name": "Sony WH-1000XM5 Headphones",
        "sku": "PLS-WATCH-003",
        "short_description": "Open-box pair with accessories and battery health verified before listing.",
        "description": "Noise-cancelling headphones listed by a verified tech reseller. Open-box condition, tested controls, and TradeNest escrow protection included.",
        "category": "Tech",
        "brand": "Orbit",
        "seller_email": "rahul@tradenest.test",
        "price": "17499.00",
        "compare_at_price": "24999.00",
        "featured": True,
        "best_seller": True,
        "new_arrival": True,
        "free_shipping": True,
        "thumbnail_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
        "tags": ["Audio", "Electronics"],
        "specs": {"Condition": "Open Box", "Battery": "Excellent", "Accessories": "Case + cable"},
        "condition": "like_new",
        "condition_notes": "Less than two weeks old, no scratches.",
        "authenticity_status": "verified",
        "ships_from": "Bengaluru",
        "variants": [],
    },
]


class Command(BaseCommand):
    help = "Seed the catalog with starter brands, categories, products, and a coupon."

    def handle(self, *args, **options):
        footwear, _ = Category.objects.get_or_create(
            name="Sneakers",
            defaults={
                "description": "Collector pairs, grails, and rare sneaker listings.",
                "featured": True,
                "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
            },
        )
        accessories, _ = Category.objects.get_or_create(
            name="Luxury Bags",
            defaults={
                "description": "Pre-owned bags, restored leather goods, and vintage accessories.",
                "featured": True,
                "image_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
            },
        )
        electronics, _ = Category.objects.get_or_create(
            name="Tech",
            defaults={
                "description": "Open-box devices and verified tech resale listings.",
                "featured": True,
                "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
            },
        )

        category_map = {
            "Sneakers": footwear,
            "Luxury Bags": accessories,
            "Tech": electronics,
        }

        brand_map = {}
        for brand_name in ["Northline", "Monoco", "Orbit"]:
            brand_map[brand_name], _ = Brand.objects.get_or_create(
                name=brand_name,
                defaults={"featured": True},
            )

        sellers = [
            {
                "email": "mia@tradenest.test",
                "username": "mia_resells",
                "first_name": "Mia",
                "last_name": "K",
                "store_name": "Mia's Sneaker Vault",
                "city": "Mumbai",
                "bio": "Collector-focused sneaker flips and deadstock finds.",
                "verified": True,
            },
            {
                "email": "sana@tradenest.test",
                "username": "sana_archive",
                "first_name": "Sana",
                "last_name": "R",
                "store_name": "Sana Archive",
                "city": "Delhi",
                "bio": "Vintage accessories and restored leather goods.",
                "verified": False,
            },
            {
                "email": "rahul@tradenest.test",
                "username": "rahul_reboot",
                "first_name": "Rahul",
                "last_name": "D",
                "store_name": "Reboot Tech",
                "city": "Bengaluru",
                "bio": "Open-box gadgets with verification reports.",
                "verified": True,
            },
        ]
        seller_map = {}
        for item in sellers:
            user, _ = User.objects.get_or_create(
                email=item["email"],
                defaults={
                    "username": item["username"],
                    "first_name": item["first_name"],
                    "last_name": item["last_name"],
                    "is_seller": True,
                },
            )
            profile, _ = SellerProfile.objects.get_or_create(
                user=user,
                defaults={
                    "store_name": item["store_name"],
                    "city": item["city"],
                    "bio": item["bio"],
                    "payout_email": item["email"],
                    "is_verified": item["verified"],
                    "seller_rating": "4.80",
                    "total_sales": 12,
                },
            )
            seller_map[item["email"]] = user

        for item in SEED_PRODUCTS:
            product, created = Product.objects.get_or_create(
                sku=item["sku"],
                defaults={
                    "name": item["name"],
                    "short_description": item["short_description"],
                    "description": item["description"],
                    "seller": seller_map[item["seller_email"]],
                    "category": category_map[item["category"]],
                    "brand": brand_map[item["brand"]],
                    "price": item["price"],
                    "compare_at_price": item["compare_at_price"],
                    "stock_quantity": 1,
                    "thumbnail_url": item["thumbnail_url"],
                    "featured": item["featured"],
                    "best_seller": item["best_seller"],
                    "new_arrival": item["new_arrival"],
                    "free_shipping": item["free_shipping"],
                    "condition": item["condition"],
                    "condition_notes": item["condition_notes"],
                    "authenticity_status": item["authenticity_status"],
                    "resale_status": Product.ResaleStatus.ACTIVE,
                    "ships_from": item["ships_from"],
                    "escrow_required": True,
                    "tags": item["tags"],
                    "specs": item["specs"],
                },
            )
            if created:
                ProductImage.objects.create(
                    product=product,
                    image_url=item["thumbnail_url"],
                    alt_text=item["name"],
                    is_primary=True,
                )
                for variant in item["variants"]:
                    ProductVariant.objects.create(product=product, **variant)

        Coupon.objects.get_or_create(
            code="TRADENEST5",
            defaults={
                "description": "5% off your first TradeNest escrow order",
                "discount_type": Coupon.DiscountType.PERCENT,
                "value": "5.00",
                "min_purchase_amount": "4999.00",
                "active": True,
            },
        )

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
