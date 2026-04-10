from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BrandListView,
    CategoryListView,
    HomeFeedView,
    MyListingViewSet,
    ProductDetailView,
    ProductListView,
    ProductReviewListCreateView,
    SearchSuggestionView,
)

router = DefaultRouter()
router.register("my-listings", MyListingViewSet, basename="my-listings")

urlpatterns = [
    path("home/", HomeFeedView.as_view(), name="catalog-home"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("brands/", BrandListView.as_view(), name="brand-list"),
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    path(
        "products/<slug:slug>/reviews/",
        ProductReviewListCreateView.as_view(),
        name="product-reviews",
    ),
    path("search/", SearchSuggestionView.as_view(), name="search-suggestions"),
]

urlpatterns += router.urls
