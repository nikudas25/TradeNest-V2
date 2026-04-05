import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useShop } from "../context/ShopContext";
import { CartIcon, HeartIcon, SearchIcon, SparkIcon, UserIcon } from "./Icons";


const navItems = [
  { label: "Home", to: "/" },
  { label: "Browse", to: "/shop" },
  { label: "Sell", to: "/sell" },
  { label: "Wishlist", to: "/wishlist" },
  { label: "Orders", to: "/orders" },
];


export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, wishlist, user, logout, notice, error } = useShop();
  const [search, setSearch] = useState("");

  function handleSearchSubmit(event) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  }

  return (
    <header className="site-header">
      <div className="promo-strip">
        <span>
          <SparkIcon size={16} />
          TradeNest protects marketplace orders with escrow until buyers accept the item.
        </span>
        <span>One seller per cart for safer resale checkout</span>
      </div>

      {notice || error ? <div className={`flash-banner${error ? " is-error" : ""}`}>{error || notice}</div> : null}

      <div className="header-main container">
        <Link className="brand-mark" to="/">
          <span>TradeNest</span>
          <small>Marketplace</small>
        </Link>

        <form className="search-shell" onSubmit={handleSearchSubmit}>
          <SearchIcon size={18} />
          <input
            aria-label="Search products"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for grails, vintage bags, open-box tech..."
            value={search}
          />
        </form>

        <div className="header-actions">
          <Link className="icon-link" to="/wishlist">
            <HeartIcon size={18} />
            <span>{wishlist.length}</span>
          </Link>
          <Link className="icon-link" to="/cart">
            <CartIcon size={18} />
            <span>{cart.item_count || 0}</span>
          </Link>
          <Link className="icon-link" to="/account">
            <UserIcon size={18} />
            <span>{user ? "Account" : "Sign in"}</span>
          </Link>
        </div>
      </div>

      <div className="header-nav-wrap">
        <nav className="header-nav container">
          <div className="header-nav-links">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  isActive || (item.to === "/shop" && location.pathname.startsWith("/product"))
                    ? "is-active"
                    : ""
                }
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {user ? (
            <button className="text-button" onClick={logout} type="button">
              Sign out
            </button>
          ) : (
            <Link className="text-button" to="/account">
              Join TradeNest
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
