import http
import token
import uuid
from collections import OrderedDict
from decimal import Decimal, ROUND_HALF_UP

from apps.commerce.models import Cart, CartItem

import requests
from django.conf import settings


def create_cashfree_order(total_amount, user, master_payment):
    url = f"{settings.CASHFREE_BASE_URL}/pg/orders"

    headers = {
        "x-client-id": settings.CASHFREE_CLIENT_ID,
        "x-client-secret": settings.CASHFREE_CLIENT_SECRET,
        "Content-Type": "application/json",
        "x-api-version": "2022-09-01"
    }

    # 🔹 unique Cashfree order id
    cf_order_id = f"cf_{uuid.uuid4().hex[:10]}"

    data = {
        "order_id": cf_order_id,  # ✅ ADD THIS
        "order_amount": float(total_amount),
        "order_currency": "INR",
        "customer_details": {
            "customer_id": str(user.id),
            "customer_email": user.email,
            "customer_phone": "9999999999"
        },
        "order_meta": {
            "return_url": "http://localhost:5173/payment-success",
            "notify_url": "https://sherell-unexpropriable-subaggregately.ngrok-free.dev/api/commerce/webhook/cashfree/"
        }
    }

    response = requests.post(url, json=data, headers=headers)
    res = response.json()

    print("Cashfree response:", res)  # DEBUG

    master_payment.cashfree_order_id = res.get("order_id")
    master_payment.payment_session_id = res.get("payment_session_id")
    master_payment.save(update_fields=["cashfree_order_id", "payment_session_id", "updated_at"])

    print("MASTER PAYMENT SAVED:", master_payment.id, master_payment.cashfree_order_id)

    return res

STANDARD_SHIPPING_FEE = Decimal("149.00")
FREE_SHIPPING_THRESHOLD = Decimal("2999.00")
TAX_RATE = Decimal("0.12")


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_shipping_fee_for_items(items):
    subtotal = sum((item.total_price for item in items), Decimal("0.00"))
    if subtotal == 0:
        return Decimal("0.00")
    if subtotal >= FREE_SHIPPING_THRESHOLD or any(item.product.free_shipping for item in items):
        return Decimal("0.00")
    return STANDARD_SHIPPING_FEE


def calculate_totals_for_items(items, coupon=None, discount_total=None):
    subtotal = sum((item.total_price for item in items), Decimal("0.00"))
    shipping_fee = calculate_shipping_fee_for_items(items)

    resolved_discount = discount_total
    if resolved_discount is None:
        resolved_discount = coupon.calculate_discount(subtotal, shipping_fee) if coupon else Decimal("0.00")

    taxable_amount = max(subtotal - min(resolved_discount, subtotal), Decimal("0.00"))
    tax_total = taxable_amount * TAX_RATE
    grand_total = subtotal + shipping_fee + tax_total - resolved_discount

    return {
        "subtotal": money(subtotal),
        "shipping_fee": money(shipping_fee),
        "discount_total": money(resolved_discount),
        "tax_total": money(tax_total),
        "grand_total": money(grand_total),
    }


def group_cart_items_by_seller(items):
    grouped = OrderedDict()
    for item in items:
        seller = item.product.seller if item.product else None
        seller_id = seller.id if seller else 0
        if seller_id not in grouped:
            grouped[seller_id] = {
                "seller": seller,
                "items": [],
            }
        grouped[seller_id]["items"].append(item)
    return list(grouped.values())


def allocate_discount_by_subtotal(groups, total_discount):
    if not groups or total_discount <= 0:
        return [Decimal("0.00")] * len(groups)

    total_subtotal = sum((group["subtotal"] for group in groups), Decimal("0.00"))
    if total_subtotal <= 0:
        return [Decimal("0.00")] * len(groups)

    allocations = []
    remaining_discount = money(total_discount)
    remaining_subtotal = total_subtotal

    for index, group in enumerate(groups):
        if index == len(groups) - 1:
            allocation = remaining_discount
        else:
            allocation = (
                money((group["subtotal"] / remaining_subtotal) * remaining_discount)
                if remaining_subtotal > 0
                else Decimal("0.00")
            )
            remaining_discount -= allocation
            remaining_subtotal -= group["subtotal"]
        allocations.append(allocation)
    return allocations


def get_session_key(request):
    return (
        request.headers.get("X-Session-Key")
        or request.query_params.get("session_key")
        or request.data.get("session_key")
        or None
    )


def merge_guest_cart_into_user_cart(guest_cart, user_cart):
    for guest_item in guest_cart.items.select_related("product", "variant"):
        user_item, created = CartItem.objects.get_or_create(
            cart=user_cart,
            product=guest_item.product,
            variant=guest_item.variant,
            defaults={"quantity": guest_item.quantity},
        )
        if not created:
            user_item.quantity += guest_item.quantity
            user_item.save(update_fields=["quantity", "updated_at"])
    guest_cart.delete()


def get_or_create_cart_for_request(request):
    incoming_session_key = get_session_key(request)
    if request.user.is_authenticated:
        user_cart, _ = Cart.objects.get_or_create(user=request.user)
        session_key = incoming_session_key or user_cart.session_key or uuid.uuid4().hex
        guest_cart = None
        if incoming_session_key:
            guest_cart = Cart.objects.filter(session_key=incoming_session_key).exclude(pk=user_cart.pk).first()
        if guest_cart:
            merge_guest_cart_into_user_cart(guest_cart, user_cart)
        if user_cart.session_key != session_key:
            user_cart.session_key = session_key
            user_cart.save(update_fields=["session_key", "updated_at"])
        return user_cart, session_key
    session_key = incoming_session_key or uuid.uuid4().hex
    guest_cart, _ = Cart.objects.get_or_create(session_key=session_key)
    return guest_cart, session_key


def calculate_cart_totals(cart):
    items = list(cart.items.select_related("product", "product__seller", "variant"))
    if not items:
        return calculate_totals_for_items([], coupon=cart.coupon)

    subtotal = sum((item.total_price for item in items), Decimal("0.00"))
    shipping_fee = sum(
        (calculate_shipping_fee_for_items(group["items"]) for group in group_cart_items_by_seller(items)),
        Decimal("0.00"),
    )
    discount_total = cart.coupon.calculate_discount(subtotal, shipping_fee) if cart.coupon else Decimal("0.00")
    taxable_amount = max(subtotal - min(discount_total, subtotal), Decimal("0.00"))
    tax_total = taxable_amount * TAX_RATE
    grand_total = subtotal + shipping_fee + tax_total - discount_total

    return {
        "subtotal": money(subtotal),
        "shipping_fee": money(shipping_fee),
        "discount_total": money(discount_total),
        "tax_total": money(tax_total),
        "grand_total": money(grand_total),
    }

def get_cashfree_payout_token():
    url = "https://sandbox.cashfree.com/payout/v1/authorize"

    headers = {
        "X-Client-Id": settings.CASHFREE_PAYOUT_CLIENT_ID,
        "X-Client-Secret": settings.CASHFREE_PAYOUT_CLIENT_SECRET,
    }

    try:
        res = requests.post(url, headers=headers, timeout=10)
        data = res.json()

        print("🔐 AUTH RESPONSE:", data)

        return data.get("data", {}).get("token")

    except Exception as e:
        print("❌ AUTH ERROR:", str(e))
        return None

def create_cashfree_payout(order, escrow):
    url = url = "https://sandbox.cashfree.com/payout/v2/transfer"

    token = get_cashfree_payout_token()
    
    if not token:
        return {
            "status": "failed",
            "error": "Auth failed"
        }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    seller = order.seller
    profile = seller.seller_profile

    transfer_id = f"payout_{order.order_number}"

    if not profile.bank_account_number or not profile.ifsc_code:
        print("❌ Missing bank details for seller:", seller.id)
        return {
            "status": "failed",
            "error": "Seller bank details missing"
        }

    data = {
        "transferId": transfer_id,
        "amount": float(escrow.held_amount),
        "currency": "INR",
        "transferMode": "banktransfer",
        "remarks": f"Payout for {order.order_number}",
        "beneficiary": {
            "name": profile.account_holder_name or seller.email,
            "bankAccount": profile.bank_account_number,
            "ifsc": profile.ifsc_code,
            "email": seller.email,
            "phone": "9999999999",
            "address1": "Test Address"
        }
    }
    
    try:
        print("🚀 INITIATING PAYOUT")
        print("➡️ URL:", url)
        print("➡️ DATA:", data)
        
        res = requests.post(url, json=data, headers=headers, timeout=10)

        print("📩 RAW RESPONSE STATUS:", res.status_code)
        print("📩 RAW RESPONSE BODY:", res.text)

        response = res.json()

        print("✅ PARSED RESPONSE:", response)

        return {
            "status": "success",
            "reference": transfer_id,
            "response": response
        }
    
    except Exception as e:
        print("❌ PAYOUT ERROR:", str(e))
        
        return {
            "status": "failed",
            "error": str(e)
        }
