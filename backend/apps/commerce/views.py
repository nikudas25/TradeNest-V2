from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from apps.commerce.models import Payment, Order, EscrowTransaction


from apps.catalog.models import Product

from .models import (
    Coupon,
    EscrowTransaction,
    NewsletterSubscriber,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    RecentlyViewedItem,
    WishlistItem,
)
from .serializers import (
    AddToCartSerializer,
    CartSerializer,
    CheckoutSerializer,
    CouponApplySerializer,
    NewsletterSubscriberSerializer,
    OrderSerializer,
    RecentlyViewedItemSerializer,
    UpdateCartItemSerializer,
    WishlistItemSerializer,
    resolve_address_snapshot,
)
from .services import (
    allocate_discount_by_subtotal,
    calculate_cart_totals,
    calculate_totals_for_items,
    get_or_create_cart_for_request,
    group_cart_items_by_seller,
)


class CartView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cart, session_key = get_or_create_cart_for_request(request)
        data = CartSerializer(cart).data
        data["session_key"] = session_key
        return Response(data)


class AddToCartView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart, session_key = get_or_create_cart_for_request(request)
        product = serializer.validated_data["product"]
        variant = serializer.validated_data["variant"]
        quantity = serializer.validated_data["quantity"]
        existing_item = cart.items.filter(product=product, variant=variant).first()

        if product.resale_status != Product.ResaleStatus.ACTIVE:
            return Response(
                {"detail": "Only active resale listings can be added to cart."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not product.seller:
            return Response(
                {"detail": "This listing is missing seller information."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        requested_quantity = quantity + (existing_item.quantity if existing_item else 0)
        if variant and variant.stock_quantity < requested_quantity:
            return Response({"detail": "Selected variant does not have enough stock."}, status=status.HTTP_400_BAD_REQUEST)
        if not variant and product.stock_quantity < requested_quantity:
            return Response({"detail": "This listing does not have enough stock."}, status=status.HTTP_400_BAD_REQUEST)

        cart_item, created = cart.items.get_or_create(
            product=product,
            variant=variant,
            defaults={"quantity": quantity},
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save(update_fields=["quantity", "updated_at"])

        data = CartSerializer(cart).data
        data["session_key"] = session_key
        return Response(data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def patch(self, request, item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart, session_key = get_or_create_cart_for_request(request)
        item = get_object_or_404(cart.items.select_related("product", "variant"), pk=item_id)
        quantity = serializer.validated_data["quantity"]
        if item.variant and item.variant.stock_quantity < quantity:
            return Response({"detail": "Selected variant does not have enough stock."}, status=status.HTTP_400_BAD_REQUEST)
        if not item.variant and item.product.stock_quantity < quantity:
            return Response({"detail": "This listing does not have enough stock."}, status=status.HTTP_400_BAD_REQUEST)
        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        data = CartSerializer(cart).data
        data["session_key"] = session_key
        return Response(data)

    def delete(self, request, item_id):
        cart, session_key = get_or_create_cart_for_request(request)
        item = get_object_or_404(cart.items, pk=item_id)
        item.delete()
        data = CartSerializer(cart).data
        data["session_key"] = session_key
        return Response(data)


class ApplyCouponView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CouponApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart, session_key = get_or_create_cart_for_request(request)
        coupon = get_object_or_404(Coupon, code__iexact=serializer.validated_data["code"].strip())
        totals_without_coupon = calculate_cart_totals(cart)
        if not coupon.is_valid_now():
            return Response({"detail": "Coupon is not active."}, status=status.HTTP_400_BAD_REQUEST)
        if totals_without_coupon["subtotal"] < coupon.min_purchase_amount:
            return Response(
                {"detail": f"Coupon requires a minimum cart value of {coupon.min_purchase_amount}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cart.coupon = coupon
        cart.save(update_fields=["coupon", "updated_at"])
        data = CartSerializer(cart).data
        data["session_key"] = session_key
        return Response(data)


class WishlistView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        items = WishlistItem.objects.filter(user=request.user).select_related("product__category", "product__brand")
        return Response(WishlistItemSerializer(items, many=True).data)

    def post(self, request):
        product = get_object_or_404(Product, pk=request.data.get("product_id"))
        item, _ = WishlistItem.objects.get_or_create(user=request.user, product=product)
        return Response(WishlistItemSerializer(item).data, status=status.HTTP_201_CREATED)


class WishlistDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, product_id):
        WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RecentlyViewedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        items = RecentlyViewedItem.objects.filter(user=request.user).select_related(
            "product__category",
            "product__brand",
        )[:8]
        return Response(RecentlyViewedItemSerializer(items, many=True).data)

    def post(self, request):
        product = get_object_or_404(Product, pk=request.data.get("product_id"))
        item, created = RecentlyViewedItem.objects.get_or_create(user=request.user, product=product)
        if not created:
            item.save()
        return Response(RecentlyViewedItemSerializer(item).data, status=status.HTTP_201_CREATED)


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        cart, session_key = get_or_create_cart_for_request(request)
        if not cart.items.exists():
            return Response({"detail": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CheckoutSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        user = request.user
        cart_items = list(
            cart.items.select_related(
                "product",
                "product__seller",
                "product__brand",
                "product__category",
                "variant",
            )
        )
        if any(not item.product or not item.product.seller for item in cart_items):
            return Response(
                {"detail": "One or more cart items are missing seller information."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for item in cart_items:
            if item.variant and item.variant.stock_quantity < item.quantity:
                return Response(
                    {"detail": f"{item.product.name} no longer has enough stock for the selected variant."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not item.variant and item.product.stock_quantity < item.quantity:
                return Response(
                    {"detail": f"{item.product.name} no longer has enough stock."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        shipping_address = resolve_address_snapshot(
            user,
            address_id=payload.get("shipping_address_id"),
            inline_data=payload.get("shipping_address"),
        )
        if payload.get("same_as_shipping", True):
            billing_address = shipping_address
        else:
            billing_address = resolve_address_snapshot(
                user,
                address_id=payload.get("billing_address_id"),
                inline_data=payload.get("billing_address"),
            )

        totals = calculate_cart_totals(cart)
        payment_method = "escrow"
        payment_status = Order.PaymentStatus.PENDING
        order_status = Order.Status.PENDING
        grouped_items = group_cart_items_by_seller(cart_items)
        group_summaries = []
        for group in grouped_items:
            base_totals = calculate_totals_for_items(group["items"])
            group_summaries.append(
                {
                    "seller": group["seller"],
                    "items": group["items"],
                    "subtotal": base_totals["subtotal"],
                }
            )

        allocated_discounts = allocate_discount_by_subtotal(group_summaries, totals["discount_total"])
        created_orders = []

        master_payment = None

        for index, group in enumerate(group_summaries):
            order_totals = calculate_totals_for_items(group["items"], discount_total=allocated_discounts[index])
            order = Order.objects.create(
                user=user,
                seller=group["seller"],
                email=payload.get("email") or user.email,
                phone_number=payload.get("phone_number") or shipping_address.get("phone_number", ""),
                status=order_status,
                payment_status=payment_status,
                payment_method=payment_method,
                coupon=cart.coupon,
                subtotal=order_totals["subtotal"],
                discount_total=order_totals["discount_total"],
                shipping_fee=order_totals["shipping_fee"],
                tax_total=order_totals["tax_total"],
                grand_total=order_totals["grand_total"],
                shipping_address=shipping_address,
                billing_address=billing_address,
                notes=payload.get("notes", ""),
                estimated_delivery=timezone.now().date() + timedelta(days=5),
            )

            for cart_item in group["items"]:
                OrderItem.objects.create(
                    order=order,
                    product=cart_item.product,
                    variant=cart_item.variant,
                    product_name=cart_item.product.name,
                    sku=cart_item.variant.sku if cart_item.variant else cart_item.product.sku,
                    quantity=cart_item.quantity,
                    unit_price=cart_item.unit_price,
                    line_total=cart_item.total_price,
                    product_snapshot={
                        "slug": cart_item.product.slug,
                        "image": cart_item.product.primary_image,
                        "brand": cart_item.product.brand.name if cart_item.product.brand else "",
                        "category": cart_item.product.category.name,
                    },
                )
                if cart_item.variant:
                    cart_item.variant.stock_quantity = max(cart_item.variant.stock_quantity - cart_item.quantity, 0)
                    cart_item.variant.save(update_fields=["stock_quantity", "updated_at"])
                    remaining_variant_stock = (
                        cart_item.product.variants.aggregate(total=Sum("stock_quantity"))["total"] or 0
                    )
                    cart_item.product.stock_quantity = remaining_variant_stock
                    cart_item.product.resale_status = (
                        Product.ResaleStatus.RESERVED
                        if remaining_variant_stock == 0
                        else Product.ResaleStatus.ACTIVE
                    )
                else:
                    cart_item.product.stock_quantity = max(cart_item.product.stock_quantity - cart_item.quantity, 0)
                    if cart_item.product.stock_quantity == 0:
                        cart_item.product.resale_status = Product.ResaleStatus.RESERVED
                cart_item.product.save(update_fields=["stock_quantity", "resale_status", "updated_at"])

            order.payment_status = Order.PaymentStatus.PENDING
            order.status = Order.Status.PENDING

            created_orders.append(order)

            OrderStatusHistory.objects.create(
                order=order,
                status=order.status,
                note="Escrow funded and seller notified to ship.",
            )

        print("CALLING CASHFREE NOW 🚀")

        total_amount = sum(order.grand_total for order in created_orders)
        order_ids = [order.order_number for order in created_orders]
        
        master_payment = Payment.objects.create(
            order=created_orders[0],  # link to first order
            provider="cashfree",
            status="pending",
            amount=total_amount,
            payload={
                "method": "cashfree",
                "captured": False,
                "held_in_escrow": False,
                "session_key": session_key,
                "order_ids": order_ids
            },
            
        )
        
        print("MASTER PAYMENT CREATED:", master_payment.id)

        from .services import create_cashfree_order
        cf_response = create_cashfree_order(
            total_amount,
            request.user,
            order_ids,
            master_payment
        )  
        print("CASHFREE CALLED ✅")      
        

        if cart.coupon:
            cart.coupon.usage_count += 1
            cart.coupon.save(update_fields=["usage_count", "updated_at"])

        cart.items.all().delete()
        cart.coupon = None
        cart.save(update_fields=["coupon", "updated_at"])

        response_data = {
            "orders": OrderSerializer(created_orders, many=True).data,
            "order_count": len(created_orders),
            "grand_total": total_amount,
            "session_key": session_key,
            "payment_session_id": cf_response.get("payment_session_id"),
            "order_ids": order_ids
        }

        if master_payment:
            print("MASTER PAYMENT ID:", master_payment.id)
            print("MASTER PAYMENT ORDER:", master_payment.order.order_number)
        else:
            print("MASTER PAYMENT IS NONE ❌")
            
        return Response(response_data, status=status.HTTP_201_CREATED)


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related(
            "seller",
            "seller__seller_profile",
            "escrow",
        ).prefetch_related("items", "payments")


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "order_number"

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related(
            "seller",
            "seller__seller_profile",
            "escrow",
        ).prefetch_related("items", "payments")


class SellerOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Order.objects.filter(seller=self.request.user).select_related(
            "user",
            "escrow",
            "seller",
            "seller__seller_profile",
        ).prefetch_related("items", "payments")


class SellerShipOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number, seller=request.user)
        if order.status != Order.Status.AWAITING_SHIPMENT:
            return Response({"detail": "This order is not awaiting shipment."}, status=status.HTTP_400_BAD_REQUEST)

        tracking_number = request.data.get("tracking_number", "").strip()
        order.status = Order.Status.SHIPPED
        order.tracking_number = tracking_number
        order.save(update_fields=["status", "tracking_number", "updated_at"])

        if hasattr(order, "escrow"):
            order.escrow.status = EscrowTransaction.Status.IN_TRANSIT
            order.escrow.shipped_at = timezone.now()
            order.escrow.save(update_fields=["status", "shipped_at", "updated_at"])

        OrderStatusHistory.objects.create(
            order=order,
            status=order.status,
            note="Seller marked the order as shipped.",
        )
        return Response(OrderSerializer(order).data)


class BuyerConfirmReceiptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number, user=request.user)
        if order.status != Order.Status.SHIPPED:
            return Response({"detail": "Only shipped orders can be accepted."}, status=status.HTTP_400_BAD_REQUEST)

        order.status = Order.Status.COMPLETED
        order.payment_status = Order.PaymentStatus.RELEASED_TO_SELLER
        order.save(update_fields=["status", "payment_status", "updated_at"])

        payment = order.payments.order_by("-created_at").first()
        if payment:
            payment.status = Order.PaymentStatus.RELEASED_TO_SELLER
            payment.payload["released_by_buyer"] = True
            payment.save(update_fields=["status", "payload", "updated_at"])

        if hasattr(order, "escrow"):
            order.escrow.status = EscrowTransaction.Status.RELEASED
            order.escrow.delivered_at = timezone.now()
            order.escrow.released_at = timezone.now()
            order.escrow.seller_payout_reference = order.escrow.seller_payout_reference or f"PAYOUT-{order.order_number}"
            order.escrow.save(
                update_fields=[
                    "status",
                    "delivered_at",
                    "released_at",
                    "seller_payout_reference",
                    "updated_at",
                ]
            )

        if order.seller and hasattr(order.seller, "seller_profile"):
            order.seller.seller_profile.total_sales += 1
            order.seller.seller_profile.save(update_fields=["total_sales", "updated_at"])

        for order_item in order.items.select_related("product"):
            if order_item.product:
                order_item.product.resale_status = (
                    Product.ResaleStatus.SOLD
                    if order_item.product.stock_quantity == 0
                    else Product.ResaleStatus.ACTIVE
                )
                order_item.product.save(update_fields=["resale_status", "updated_at"])

        OrderStatusHistory.objects.create(
            order=order,
            status=order.status,
            note="Buyer accepted the item and escrow was released.",
        )
        return Response(OrderSerializer(order).data)


class BuyerCancelOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number, user=request.user)
        if order.status not in {Order.Status.PENDING, Order.Status.AWAITING_SHIPMENT}:
            return Response(
                {"detail": "Only orders that have not shipped yet can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = Order.Status.CANCELLED
        order.payment_status = Order.PaymentStatus.REFUNDED
        order.save(update_fields=["status", "payment_status", "updated_at"])

        payment = order.payments.order_by("-created_at").first()
        if payment:
            payment.status = Order.PaymentStatus.REFUNDED
            payment.payload["cancelled_by_buyer"] = True
            payment.payload["refunded_at"] = timezone.now().isoformat()
            payment.save(update_fields=["status", "payload", "updated_at"])

        if hasattr(order, "escrow"):
            order.escrow.status = EscrowTransaction.Status.REFUNDED
            order.escrow.released_at = timezone.now()
            order.escrow.save(update_fields=["status", "released_at", "updated_at"])

        for order_item in order.items.select_related("product", "variant", "product__seller"):
            if order_item.variant:
                order_item.variant.stock_quantity += order_item.quantity
                order_item.variant.save(update_fields=["stock_quantity", "updated_at"])
                if order_item.product:
                    total_variant_stock = order_item.product.variants.aggregate(total=Sum("stock_quantity"))["total"] or 0
                    order_item.product.stock_quantity = total_variant_stock
                    if total_variant_stock > 0:
                        order_item.product.resale_status = Product.ResaleStatus.ACTIVE
                    order_item.product.save(update_fields=["stock_quantity", "resale_status", "updated_at"])
            elif order_item.product:
                order_item.product.stock_quantity += order_item.quantity
                if order_item.product.stock_quantity > 0:
                    order_item.product.resale_status = Product.ResaleStatus.ACTIVE
                order_item.product.save(update_fields=["stock_quantity", "resale_status", "updated_at"])

        OrderStatusHistory.objects.create(
            order=order,
            status=order.status,
            note="Buyer cancelled the order before shipment.",
        )
        return Response(OrderSerializer(order).data)


class OpenEscrowDisputeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number)
        if request.user not in {order.user, order.seller}:
            return Response(status=status.HTTP_403_FORBIDDEN)

        reason = request.data.get("reason", "").strip() or "Escrow dispute opened by a participant."
        order.status = Order.Status.DISPUTED
        order.payment_status = Order.PaymentStatus.DISPUTED
        order.save(update_fields=["status", "payment_status", "updated_at"])

        payment = order.payments.order_by("-created_at").first()
        if payment:
            payment.status = Order.PaymentStatus.DISPUTED
            payment.payload["dispute_reason"] = reason
            payment.save(update_fields=["status", "payload", "updated_at"])

        if hasattr(order, "escrow"):
            order.escrow.status = EscrowTransaction.Status.DISPUTED
            order.escrow.dispute_reason = reason
            order.escrow.save(update_fields=["status", "dispute_reason", "updated_at"])

        OrderStatusHistory.objects.create(
            order=order,
            status=order.status,
            note=reason,
        )
        return Response(OrderSerializer(order).data)


class NewsletterSubscribeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = NewsletterSubscriberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscriber, created = NewsletterSubscriber.objects.get_or_create(
            email=serializer.validated_data["email"].lower(),
            defaults={"active": True},
        )
        if not created and not subscriber.active:
            subscriber.active = True
            subscriber.save(update_fields=["active", "updated_at"])
        return Response({"message": "Subscribed successfully."}, status=status.HTTP_201_CREATED)


class DashboardOverviewView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        month_start = today.replace(day=1)
        recent_orders = Order.objects.all()[:5]
        monthly_revenue = (
            Order.objects.filter(
                placed_at__date__gte=month_start,
                payment_status=Order.PaymentStatus.RELEASED_TO_SELLER,
            ).aggregate(total=Sum("grand_total"))["total"]
            or 0
        )
        return Response(
            {
                "metrics": {
                    "orders": Order.objects.count(),
                    "paid_orders": Order.objects.filter(payment_status=Order.PaymentStatus.RELEASED_TO_SELLER).count(),
                    "customers": Order.objects.values("email").distinct().count(),
                    "monthly_revenue": monthly_revenue,
                },
                "order_breakdown": Order.objects.values("status").annotate(total=Count("id")),
                "recent_orders": OrderSerializer(recent_orders, many=True).data,
            }
        )

from django.db import transaction

@csrf_exempt
@api_view(["POST"])
def cashfree_webhook(request):
    data = request.data
    print("Webhook received:", data)

    try:
        cf_order_id = data["data"]["order"]["order_id"]
        payment_status = data["data"]["payment"]["payment_status"]
    except KeyError:
        return Response({"error": "Invalid payload"}, status=400)

    # ✅ Ignore non-success
    if payment_status != "SUCCESS":
        return Response({"message": "Ignored"}, status=200)

    with transaction.atomic():

        # 🔒 Lock payment row
        try:
            payment = Payment.objects.select_for_update().get(
                cashfree_order_id=cf_order_id
            )
        except Payment.DoesNotExist:
            return Response({"error": "Payment not found"}, status=404)

        # ✅ Idempotency guard
        if payment.status == "completed":
            return Response({"message": "Already processed"}, status=200)

        order_ids = payment.payload.get("order_ids", [])

        orders = Order.objects.filter(order_number__in=order_ids)

        # ✅ Update payment
        payment.status = "completed"
        payment.payload["captured"] = True
        payment.payload["held_in_escrow"] = True
        payment.save(update_fields=["status", "payload", "updated_at"])

        for order in orders:

            # ✅ Idempotent order update
            if order.payment_status != Order.PaymentStatus.ESCROW_HELD:
                order.payment_status = Order.PaymentStatus.ESCROW_HELD
                order.status = Order.Status.AWAITING_SHIPMENT
                order.save(update_fields=["payment_status", "status", "updated_at"])

            # ✅ Safe escrow creation
            EscrowTransaction.objects.get_or_create(
                order=order,
                defaults={
                    "buyer": order.user,
                    "seller": order.seller,
                    "held_amount": order.grand_total,
                    "status": EscrowTransaction.Status.FUNDED,
                }
            )

    return Response({"message": "Webhook processed"}, status=200)

class SubmitSellerRatingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number, user=request.user)

        # ✅ Only completed orders
        if order.status != Order.Status.COMPLETED:
            return Response({"detail": "You can only rate after delivery."}, status=400)

        # ✅ Prevent duplicate
        if hasattr(order, "sellerrating"):
            return Response({"detail": "You have already rated this seller."}, status=400)

        seller_profile = order.seller.seller_profile

        rating = request.data.get("rating")
        review = request.data.get("review", "")

        SellerRating.objects.create(
            buyer=request.user,
            seller=seller_profile,
            order=order,
            rating=rating,
            review=review
        )

        return Response({"message": "Rating submitted successfully"})