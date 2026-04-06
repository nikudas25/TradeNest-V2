import { useState } from "react";
import { Link } from "react-router-dom";

import { useShop } from "../context/ShopContext";
import { formatCurrency } from "../data/formatters";


const initialAddress = {
  recipient_name: "",
  phone_number: "",
  street_line_1: "",
  street_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  landmark: "",
  delivery_notes: "",
};


export function CheckoutPage() {
  const { cart, checkout, user } = useShop();
  const [shippingAddress, setShippingAddress] = useState(initialAddress);
  const [billingAddress, setBillingAddress] = useState(initialAddress);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [confirmation, setConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const sellerGroups = Object.values(
    cart.items.reduce((groups, item) => {
      const sellerKey = item.product?.seller?.id || item.product?.seller_name || item.product?.id;
      if (!groups[sellerKey]) {
        groups[sellerKey] = {
          seller_name: item.product?.seller?.store_name || item.product?.seller_name || "TradeNest seller",
          items: [],
        };
      }
      groups[sellerKey].items.push(item);
      return groups;
    }, {}),
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const placedOrder = await checkout({
        email: user.email,
        phone_number: shippingAddress.phone_number,
        shipping_address: shippingAddress,
        billing_address: sameAsShipping ? shippingAddress : billingAddress,
        same_as_shipping: sameAsShipping,
        payment_method: "escrow",
        notes: event.currentTarget.notes.value,
      });
      setConfirmation(placedOrder);
    } catch {
      // Flash messaging is handled in shared shop state.
    } finally {
      setSubmitting(false);
    }
  }

  function updateAddress(setter, field, value) {
    setter((current) => ({ ...current, [field]: value }));
  }

  if (confirmation) {
    const placedOrders = confirmation.orders || [];
    return (
      <div className="container success-panel">
        <p className="section-eyebrow">Order confirmed</p>
        <h1>{placedOrders.length > 1 ? `${placedOrders.length} escrow orders created` : placedOrders[0]?.order_number}</h1>
        <p>
          Sellers involved: <strong>{placedOrders.length}</strong>
        </p>
        <div className="review-list">
          {placedOrders.map((item) => (
            <article className="review-card" key={item.order_number}>
              <strong>{item.order_number}</strong>
              <p>{item.seller_name}</p>
              <span>
                Escrow: {item.escrow?.status || item.payment_status} • ETA{" "}
                {new Date(item.estimated_delivery).toLocaleDateString("en-IN")}
              </span>
            </article>
          ))}
        </div>
        <p>Total charged: {formatCurrency(confirmation.grand_total)}</p>
        <div className="hero-actions">
          <Link className="button button--primary" to="/orders">
            View orders
          </Link>
          <Link className="button button--ghost" to="/shop">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="container empty-panel">
        <h1>Your cart is empty</h1>
        <Link className="button button--primary" to="/shop">
          Add products
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container empty-panel">
        <h1>Sign in for TradeNest escrow checkout</h1>
        <p>Escrow orders require a buyer account so shipment, disputes, and payout release can be tracked safely.</p>
        <Link className="button button--primary" to="/account">
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack container">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Escrow checkout</p>
          <h1>Protected buyer payment flow</h1>
        </div>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="detail-card">
            <h2>Shipping details</h2>
            <div className="form-grid">
              {Object.entries(shippingAddress).map(([field, value]) => (
                <input
                  key={field}
                  onChange={(event) => updateAddress(setShippingAddress, field, event.target.value)}
                  placeholder={field.replaceAll("_", " ")}
                  required={!["street_line_2", "landmark", "delivery_notes"].includes(field)}
                  value={value}
                />
              ))}
            </div>
          </div>

          <div className="detail-card">
            <div className="row-between">
              <h2>Billing</h2>
              <label className="checkbox-row">
                <input checked={sameAsShipping} onChange={() => setSameAsShipping(!sameAsShipping)} type="checkbox" />
                Same as shipping
              </label>
            </div>

            {!sameAsShipping ? (
              <div className="form-grid">
                {Object.entries(billingAddress).map(([field, value]) => (
                  <input
                    key={field}
                    onChange={(event) => updateAddress(setBillingAddress, field, event.target.value)}
                    placeholder={field.replaceAll("_", " ")}
                    required={!["street_line_2", "landmark", "delivery_notes"].includes(field)}
                    value={value}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="detail-card">
            <h2>Escrow terms</h2>
            <div className="review-list">
              <article className="review-card">
                <strong>1. Buyer funds escrow</strong>
                <p>TradeNest holds the payment while the seller prepares shipment.</p>
              </article>
              <article className="review-card">
                <strong>2. Seller ships with tracking</strong>
                <p>The seller must mark the order as shipped before the escrow timeline can move forward.</p>
              </article>
              <article className="review-card">
                <strong>3. Buyer confirms receipt</strong>
                <p>Escrow releases only after the buyer accepts the item or a dispute is resolved.</p>
              </article>
            </div>
            <textarea name="notes" placeholder="Delivery notes or gift instructions" rows={4} />
          </div>

          <button className="button button--primary button--full" disabled={submitting} type="submit">
            {submitting ? "Placing order..." : "Place order"}
          </button>
        </form>

        <aside className="order-summary">
          <h2>Summary</h2>
          <div className="summary-row">
            <span>Seller orders</span>
            <strong>{sellerGroups.length}</strong>
          </div>
          {sellerGroups.map((group) => (
            <div className="checkout-seller-group" key={group.seller_name}>
              <div className="summary-row">
                <span>{group.seller_name}</span>
                <strong>{group.items.length} items</strong>
              </div>
              {group.items.map((item) => (
                <div className="summary-row" key={item.id}>
                  <span>
                    {item.product.name} × {item.quantity}
                  </span>
                  <strong>{formatCurrency(item.total_price)}</strong>
                </div>
              ))}
            </div>
          ))}
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(cart.subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Discount</span>
            <strong>-{formatCurrency(cart.discount_total)}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>{formatCurrency(cart.shipping_fee)}</strong>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <strong>{formatCurrency(cart.tax_total)}</strong>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <strong>{formatCurrency(cart.grand_total)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
