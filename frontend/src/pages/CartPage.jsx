import {useState} from "react";
import {Link} from "react-router-dom";

import {QuantityStepper} from "../components/QuantityStepper";
import {useShop} from "../context/ShopContext";
import {formatCurrency} from "../data/formatters";


export function CartPage() {
    const {cart, updateCartItem, removeCartItem, applyCoupon} = useShop();
    const [couponMessage, setCouponMessage] = useState("");
    const sellerCount =
        cart.seller_count ||
        new Set(cart.items.map((item) => item.product?.seller?.id || item.product?.seller_name || item.product?.id)).size;

    async function handleCouponSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const code = formData.get("code");
        if (!code) {
            return;
        }
        try {
            await applyCoupon(String(code));
            setCouponMessage("Coupon applied.");
            event.currentTarget.reset();
        } catch (error) {
            setCouponMessage(error.message);
        }
    }

    async function handleQuantityChange(itemId, value) {
        try {
            await updateCartItem(itemId, value);
        } catch {
            // Flash messaging is handled in shared shop state.
        }
    }

    async function handleRemove(itemId) {
        try {
            await removeCartItem(itemId);
        } catch {
            // Flash messaging is handled in shared shop state.
        }
    }

    if (!cart.items.length) {
        return (
            <div className="container empty-panel">
                <h1>Your cart is empty</h1>
                <p>Add products from the catalog to start building an order.</p>
                <Link className="button button--primary" to="/shop">
                    Browse products
                </Link>
            </div>
        );
    }

    return (
        <div className="page-stack container">
            <div className="section-heading">
                <div>
                    <p className="section-eyebrow">Cart</p>
                    <h1>Review your escrow cart</h1>
                </div>
            </div>

            <div className="cart-layout">
                <section className="cart-items">
                    {cart.items.map((item) => (
                        <article className="cart-item" key={item.id}>
                            <img
                                alt={item.product.name}
                                src={
                                    item.product.images?.length > 0
                                        ? `http://localhost:8000${item.product.images[0].image}`
                                        : item.product.primary_image
                                            ? `http://localhost:8000${item.product.primary_image}`
                                            : ""
                                }
                            />
                            <div className="cart-item-copy">
                                <h3>{item.product.name}</h3>
                                <p>
                                    {item.product.brand} • {item.variant?.title || item.product.category}
                                </p>
                                <p>Seller: {item.product.seller?.store_name || item.product.seller_name || "TradeNest seller"}</p>
                                <strong>{formatCurrency(item.unit_price)}</strong>
                            </div>
                            <div className="cart-item-actions">
                                <QuantityStepper
                                    onChange={(value) => handleQuantityChange(item.id, value)}
                                    value={item.quantity}
                                />
                                <button className="text-button" onClick={() => handleRemove(item.id)} type="button">
                                    Remove
                                </button>
                            </div>
                        </article>
                    ))}
                </section>

                <aside className="order-summary">
                    <h2>Order summary</h2>
                    <div className="summary-row">
                        <span>Sellers</span>
                        <strong>{sellerCount}</strong>
                    </div>
                    <div className="summary-row">
                        <span>Subtotal</span>
                        <strong>{formatCurrency(cart.subtotal)}</strong>
                    </div>
                    <div className="summary-row">
                        <span>Shipping</span>
                        <strong>{formatCurrency(cart.shipping_fee)}</strong>
                    </div>
                    <div className="summary-row">
                        <span>Discount</span>
                        <strong>-{formatCurrency(cart.discount_total)}</strong>
                    </div>
                    <div className="summary-row">
                        <span>Tax</span>
                        <strong>{formatCurrency(cart.tax_total)}</strong>
                    </div>
                    <div className="summary-row summary-row--total">
                        <span>Total</span>
                        <strong>{formatCurrency(cart.grand_total)}</strong>
                    </div>

                    <form className="coupon-form" onSubmit={handleCouponSubmit}>
                        <input name="code" placeholder="Coupon code" type="text"/>
                        <button className="button button--secondary" type="submit">
                            Apply
                        </button>
                    </form>
                    {couponMessage ? <p className="helper-copy">{couponMessage}</p> : null}

                    <Link className="button button--primary button--full" to="/checkout">
                        Proceed to escrow
                    </Link>
                </aside>
            </div>
        </div>
    );
}
