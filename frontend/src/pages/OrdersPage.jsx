import { Link } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { formatCurrency, formatDate } from "../data/formatters";
import { useState } from "react";

export function OrdersPage() {
  const { orders, token, booting, cancelOrder, confirmReceipt, openDispute } = useShop();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [filter, setFilter] = useState("all");

  async function handleCancelOrder(orderNumber) {
    try {
      await cancelOrder(orderNumber);
    } catch {}
  }

  async function submitRating() {
    try {
      const response = await fetch(
        `/api/orders/${selectedOrder.order_number}/rate/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // change to Token if needed
          },
          body: JSON.stringify({
            rating,
            review,
          }),
        }
      );

      if (!response.ok) throw new Error();

      alert("Rating submitted!");
      setSelectedOrder(null);
      setRating(5);
      setReview("");
    } catch {
      alert("Failed to submit rating");
    }
  }

  if (booting) {
    return <div className="container empty-panel">Loading orders...</div>;
  }

  if (!token) {
    return (
      <div className="container empty-panel">
        <h1>Sign in to view your orders</h1>
        <p>Your order history is only available to logged-in buyers.</p>
        <Link className="button button--primary" to="/account">
          Sign in
        </Link>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="container empty-panel">
        <h1>No orders yet</h1>
        <p>Your order history will show up here.</p>
        <Link className="button button--primary" to="/shop">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack container">
      <div className="section-heading">
        <h1>Your Orders</h1>
      </div>

      <div className="order-list">
        {orders.map((order) => (
          <article className="order-card" key={order.order_number}>
            <div>
              <strong>{order.order_number}</strong>
              <p>{formatDate(order.placed_at)}</p>
              <p>Seller: {order.seller_name}</p>
              <p>Status: {order.status}</p>
              <p>Total: {formatCurrency(order.grand_total)}</p>
            </div>

            {/* Cancel */}
            {["pending", "awaiting_shipment"].includes(order.status) && (
              <button
                className="button button--ghost"
                onClick={() => handleCancelOrder(order.order_number)}
              >
                Cancel Order
              </button>
            )}

            {/* Shipped */}
            {order.status === "shipped" && (
              <div className="hero-actions">
                <button
                  className="button button--secondary"
                  onClick={() => confirmReceipt(order.order_number)}
                >
                  Confirm Receipt
                </button>

                <button
                  className="button button--ghost"
                  onClick={() =>
                    openDispute(order.order_number, "Issue with item")
                  }
                >
                  Open Dispute
                </button>
              </div>
            )}

            {/* Completed → Show Rating */}
            {order.status === "completed" && (
              <button
                className="button button--primary"
                onClick={() => setSelectedOrder(order)}
              >
                ⭐ Rate Seller
              </button>
            )}
          </article>
        ))}
      </div>

      {/* Rating Modal */}
      {selectedOrder && (
        <div className="modal">
          <div className="modal-content">
            <h3>Rate Seller</h3>

            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              <option value={5}>5 ⭐</option>
              <option value={4}>4 ⭐</option>
              <option value={3}>3 ⭐</option>
              <option value={2}>2 ⭐</option>
              <option value={1}>1 ⭐</option>
            </select>

            <textarea
              placeholder="Write a review (optional)"
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />

            <div className="hero-actions">
              <button
                className="button button--primary"
                onClick={submitRating}
              >
                Submit
              </button>

              <button
                className="button button--ghost"
                onClick={() => setSelectedOrder(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}