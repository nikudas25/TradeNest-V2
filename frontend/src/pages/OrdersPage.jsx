import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { formatCurrency, formatDate } from "../data/formatters";


export function OrdersPage() {
  const { orders, token, booting, cancelOrder, confirmReceipt, openDispute } = useShop();

  async function handleCancelOrder(orderNumber) {
    try {
      await cancelOrder(orderNumber);
    } catch {
      // Flash messaging is handled in shared shop state.
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
        <div>
          <p className="section-eyebrow">Orders</p>
          <h1>Buyer orders and escrow status</h1>
        </div>
      </div>

      <div className="order-list">
        {orders.map((order) => (
          <article className="order-card" key={order.order_number}>
            <div className="row-between">
              <div>
                <strong>{order.order_number}</strong>
                <p>{formatDate(order.placed_at)}</p>
                {order.seller_name ? <p>Seller: {order.seller_name}</p> : null}
              </div>
              <div className="order-status-group">
                <span className="detail-chip">{order.status}</span>
                <span className="detail-chip">{order.escrow?.status || order.payment_status}</span>
              </div>
            </div>
            <div className="summary-row">
              <span>Total</span>
              <strong>{formatCurrency(order.grand_total)}</strong>
            </div>
            <div className="summary-row">
              <span>Items</span>
              <strong>{order.items?.length || 0}</strong>
            </div>
            {order.escrow ? (
              <div className="summary-row">
                <span>Escrow held</span>
                <strong>{formatCurrency(order.escrow.held_amount)}</strong>
              </div>
            ) : null}
            <div className="order-line-items">
              {(order.items || []).slice(0, 3).map((item) => (
                <div className="summary-row" key={`${order.order_number}-${item.id}`}>
                  <span>
                    {item.product_name} × {item.quantity}
                  </span>
                  <strong>{formatCurrency(item.line_total)}</strong>
                </div>
              ))}
            </div>
            {["pending", "awaiting_shipment"].includes(order.status) ? (
              <div className="hero-actions">
                <button
                  className="button button--ghost"
                  onClick={() => handleCancelOrder(order.order_number)}
                  type="button"
                >
                  Cancel order
                </button>
              </div>
            ) : null}
            {order.status === "shipped" ? (
              <div className="hero-actions">
                <button className="button button--secondary" onClick={() => confirmReceipt(order.order_number)} type="button">
                  Confirm receipt
                </button>
                <button
                  className="button button--ghost"
                  onClick={() => openDispute(order.order_number, "Buyer reported an issue with the delivered item.")}
                  type="button"
                >
                  Open dispute
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
