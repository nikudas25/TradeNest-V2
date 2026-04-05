from rest_framework import serializers

from apps.accounts.models import Address
from apps.catalog.models import Product, ProductVariant
from apps.catalog.serializers import ProductListSerializer, ProductVariantSerializer

from .models import (
    Cart,
    CartItem,
    Coupon,
    EscrowTransaction,
    NewsletterSubscriber,
    Order,
    OrderItem,
    Payment,
    RecentlyViewedItem,
    WishlistItem,
)
from .services import calculate_cart_totals


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    variant = ProductVariantSerializer(read_only=True)
    unit_price = serializers.ReadOnlyField()
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "variant",
            "quantity",
            "unit_price",
            "total_price",
            "created_at",
            "updated_at",
        ]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.ReadOnlyField()
    subtotal = serializers.SerializerMethodField()
    shipping_fee = serializers.SerializerMethodField()
    discount_total = serializers.SerializerMethodField()
    tax_total = serializers.SerializerMethodField()
    grand_total = serializers.SerializerMethodField()
    coupon_code = serializers.CharField(source="coupon.code", read_only=True)

    class Meta:
        model = Cart
        fields = [
            "id",
            "session_key",
            "coupon_code",
            "item_count",
            "items",
            "subtotal",
            "shipping_fee",
            "discount_total",
            "tax_total",
            "grand_total",
            "updated_at",
        ]

    def _totals(self, obj):
        return calculate_cart_totals(obj)

    def get_subtotal(self, obj):
        return self._totals(obj)["subtotal"]

    def get_shipping_fee(self, obj):
        return self._totals(obj)["shipping_fee"]

    def get_discount_total(self, obj):
        return self._totals(obj)["discount_total"]

    def get_tax_total(self, obj):
        return self._totals(obj)["tax_total"]

    def get_grand_total(self, obj):
        return self._totals(obj)["grand_total"]


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate(self, attrs):
        product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all()).to_internal_value(
            attrs["product_id"]
        )
        attrs["product"] = product
        variant_id = attrs.get("variant_id")
        if variant_id:
            variant = serializers.PrimaryKeyRelatedField(
                queryset=ProductVariant.objects.all()
            ).to_internal_value(variant_id)
            if variant.product_id != product.id:
                raise serializers.ValidationError("Selected variant does not belong to this product.")
            attrs["variant"] = variant
        else:
            attrs["variant"] = None
        return attrs


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


class CouponApplySerializer(serializers.Serializer):
    code = serializers.CharField()


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "created_at"]


class RecentlyViewedItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = RecentlyViewedItem
        fields = ["id", "product", "updated_at"]


class InlineAddressSerializer(serializers.Serializer):
    label = serializers.CharField(required=False, allow_blank=True)
    recipient_name = serializers.CharField()
    phone_number = serializers.CharField()
    street_line_1 = serializers.CharField()
    street_line_2 = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField()
    state = serializers.CharField()
    postal_code = serializers.CharField()
    country = serializers.CharField(default="India")
    landmark = serializers.CharField(required=False, allow_blank=True)
    delivery_notes = serializers.CharField(required=False, allow_blank=True)


class CheckoutSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    shipping_address_id = serializers.IntegerField(required=False)
    billing_address_id = serializers.IntegerField(required=False)
    shipping_address = InlineAddressSerializer(required=False)
    billing_address = InlineAddressSerializer(required=False)
    same_as_shipping = serializers.BooleanField(default=True)
    payment_method = serializers.ChoiceField(choices=["escrow"], default="escrow")
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("TradeNest escrow checkout requires a signed-in buyer account.")
        if not attrs.get("shipping_address_id") and not attrs.get("shipping_address"):
            raise serializers.ValidationError("A shipping address is required.")
        if not attrs.get("same_as_shipping") and not attrs.get("billing_address_id") and not attrs.get(
            "billing_address"
        ):
            raise serializers.ValidationError("A billing address is required.")
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_name",
            "sku",
            "quantity",
            "unit_price",
            "line_total",
            "product_snapshot",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["provider", "status", "amount", "transaction_id", "created_at"]


class EscrowTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscrowTransaction
        fields = [
            "status",
            "held_amount",
            "funded_at",
            "shipped_at",
            "delivered_at",
            "released_at",
            "dispute_reason",
            "seller_payout_reference",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    escrow = EscrowTransactionSerializer(read_only=True)
    seller_name = serializers.SerializerMethodField()
    seller_verified = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "email",
            "phone_number",
            "seller",
            "seller_name",
            "seller_verified",
            "status",
            "payment_status",
            "payment_method",
            "subtotal",
            "discount_total",
            "shipping_fee",
            "tax_total",
            "grand_total",
            "shipping_address",
            "billing_address",
            "notes",
            "tracking_number",
            "estimated_delivery",
            "placed_at",
            "items",
            "payments",
            "escrow",
        ]

    def get_seller_name(self, obj):
        if not obj.seller:
            return ""
        if hasattr(obj.seller, "seller_profile"):
            return obj.seller.seller_profile.store_name
        return obj.seller.get_full_name() or obj.seller.username

    def get_seller_verified(self, obj):
        return bool(
            obj.seller and hasattr(obj.seller, "seller_profile") and obj.seller.seller_profile.is_verified
        )


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ["email"]


def resolve_address_snapshot(user, address_id=None, inline_data=None):
    if address_id:
        if not user:
            raise serializers.ValidationError("Sign in to use a saved address.")
        try:
            address = Address.objects.get(pk=address_id, user=user)
        except Address.DoesNotExist as exc:
            raise serializers.ValidationError("Selected address was not found.") from exc
        return {
            "label": address.label,
            "recipient_name": address.recipient_name,
            "phone_number": address.phone_number,
            "street_line_1": address.street_line_1,
            "street_line_2": address.street_line_2,
            "city": address.city,
            "state": address.state,
            "postal_code": address.postal_code,
            "country": address.country,
            "landmark": address.landmark,
            "delivery_notes": address.delivery_notes,
        }
    return inline_data or {}
