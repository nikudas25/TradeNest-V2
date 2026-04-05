import uuid

from rest_framework import serializers

from .models import Brand, Category, Product, ProductImage, ProductReview, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "image_url",
            "featured",
            "children",
        ]

    def get_children(self, obj):
        children = obj.children.all()
        if not children.exists():
            return []
        return CategorySerializer(children, many=True, context=self.context).data


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "description", "logo_url", "website", "featured"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image_url", "alt_text", "is_primary", "sort_order"]


class ProductVariantSerializer(serializers.ModelSerializer):
    effective_price = serializers.ReadOnlyField()

    class Meta:
        model = ProductVariant
        fields = ["id", "title", "sku", "price_override", "stock_quantity", "attributes", "effective_price"]


class ProductReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = [
            "id",
            "user_name",
            "rating",
            "title",
            "body",
            "is_verified_purchase",
            "created_at",
        ]
        read_only_fields = ["id", "user_name", "is_verified_purchase", "created_at"]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class ProductSellerSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="seller.id", read_only=True)
    store_name = serializers.ReadOnlyField(source="seller_name")
    is_verified = serializers.ReadOnlyField(source="seller_verified")
    city = serializers.SerializerMethodField()
    seller_rating = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()
    escrow_policy = serializers.SerializerMethodField()

    def get_city(self, obj):
        if obj.seller and hasattr(obj.seller, "seller_profile"):
            return obj.seller.seller_profile.city
        return ""

    def get_seller_rating(self, obj):
        if obj.seller and hasattr(obj.seller, "seller_profile"):
            return obj.seller.seller_profile.seller_rating
        return 0

    def get_total_sales(self, obj):
        if obj.seller and hasattr(obj.seller, "seller_profile"):
            return obj.seller.seller_profile.total_sales
        return 0

    def get_escrow_policy(self, obj):
        if obj.seller and hasattr(obj.seller, "seller_profile"):
            return obj.seller.seller_profile.escrow_policy
        return "Funds stay in escrow until buyer acceptance."


class ProductListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    brand = serializers.CharField(source="brand.name", read_only=True)
    brand_slug = serializers.CharField(source="brand.slug", read_only=True)
    current_price = serializers.ReadOnlyField()
    discount_percent = serializers.ReadOnlyField()
    primary_image = serializers.ReadOnlyField()
    seller_name = serializers.ReadOnlyField()
    seller_verified = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "sku",
            "short_description",
            "price",
            "compare_at_price",
            "current_price",
            "discount_percent",
            "stock_quantity",
            "featured",
            "best_seller",
            "new_arrival",
            "free_shipping",
            "condition",
            "condition_notes",
            "authenticity_status",
            "resale_status",
            "ships_from",
            "original_purchase_year",
            "escrow_required",
            "average_rating",
            "review_count",
            "thumbnail_url",
            "primary_image",
            "category",
            "category_slug",
            "brand",
            "brand_slug",
            "seller_name",
            "seller_verified",
            "tags",
        ]


class ProductDetailSerializer(ProductListSerializer):
    description = serializers.CharField()
    specs = serializers.JSONField()
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = serializers.SerializerMethodField()
    related_products = serializers.SerializerMethodField()
    seller = ProductSellerSerializer(source="*", read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "description",
            "specs",
            "images",
            "variants",
            "reviews",
            "related_products",
            "seller",
            "meta_title",
            "meta_description",
        ]

    def get_reviews(self, obj):
        reviews = obj.reviews.filter(is_approved=True)[:8]
        return ProductReviewSerializer(reviews, many=True, context=self.context).data

    def get_related_products(self, obj):
        related = (
            Product.objects.filter(category=obj.category, resale_status=Product.ResaleStatus.ACTIVE)
            .exclude(pk=obj.pk)
            .select_related("category", "brand", "seller", "seller__seller_profile")[:4]
        )
        return ProductListSerializer(related, many=True, context=self.context).data


class SellerListingSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.all(),
    )
    brand_id = serializers.PrimaryKeyRelatedField(
        source="brand",
        queryset=Brand.objects.all(),
        allow_null=True,
        required=False,
    )
    sku = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "short_description",
            "description",
            "price",
            "compare_at_price",
            "stock_quantity",
            "thumbnail_url",
            "featured",
            "new_arrival",
            "free_shipping",
            "condition",
            "condition_notes",
            "authenticity_status",
            "resale_status",
            "ships_from",
            "original_purchase_year",
            "escrow_required",
            "tags",
            "specs",
            "meta_title",
            "meta_description",
            "category_id",
            "brand_id",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs.get("sku"):
            attrs["sku"] = f"TN-{uuid.uuid4().hex[:10].upper()}"
        return attrs
