import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.catalog.models import Product, ProductVariant
from utils.models import TimeStampedModel


class Coupon(TimeStampedModel):
    class DiscountType(models.TextChoices):
        PERCENT = "percent", "Percentage"
        FIXED = "fixed", "Fixed"
        FREE_SHIPPING = "free_shipping", "Free shipping"

    code = models.CharField(max_length=40, unique=True)
    description = models.CharField(max_length=180, blank=True)
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENT,
    )
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    usage_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return self.code

    def is_valid_now(self):
        now = timezone.now()
        within_window = (not self.starts_at or self.starts_at <= now) and (
            not self.ends_at or self.ends_at >= now
        )
        within_limit = self.usage_limit is None or self.usage_count < self.usage_limit
        return self.active and within_window and within_limit

    def calculate_discount(self, subtotal, shipping_fee=Decimal("0.00")):
        if not self.is_valid_now() or subtotal < self.min_purchase_amount:
            return Decimal("0.00")
        if self.discount_type == self.DiscountType.PERCENT:
            discount = subtotal * (self.value / Decimal("100"))
        elif self.discount_type == self.DiscountType.FIXED:
            discount = self.value
        else:
            discount = shipping_fee
        if self.max_discount_amount:
            discount = min(discount, self.max_discount_amount)
        return min(discount, subtotal + shipping_fee)


class Cart(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
        null=True,
        blank=True,
    )
    session_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        related_name="carts",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.user.email if self.user else (self.session_key or "guest-cart")

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(TimeStampedModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        related_name="cart_items",
        null=True,
        blank=True,
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product", "variant"],
                name="unique_cart_item_per_variant",
            )
        ]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

    @property
    def unit_price(self):
        return self.variant.effective_price if self.variant else self.product.price

    @property
    def total_price(self):
        return self.unit_price * self.quantity


class WishlistItem(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlisted_by")

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="unique_wishlist_product_per_user",
            )
        ]

    def __str__(self):
        return f"{self.user} -> {self.product}"


class RecentlyViewedItem(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recently_viewed_items",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="recent_views")

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="unique_recent_view_per_user",
            )
        ]

    def __str__(self):
        return f"{self.user} viewed {self.product}"


class Order(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        AWAITING_SHIPMENT = "awaiting_shipment", "Awaiting Shipment"
        SHIPPED = "shipped", "Shipped"
        COMPLETED = "completed", "Completed"
        DISPUTED = "disputed", "Disputed"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ESCROW_HELD = "escrow_held", "Escrow Held"
        RELEASED_TO_SELLER = "released_to_seller", "Released To Seller"
        DISPUTED = "disputed", "Disputed"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="orders",
        null=True,
        blank=True,
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="sales",
        null=True,
        blank=True,
    )
    order_number = models.CharField(max_length=24, unique=True, blank=True)
    email = models.EmailField()
    phone_number = models.CharField(max_length=24)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    payment_method = models.CharField(max_length=40, default="escrow")
    
    master_payment = models.ForeignKey(
        "MasterPayment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        related_name="orders",
        null=True,
        blank=True,
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_address = models.JSONField(default=dict, blank=True)
    billing_address = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    tracking_number = models.CharField(max_length=80, blank=True)
    estimated_delivery = models.DateField(null=True, blank=True)
    placed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-placed_at"]

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"ORD-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        related_name="order_items",
        null=True,
        blank=True,
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        related_name="order_items",
        null=True,
        blank=True,
    )
    product_name = models.CharField(max_length=180)
    sku = models.CharField(max_length=64)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)
    product_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.order.order_number} - {self.product_name}"


class Payment(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=40, default="tradenest-escrow")
    status = models.CharField(max_length=20, default="pending")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=80, unique=True, blank=True)
    cashfree_order_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.transaction_id or f"payment-{self.pk}"

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            self.transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

class MasterPayment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="master_payments"
    )

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    cashfree_order_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    payment_session_id = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"MP-{self.id} ({self.status})"

class EscrowTransaction(TimeStampedModel):
    class Status(models.TextChoices):
        FUNDED = "funded", "Funded"
        IN_TRANSIT = "in_transit", "In Transit"
        RELEASED = "released", "Released"
        DISPUTED = "disputed", "Disputed"
        REFUNDED = "refunded", "Refunded"
        CANCELLED = "cancelled", "Cancelled"

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="escrow")
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="escrow_purchases",
        null=True,
        blank=True,
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="escrow_sales",
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.FUNDED)
    held_amount = models.DecimalField(max_digits=10, decimal_places=2)
    funded_at = models.DateTimeField(auto_now_add=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    dispute_reason = models.CharField(max_length=255, blank=True)
    seller_payout_reference = models.CharField(max_length=80, blank=True)
    payout_status = models.CharField(max_length=20,default = "pending")
    payout_response = models.JSONField(default=dict, blank=True)


    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"escrow-{self.order.order_number}"


class Shipment(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="shipments")
    carrier = models.CharField(max_length=80)
    tracking_number = models.CharField(max_length=80)
    status = models.CharField(max_length=40, default="processing")
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order.order_number} shipment"


class OrderStatusHistory(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    status = models.CharField(max_length=20, choices=Order.Status.choices)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "order status history"

    def __str__(self):
        return f"{self.order.order_number} -> {self.status}"


class NewsletterSubscriber(TimeStampedModel):
    email = models.EmailField(unique=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.email
