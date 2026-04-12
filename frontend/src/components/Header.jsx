import {useState, useEffect} from "react";
import {Link, NavLink, useLocation, useNavigate} from "react-router-dom";
import logo from "../logo.png";
import {useShop} from "../context/ShopContext";
import {formatCurrency} from "../data/formatters";
import {CartIcon, HeartIcon, SearchIcon, SparkIcon, UserIcon, TruckIcon} from "./Icons";
import {HomeIcon, BrowseIcon, SellIcon} from "./Icons";

const navItems = [
    {label: "Home", to: "/"},
    {label: "Browse", to: "/shop"},
    {label: "Sell", to: "/sell"},
    {label: "Wishlist", to: "/wishlist"},
    {label: "Orders", to: "/orders"},
];


export function Header() {
    const navigate = useNavigate();
    const location = useLocation();
    const {cart, wishlist, user, logout, notice, error} = useShop();
    const [search, setSearch] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);

    const logoText = "TRADE NEST";
    const [logoIndex, setLogoIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);


    useEffect(() => {
        if (!isHovered) return;

        if (logoIndex < logoText.length) {
            const timer = setTimeout(() => {
                setLogoIndex((prev) => prev + 1);
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [logoIndex, isHovered]);
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

            {notice || error ?
                <div className={`flash-banner${error ? " is-error" : ""}`}>{error || notice}</div> : null}

            <div className="header-main container has-menu">
                <Link
                    className="brand-mark"
                    to="/"
                    onMouseEnter={() => {
                        setIsHovered(true);
                        setLogoIndex(0); // restart typing
                    }}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="logo-container">
                        <img src={logo} alt="logo" className="logo-image"/>
                        <span className="logo-typing-wrapper">
              <span className="logo-typing">
                {isHovered
                    ? logoText.substring(0, logoIndex)
                    : logoText}

                  {isHovered && logoIndex < logoText.length && (
                      <span className="cursor">|</span>
                  )}
              </span>
            </span>
                    </div>
                </Link>

                <form className="search-shell" onSubmit={handleSearchSubmit}>
                    <SearchIcon size={18}/>
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
                            <CartIcon size={18}/>
                            <span>{cart.item_count || 0}</span>
                        </Link>
                        {cartOpen && (
                            <div className="cart-dropdown">
                                {cart.items.length ? (
                                    <>
                                        {cart.items.slice(0, 3).map((item) => (
                                            <div className="cart-dropdown-item" key={item.id}>
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
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setMenuOpen(false)}
                                        className={({isActive}) => {
                                            let classes = "menu-item ";
                                            if (
                                                isActive ||
                                                (item.to === "/shop" &&
                                                    location.pathname.startsWith("/product"))
                                            ) {
                                                classes += "is-active";
                                            }
                                            return classes;
                                        }}
                                    >
                                        {item.label === "Home" && <HomeIcon size={16}/>}
                                        {item.label === "Browse" && <BrowseIcon size={16}/>}
                                        {item.label === "Sell" && <SellIcon size={16}/>}
                                        {item.label === "Wishlist" && <HeartIcon size={16}/>}
                                        {item.label === "Orders" && <TruckIcon size={16}/>}
                                        {item.label}
                                    </NavLink>
                                ))}

                                {/* Account / Sign in */}
                                <NavLink
                                    to="/account"
                                    className="menu-item"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <UserIcon size={16}/>
                                    {user ? "Account" : "Sign in"}
                                </NavLink>

                                {/* Sign out */}
                                {user && (
                                    <button
                                        className="text-button"
                                        onClick={() => {
                                            logout();
                                            setMenuOpen(false);
                                        }}
                                        type="button"
                                    >
                                        Sign out
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
