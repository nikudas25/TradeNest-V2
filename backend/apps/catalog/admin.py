from django.contrib import admin

from .models import Brand, Category, Product, ProductImage, ProductReview, ProductVariant


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "featured")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)
    list_filter = ("featured",)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "featured", "website")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)
    list_filter = ("featured",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "sku",
        "seller",
        "category",
        "brand",
        "price",
        "condition",
        "resale_status",
        "stock_quantity",
        "featured",
        "best_seller",
    )
    list_filter = (
        "featured",
        "best_seller",
        "new_arrival",
        "free_shipping",
        "category",
        "condition",
        "authenticity_status",
        "resale_status",
    )
    search_fields = ("name", "sku", "short_description", "seller__email")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductImageInline, ProductVariantInline]


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "is_verified_purchase", "is_approved")
    list_filter = ("rating", "is_verified_purchase", "is_approved")
    search_fields = ("product__name", "user__email", "title")
