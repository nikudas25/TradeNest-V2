import {Link} from "react-router-dom";

import {formatCurrency} from "../data/formatters";
import {HeartIcon, StarIcon, CartIcon} from "./Icons";


export function ProductCard({product, onAddToCart, onToggleWishlist, inWishlist = false, compact = false}) {
    if (!product) {
        return null;
    }

    async function handleAddToCart() {
        try {
            await onAddToCart(product, product.variants?.[0] || null, 1);
        } catch {
            // Flash messaging is handled in shared shop state.
        }
    }

    return (
        <article className={`product-card${compact ? " product-card--compact" : ""}`}>
            <button
                className={`wishlist-chip${inWishlist ? " is-active" : ""}`}
                onClick={() => onToggleWishlist(product)}
                type="button"
            >
                <HeartIcon size={16}/>
            </button>

            <Link className="product-media" to={`/product/${product.slug}`}>
                <img
                    alt={product.name}
                    src={
                        product.image ||
                        (product.primary_image
                        ? `http://localhost:8000${product.primary_image}`
                        : product.images?.[0]?.image
                            ? `http://localhost:8000${product.images[0].image}`
                            : "https://via.placeholder.com/300")
                    }
                />
            </Link>

            <div className="product-content">
                <div className="product-meta">
                    <span>{product.seller_name || product.brand}</span>
                    {/* <span className="rating-inline">
            <StarIcon size={14}/>
                        {Number(product.average_rating || 0).toFixed(1)}
          </span> */}
                </div>
                <Link className="product-title" to={`/product/${product.slug}`}>
                    {product.name}
                </Link>
                {/* <p className="product-copy">{product.short_description}</p> */}
                {/* <div className="chip-row">
                    <span className="detail-chip">{String(product.condition || "listed").replaceAll("_", " ")}</span>
                    <span className="detail-chip">{product.escrow_required ? "Escrow protected" : "Direct sale"}</span>
                </div> */}
                <div className="price-row">
                    <strong>{formatCurrency(product.current_price ?? product.price ?? 0)}</strong>
                    {/* {product.compare_at_price ? <span>{formatCurrency(product.compare_at_price)}</span> : null} */}
                </div>
                <div className="product-actions">
                    <button
                        className="button button--secondary"
                        onClick={handleAddToCart}
                        type="button"
                    >
                    <CartIcon size={18} />
                    </button>
                    <Link className="button button--ghost" to={`/product/${product.id}`}>
                        View
                    </Link>
                </div>
            </div>
        </article>
    );
}
