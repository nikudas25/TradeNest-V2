import { Link } from "react-router-dom";

import { formatCurrency } from "../data/formatters";
import { HeartIcon, StarIcon } from "./Icons";


export function ProductCard({ product, onAddToCart, onToggleWishlist, inWishlist = false, compact = false }) {
  if (!product) {
    return null;
  }

  return (
    <article className={`product-card${compact ? " product-card--compact" : ""}`}>
      <button
        className={`wishlist-chip${inWishlist ? " is-active" : ""}`}
        onClick={() => onToggleWishlist(product)}
        type="button"
      >
        <HeartIcon size={16} />
      </button>

      <Link className="product-media" to={`/product/${product.slug}`}>
        <img alt={product.name} src={product.primary_image || product.thumbnail_url} />
        {product.discount_percent ? <span className="product-badge">-{product.discount_percent}%</span> : null}
      </Link>

      <div className="product-content">
        <div className="product-meta">
          <span>{product.seller_name || product.brand}</span>
          <span className="rating-inline">
            <StarIcon size={14} />
            {Number(product.average_rating || 0).toFixed(1)}
          </span>
        </div>
        <Link className="product-title" to={`/product/${product.slug}`}>
          {product.name}
        </Link>
        <p className="product-copy">{product.short_description}</p>
        <div className="chip-row">
          <span className="detail-chip">{String(product.condition || "listed").replaceAll("_", " ")}</span>
          <span className="detail-chip">{product.escrow_required ? "Escrow protected" : "Direct sale"}</span>
        </div>
        <div className="price-row">
          <strong>{formatCurrency(product.current_price || product.price)}</strong>
          {product.compare_at_price ? <span>{formatCurrency(product.compare_at_price)}</span> : null}
        </div>
        <div className="product-actions">
          <button
            className="button button--secondary"
            onClick={() => onAddToCart(product, product.variants?.[0] || null, 1)}
            type="button"
          >
            Add to cart
          </button>
          <Link className="button button--ghost" to={`/product/${product.slug}`}>
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
