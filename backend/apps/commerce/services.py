import uuid
from decimal import Decimal, ROUND_HALF_UP

from apps.commerce.models import Cart, CartItem


STANDARD_SHIPPING_FEE = Decimal("149.00")
FREE_SHIPPING_THRESHOLD = Decimal("2999.00")
TAX_RATE = Decimal("0.12")


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


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
    subtotal = sum((item.total_price for item in cart.items.all()), Decimal("0.00"))
    if subtotal == 0:
        shipping_fee = Decimal("0.00")
    elif subtotal >= FREE_SHIPPING_THRESHOLD or any(
        item.product.free_shipping for item in cart.items.select_related("product")
    ):
        shipping_fee = Decimal("0.00")
    else:
        shipping_fee = STANDARD_SHIPPING_FEE

    discount_total = Decimal("0.00")
    if cart.coupon:
        discount_total = cart.coupon.calculate_discount(subtotal, shipping_fee)

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
