from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Avg, Count
from django.utils.text import slugify

from utils.models import TimeStampedModel


class Category(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/", null=True, blank=True)
    featured = models.BooleanField(default=False)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="children",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Brand(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    logo_url = models.URLField(blank=True)
    website = models.URLField(blank=True)
    featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(TimeStampedModel):
    class Condition(models.TextChoices):
        NEW = "new", "New"
        LIKE_NEW = "like_new", "Like New"
        GENTLY_USED = "gently_used", "Gently Used"
        USED = "used", "Used"
        REFURBISHED = "refurbished", "Refurbished"
        VINTAGE = "vintage", "Vintage"

    class AuthenticityStatus(models.TextChoices):
        SELLER_DECLARED = "seller_declared", "Seller Declared"
        PENDING = "pending_verification", "Pending Verification"
        VERIFIED = "verified", "Verified"

    class ResaleStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        RESERVED = "reserved", "Reserved"
        SOLD = "sold", "Sold"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    sku = models.CharField(max_length=64, unique=True)
    short_description = models.CharField(max_length=255)
    description = models.TextField()
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="listings",
        null=True,
        blank=True,
    )
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        related_name="products",
        null=True,
        blank=True,
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    thumbnail_url = models.URLField(blank=True)
    featured = models.BooleanField(default=False)
    best_seller = models.BooleanField(default=False)
    new_arrival = models.BooleanField(default=False)
    free_shipping = models.BooleanField(default=False)
    condition = models.CharField(
        max_length=24,
        choices=Condition.choices,
        default=Condition.GENTLY_USED,
    )
    condition_notes = models.CharField(max_length=255, blank=True)
    authenticity_status = models.CharField(
        max_length=24,
        choices=AuthenticityStatus.choices,
        default=AuthenticityStatus.SELLER_DECLARED,
    )
    resale_status = models.CharField(
        max_length=24,
        choices=ResaleStatus.choices,
        default=ResaleStatus.ACTIVE,
    )
    ships_from = models.CharField(max_length=120, blank=True)
    original_purchase_year = models.PositiveIntegerField(null=True, blank=True)
    escrow_required = models.BooleanField(default=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    tags = models.JSONField(default=list, blank=True)
    specs = models.JSONField(default=dict, blank=True)
    meta_title = models.CharField(max_length=180, blank=True)
    meta_description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-featured", "-created_at"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def current_price(self):
        return self.price

    @property
    def discount_percent(self):
        if not self.compare_at_price or self.compare_at_price <= self.price:
            return 0
        return int((1 - (self.price / self.compare_at_price)) * 100)

    @property
    def primary_image(self):
        image = self.images.filter(is_primary=True).first() or self.images.first()
        return image.image.url if image else self.thumbnail_url

    @property
    def seller_name(self):
        if not self.seller:
            return "TradeNest Seller"
        if hasattr(self.seller, "seller_profile"):
            return self.seller.seller_profile.store_name
        return self.seller.get_full_name() or self.seller.username

    @property
    def seller_verified(self):
        return bool(
            self.seller
            and hasattr(self.seller, "seller_profile")
            and self.seller.seller_profile.is_verified
        )

    def refresh_review_summary(self):
        stats = self.reviews.filter(is_approved=True).aggregate(
            average=Avg("rating"),
            count=Count("id"),
        )
        self.average_rating = round(stats["average"] or Decimal("0"), 2)
        self.review_count = stats["count"] or 0
        self.save(update_fields=["average_rating", "review_count", "updated_at"])


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    alt_text = models.CharField(max_length=180, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.product.name} image"


class ProductVariant(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    title = models.CharField(max_length=120)
    sku = models.CharField(max_length=64, unique=True)
    price_override = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    attributes = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return f"{self.product.name} - {self.title}"

    @property
    def effective_price(self):
        return self.price_override or self.product.price


class ProductReview(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_reviews",
    )
    rating = models.PositiveSmallIntegerField(default=5)
    title = models.CharField(max_length=120)
    body = models.TextField()
    is_verified_purchase = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "user"],
                name="unique_review_per_user_per_product",
            )
        ]

    def __str__(self):
        return f"{self.product.name} review by {self.user}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.product.refresh_review_summary()

    def delete(self, *args, **kwargs):
        product = self.product
        super().delete(*args, **kwargs)
        product.refresh_review_summary()
