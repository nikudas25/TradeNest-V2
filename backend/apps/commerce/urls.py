from django.urls import path
from django.urls import path
from .views import (
    CartView,
    AddToCartView,
    SubmitSellerRatingView,  # ✅ ADD THIS
)
from .views import cashfree_webhook

from .views import (
    AddToCartView,
    BuyerCancelOrderView,
    ApplyCouponView,
    BuyerConfirmReceiptView,
    CartItemDetailView,
    CartView,
    CheckoutView,
    DashboardOverviewView,
    NewsletterSubscribeView,
    OpenEscrowDisputeView,
    OrderDetailView,
    OrderListView,
    RecentlyViewedView,
    SellerOrderListView,
    SellerShipOrderView,
    WishlistDetailView,
    WishlistView,
    cashfree_webhook,
)

urlpatterns = [
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/items/", AddToCartView.as_view(), name="cart-add-item"),
    path("cart/items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("cart/coupon/", ApplyCouponView.as_view(), name="apply-coupon"),
    path("wishlist/", WishlistView.as_view(), name="wishlist"),
    path("wishlist/<int:product_id>/", WishlistDetailView.as_view(), name="wishlist-detail"),
    path("recently-viewed/", RecentlyViewedView.as_view(), name="recently-viewed"),
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("orders/", OrderListView.as_view(), name="order-list"),
    path("seller/orders/", SellerOrderListView.as_view(), name="seller-order-list"),
    path("orders/<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<str:order_number>/cancel/", BuyerCancelOrderView.as_view(), name="cancel-order"),
    path("orders/<str:order_number>/confirm-receipt/", BuyerConfirmReceiptView.as_view(), name="confirm-receipt"),
    path("orders/<str:order_number>/dispute/", OpenEscrowDisputeView.as_view(), name="escrow-dispute"),
    path("seller/orders/<str:order_number>/ship/", SellerShipOrderView.as_view(), name="seller-ship-order"),
    path("newsletter/", NewsletterSubscribeView.as_view(), name="newsletter"),
    path("dashboard/", DashboardOverviewView.as_view(), name="dashboard"),
    path("webhook/cashfree/", cashfree_webhook),
    path("orders/<str:order_number>/rate/", SubmitSellerRatingView.as_view()),
]
