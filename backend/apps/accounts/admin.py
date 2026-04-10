from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Address, SellerProfile, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "TradeNest Marketplace",
            {
                "fields": (
                    "phone_number",
                    "avatar_url",
                    "loyalty_points",
                    "marketing_opt_in",
                )
            },
        ),
    )
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "phone_number",
        "is_seller",
        "is_staff",
    )
    search_fields = ("username", "email", "first_name", "last_name")


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = (
        "recipient_name",
        "user",
        "city",
        "state",
        "country",
        "is_default_shipping",
    )
    list_filter = ("country", "state", "is_default_shipping", "is_default_billing")
    search_fields = (
        "recipient_name",
        "user__email",
        "phone_number",
        "street_line_1",
        "city",
    )


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ("store_name", "user", "city", "is_verified", "seller_rating", "total_sales")
    list_filter = ("is_verified", "city")
    search_fields = ("store_name", "user__email", "slug", "city")
