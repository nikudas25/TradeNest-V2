import { useState } from "react";
import { Link } from "react-router-dom";

import { useShop } from "../context/ShopContext";


export function Footer() {
  const { subscribeToNewsletter } = useShop();
  const [email, setEmail] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    await subscribeToNewsletter(email.trim());
    setEmail("");
  }

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p className="section-eyebrow">TradeNest</p>
          <h3>Buy and resell one-of-one items with seller trust signals and escrow protection.</h3>
          <p className="footer-copy">
            TradeNest is built for independent sellers and careful buyers. Each listing can show
            condition notes, seller reputation, and an escrow-backed order flow before payout.
          </p>
        </div>

        <div>
          <h4>Explore</h4>
          <div className="footer-links">
            <Link to="/shop">Browse listings</Link>
            <Link to="/sell">Sell an item</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/orders">Orders</Link>
            <Link to="/account">My account</Link>
          </div>
        </div>

        <div>
          <h4>Stay in the loop</h4>
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <input
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              type="email"
              value={email}
            />
            <button className="button button--primary" type="submit">
              Subscribe
            </button>
          </form>
          <p className="footer-copy">Escrow updates, seller growth tips, and high-intent buyer traffic drops.</p>
        </div>
      </div>
    </footer>
  );
}
