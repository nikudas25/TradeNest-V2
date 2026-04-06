import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useShop } from "../context/ShopContext";
import { formatCurrency } from "../data/formatters";
import { CartIcon, HeartIcon, SearchIcon, SparkIcon, UserIcon, TruckIcon } from "./Icons";


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
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const placeholders = [
    "Search for grails....",
    "Search for vintage bag....",
    "Search for open-box tech....",
  ];

  const currentPlaceholder = placeholders[placeholderIndex];
  const displayText = currentPlaceholder.substring(0, charIndex);

  // Typing effect for each character
  useEffect(() => {
    if (charIndex < currentPlaceholder.length) {
      const typingTimer = setTimeout(() => {
        setCharIndex((prev) => prev + 1);
      }, 80); // Speed of typing in milliseconds
      return () => clearTimeout(typingTimer);
    } else if (charIndex === currentPlaceholder.length) {
      // Wait before moving to next placeholder
      const nextTimer = setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        setCharIndex(0);
      }, 2000); // Pause before next sentence
      return () => clearTimeout(nextTimer);
    }
  }, [charIndex, currentPlaceholder, placeholders.length]);

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
        <span>Mix sellers in one cart and TradeNest will split checkout into protected escrow orders</span>
      </div>

      {notice || error ? <div className={`flash-banner${error ? " is-error" : ""}`}>{error || notice}</div> : null}

      <div className="header-main container has-menu">
        <Link className="brand-mark" to="/">
          <span>TradeNest</span>
        </Link>

        <form className="search-shell" onSubmit={handleSearchSubmit}>
          <SearchIcon size={18} />
          <input
            aria-label="Search products"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={displayText}
            value={search}
          />
        </form>

        <div className="header-actions">
          <div
            className="cart-dropdown-container"
            onMouseEnter={() => setCartOpen(true)}
            onMouseLeave={() => setCartOpen(false)}
          >
            <Link className="icon-link" to="/cart">
              <CartIcon size={18} />
              <span>{cart.item_count || 0}</span>
            </Link>
            {cartOpen && (
              <div className="cart-dropdown">
                {cart.items.length ? (
                  <>
                    {cart.items.slice(0, 3).map((item) => (
                      <div className="cart-dropdown-item" key={item.id}>
                        <img
                          src={item.product.primary_image || item.product.thumbnail_url}
                          alt={item.product.name}
                        />
                        <div className="cart-dropdown-item-copy">
                          <strong>{item.product.name}</strong>
                          <span>{item.product.brand || item.product.category}</span>
                          <strong>{formatCurrency(item.unit_price)}</strong>
                        </div>
                      </div>
                    ))}
                    <div className="cart-dropdown-footer">
                      <Link className="button button--secondary button--full" to="/cart">
                        View more
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="cart-dropdown-empty">Your cart is empty</div>
                )}
              </div>
            )}
          </div>
          <Link className="icon-link" to="/account">
            <UserIcon size={18} />
            <span>{user ? "Account" : "Sign in"}</span>
          </Link>
        </div>

        <div 
          className="menu-container"
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button className="menu-button" type="button">
            ⋮
          </button>
          {menuOpen && (
            <div className="menu-dropdown">
              {navItems.map((item) => (
                <NavLink
                  className={({ isActive }) => {
                    let classes = "menu-item ";
                    if (isActive || (item.to === "/shop" && location.pathname.startsWith("/product"))) {
                      classes += "is-active";
                    }
                    return classes;
                  }}
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label === "Wishlist" && <HeartIcon size={16} />}
                  {item.label === "Orders" && <TruckIcon size={16} />}
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <button className="text-button" onClick={() => { logout(); setMenuOpen(false); }} type="button">
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      </header>
    );
  }
