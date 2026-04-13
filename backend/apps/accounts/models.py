from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify

from utils.models import TimeStampedModel


class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=24, blank=True)
    avatar_url = models.URLField(blank=True)
    loyalty_points = models.PositiveIntegerField(default=0)
    marketing_opt_in = models.BooleanField(default=True)
    is_seller = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return self.get_full_name() or self.username


class Address(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=50, default="Home")
    recipient_name = models.CharField(max_length=120)
    phone_number = models.CharField(max_length=24)
    street_line_1 = models.CharField(max_length=255)
    street_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=80, default="India")
    landmark = models.CharField(max_length=120, blank=True)
    delivery_notes = models.CharField(max_length=255, blank=True)
    is_default_shipping = models.BooleanField(default=False)
    is_default_billing = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_default_shipping", "-updated_at"]
        verbose_name_plural = "addresses"

    def __str__(self):
        return f"{self.label} - {self.recipient_name}"

    @property
    def formatted(self):
        segments = [
            self.street_line_1,
            self.street_line_2,
            self.city,
            self.state,
            self.postal_code,
            self.country,
        ]
        return ", ".join(segment for segment in segments if segment)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default_shipping:
            Address.objects.filter(user=self.user).exclude(pk=self.pk).update(
                is_default_shipping=False
            )
        if self.is_default_billing:
            Address.objects.filter(user=self.user).exclude(pk=self.pk).update(
                is_default_billing=False
            )


class SellerProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="seller_profile")
    store_name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    bio = models.TextField(blank=True)
    city = models.CharField(max_length=80, blank=True)
    payout_email = models.EmailField(blank=True)
    is_verified = models.BooleanField(default=False)
    seller_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_sales = models.PositiveIntegerField(default=0)
    escrow_policy = models.CharField(
        max_length=255,
        default="Funds stay protected until the buyer confirms the item matches the listing.",
    )
    account_holder_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=30, blank=True)
    ifsc_code = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ["store_name"]

    def __str__(self):
        return self.store_name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.store_name)
        super().save(*args, **kwargs)
        if not self.user.is_seller:
            self.user.is_seller = True
            self.user.save(update_fields=["is_seller"])

class EmailOTP(models.Model):
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now=True)

    def is_expired(self):
        from django.utils.timezone import now
        from datetime import timedelta
        return now() > self.created_at + timedelta(minutes=5)
