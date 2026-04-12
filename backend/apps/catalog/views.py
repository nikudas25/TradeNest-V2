from django.db.models import Q
from rest_framework import generics, permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ProductImage

from .models import Brand, Category, Product, ProductReview
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductReviewSerializer,
    SellerListingSerializer,
)


class HomeFeedView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        listing_queryset = Product.objects.select_related("category", "brand", "seller", "seller__seller_profile").filter(
            resale_status=Product.ResaleStatus.ACTIVE
        )
        featured_products = listing_queryset.filter(featured=True)[:8]
        best_sellers = listing_queryset.filter(best_seller=True)[:8]
        new_arrivals = listing_queryset.filter(new_arrival=True)[:8]
        categories = Category.objects.filter(featured=True, parent__isnull=True)[:6]
        brands = Brand.objects.filter(featured=True)[:6]
        return Response(
            {
                "featured_products": ProductListSerializer(featured_products, many=True).data,
                "best_sellers": ProductListSerializer(best_sellers, many=True).data,
                "new_arrivals": ProductListSerializer(new_arrivals, many=True).data,
                "featured_categories": CategorySerializer(categories, many=True).data,
                "featured_brands": BrandSerializer(brands, many=True).data,
                "stats": {
                    "product_count": listing_queryset.count(),
                    "category_count": Category.objects.count(),
                    "brand_count": Brand.objects.count(),
                },
                "promises": [
                    "Verified resale listings from independent sellers",
                    "TradeNest escrow holds funds until buyer acceptance",
                    "Condition notes and authenticity states on every listing",
                ],
            }
        )


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    queryset = Category.objects.filter(parent__isnull=True).prefetch_related("children")


class BrandListView(generics.ListAPIView):
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    queryset = Brand.objects.all()


class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Product.objects.select_related("category", "brand", "seller", "seller__seller_profile").filter(
            resale_status=Product.ResaleStatus.ACTIVE
        )
        query = self.request.query_params.get("q")
        category = self.request.query_params.get("category")
        brand = self.request.query_params.get("brand")
        condition = self.request.query_params.get("condition")
        featured = self.request.query_params.get("featured")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        sort = self.request.query_params.get("sort")

        if query:
            queryset = queryset.filter(
                Q(name__icontains=query)
                | Q(short_description__icontains=query)
                | Q(description__icontains=query)
                | Q(category__name__icontains=query)
                | Q(brand__name__icontains=query)
            )
        if category:
            queryset = queryset.filter(
                Q(category__slug=category) | Q(category__parent__slug=category)
            )
        if brand:
            queryset = queryset.filter(brand__slug=brand)
        if condition:
            queryset = queryset.filter(condition=condition)
        if featured in {"true", "1", "yes"}:
            queryset = queryset.filter(featured=True)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        ordering_map = {
            "newest": "-created_at",
            "price_asc": "price",
            "price_desc": "-price",
            "rating": "-average_rating",
            "popular": "-review_count",
        }
        queryset = queryset.order_by(ordering_map.get(sort, "-featured"), "-created_at")
        return queryset


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    queryset = Product.objects.select_related(
        "category",
        "brand",
        "seller",
        "seller__seller_profile",
    ).prefetch_related(
        "images",
        "variants",
        "reviews__user",
    )


class SearchSuggestionView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"products": [], "categories": []})
        products = Product.objects.filter(
            name__icontains=query,
            resale_status=Product.ResaleStatus.ACTIVE,
        ).select_related("category", "brand", "seller", "seller__seller_profile")[:5]
        categories = Category.objects.filter(name__icontains=query)[:5]
        return Response(
            {
                "products": ProductListSerializer(products, many=True).data,
                "categories": CategorySerializer(categories, many=True).data,
            }
        )


class ProductReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductReviewSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return ProductReview.objects.filter(
            product__slug=self.kwargs["slug"],
            is_approved=True,
        ).select_related("user")

    def perform_create(self, serializer):
        product = Product.objects.get(slug=self.kwargs["slug"])
        if ProductReview.objects.filter(product=product, user=self.request.user).exists():
            raise ValidationError("You have already reviewed this product.")
        serializer.save(product=product, user=self.request.user)


class MyListingViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SellerListingSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Product.objects.filter(seller=self.request.user)

    def perform_create(self, serializer):
        product = serializer.save(
            seller=self.request.user,
            resale_status=serializer.validated_data.get("resale_status", Product.ResaleStatus.ACTIVE),
            escrow_required=True,
        )

        images = self.request.FILES.getlist("images")

        for i, image in enumerate(images):
            ProductImage.objects.create(
                product=product,
                image=image,
                is_primary=(i == 0)
            )
