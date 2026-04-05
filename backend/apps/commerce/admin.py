from django.contrib import admin

from .models import (
    Cart,
    CartItem,
    Coupon,
    EscrowTransaction,
    NewsletterSubscriber,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    RecentlyViewedItem,
    Shipment,
    WishlistItem,
)


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_name", "sku", "quantity", "unit_price", "line_total")


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "discount_type", "value", "active", "usage_count")
    list_filter = ("discount_type", "active")
    search_fields = ("code", "description")


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("user", "session_key", "coupon", "updated_at")
    search_fields = ("user__email", "session_key")
    inlines = [CartItemInline]


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ("user", "product", "created_at")
    search_fields = ("user__email", "product__name")


@admin.register(RecentlyViewedItem)
class RecentlyViewedItemAdmin(admin.ModelAdmin):
    list_display = ("user", "product", "updated_at")
    search_fields = ("user__email", "product__name")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "email",
        "seller",
        "status",
        "payment_status",
        "grand_total",
        "placed_at",
    )
    search_fields = ("order_number", "email", "phone_number")
    list_filter = ("status", "payment_status", "payment_method")
    inlines = [OrderItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("transaction_id", "order", "provider", "status", "amount")
    search_fields = ("transaction_id", "order__order_number")
    list_filter = ("status", "provider")


@admin.register(EscrowTransaction)
class EscrowTransactionAdmin(admin.ModelAdmin):
    list_display = ("order", "buyer", "seller", "status", "held_amount", "funded_at", "released_at")
    list_filter = ("status",)
    search_fields = ("order__order_number", "buyer__email", "seller__email", "seller_payout_reference")


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ("order", "carrier", "tracking_number", "status", "shipped_at")
    search_fields = ("order__order_number", "tracking_number")


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("order", "status", "note", "created_at")
    search_fields = ("order__order_number", "note")


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "active", "created_at")
    search_fields = ("email",)
    list_filter = ("active",)
