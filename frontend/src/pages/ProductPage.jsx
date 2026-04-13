import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { ProductCard } from "../components/ProductCard";
import { QuantityStepper } from "../components/QuantityStepper";
import { useShop } from "../context/ShopContext";
import { formatCurrency, formatDate } from "../data/formatters";


export function ProductPage() {
  const { slug } = useParams();
  const {
    addToCart,
    getProductFallback,
    isWishlisted,
    toggleWishlist,
    token,
    trackRecentlyViewed,
  } = useShop();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [review, setReview] = useState({ title: "", rating: 5, body: "" });
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await api.getProduct(slug);
        setProduct(data);
        setSelectedImage(data.images?.[0]?.image_url || data.primary_image || data.thumbnail_url);
        setSelectedVariant(data.variants?.[0] || null);
        if (data.id) {
          trackRecentlyViewed(data.id);
        }
      } catch {
        const fallbackProduct = getProductFallback(slug);
        setProduct(fallbackProduct);
        setSelectedImage(
          fallbackProduct?.images?.[0]?.image_url || fallbackProduct?.primary_image || fallbackProduct?.thumbnail_url,
        );
        setSelectedVariant(fallbackProduct?.variants?.[0] || null);
      }
    }

    loadProduct();
  }, [slug]);

  async function handleReviewSubmit(event) {
    event.preventDefault();
    if (!token) {
      setReviewMessage("Sign in to post a review.");
      return;
    }
    try {
      await api.createReview(slug, {
        title: review.title,
        body: review.body,
        rating: Number(review.rating),
      });
      setReviewMessage("Review submitted.");
      const refreshed = await api.getProduct(slug);
      setProduct(refreshed);
      setReview({ title: "", rating: 5, body: "" });
    } catch (error) {
      setReviewMessage(error.message);
    }
  }

  async function handleAddToCart() {
    try {
      await addToCart(product, selectedVariant, quantity);
    } catch {
      // Flash messaging is handled in shared shop state.
    }
  }

  if (!product) {
    return <div className="container empty-panel">Loading product...</div>;
  }

  const displayPrice = selectedVariant?.effective_price || product.current_price || product.price;

  return (
    <div className="page-stack container">
      <section className="product-detail-layout">
        <div className="product-gallery">
          <div className="product-gallery-main">
            <img alt={product.name} src={selectedImage} />
          </div>
          <div className="product-gallery-thumbs">
            {(product.images || []).map((image) => (
              <button
                className={selectedImage === image.image_url ? "is-active" : ""}
                key={image.id}
                onClick={() => setSelectedImage(image.image_url)}
                type="button"
              >
                <img alt={image.alt_text || product.name} src={image.image_url} />
              </button>
            ))}
          </div>
        </div>

        <div className="product-detail-copy">
          <p className="section-eyebrow">
            {product.brand} • {product.category} • {String(product.condition).replaceAll("_", " ")}
          </p>
          <h1>{product.name}</h1>
          <p className="product-detail-lead">{product.description}</p>
          <div className="price-row price-row--large">
            <strong>{formatCurrency(displayPrice)}</strong>
            {product.compare_at_price ? <span>{formatCurrency(product.compare_at_price)}</span> : null}
          </div>
          <div className="chip-row">
            <span className="detail-chip">{product.review_count} reviews</span>
            <span className="detail-chip">{String(product.authenticity_status || "").replaceAll("_", " ")}</span>
            <span className="detail-chip">{product.escrow_required ? "Escrow protected" : "Direct sale"}</span>
          </div>

          {product.variants?.length ? (
            <div className="detail-block">
              <label>Choose a variant</label>
              <div className="option-row">
                {product.variants.map((variant) => (
                  <button
                    className={selectedVariant?.id === variant.id ? "option-chip is-active" : "option-chip"}
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    type="button"
                  >
                    {variant.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="detail-purchase-row">
            <QuantityStepper onChange={setQuantity} value={quantity} />
            <button
              className="button button--primary"
              onClick={handleAddToCart}
              type="button"
            >
              Add to cart
            </button>
            <button className="button button--ghost" onClick={() => toggleWishlist(product)} type="button">
              {isWishlisted(product.id) ? "Wishlisted" : "Save"}
            </button>
          </div>

          <div className="detail-block">
            <label>Listing details</label>
            <ul className="spec-list">
              {Object.entries(product.specs || {}).map(([key, value]) => (
                <li key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="detail-secondary-grid">
        <article className="detail-card">
          <h2>Seller and escrow</h2>
          <div className="review-list">
            <article className="review-card">
              <strong>{product.seller?.store_name || product.seller_name}</strong>
              <p>
                {product.seller?.city || product.ships_from} • {product.seller?.is_verified ? "Verified seller" : "Independent seller"}
              </p>
              <p>Seller rating: {product.seller?.seller_rating || product.average_rating}</p>
              <p>{product.seller?.escrow_policy || "Funds stay protected until buyer acceptance."}</p>
            </article>
            <article className="review-card">
              <strong>Condition notes</strong>
              <p>{product.condition_notes || "Seller has not added extra notes yet."}</p>
              <span>Ships from {product.ships_from || product.seller?.city || "TradeNest network"}</span>
            </article>
          </div>
        </article>

        <article className="detail-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Reviews</p>
              <h2>Customer feedback</h2>
            </div>
          </div>
          <div className="review-list">
            {(product.reviews || []).length === 0 ? (
              <p>No reviews yet. Be the first to share feedback.</p>
            ) : (
              product.reviews.map((item) => (
                <article className="review-card" key={item.id}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <span>
                    {item.user_name} • {formatDate(item.created_at)}
                  </span>
                </article>
              ))
            )}
          </div>

          <form className="review-form" onSubmit={handleReviewSubmit}>
            <h3>Write a review</h3>
            <input
              onChange={(event) => setReview((current) => ({ ...current, title: event.target.value }))}
              placeholder="Review title"
              value={review.title}
            />
            <select
              onChange={(event) => setReview((current) => ({ ...current, rating: event.target.value }))}
              value={review.rating}
            >
              <option value={5}>5 stars</option>
              <option value={4}>4 stars</option>
              <option value={3}>3 stars</option>
              <option value={2}>2 stars</option>
              <option value={1}>1 star</option>
            </select>
            <textarea
              onChange={(event) => setReview((current) => ({ ...current, body: event.target.value }))}
              placeholder="What stood out?"
              rows={4}
              value={review.body}
            />
            <button className="button button--secondary" type="submit">
              Submit review
            </button>
            {reviewMessage ? <p className="helper-copy">{reviewMessage}</p> : null}
          </form>
        </article>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">More from the marketplace</p>
            <h2>Related listings</h2>
          </div>
          <Link className="section-link" to="/shop">
            Browse more
          </Link>
        </div>
        <div className="product-grid">
          {(product.related_products || []).map((item) => (
            <ProductCard
              inWishlist={isWishlisted(item.id)}
              key={item.id}
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
              product={item}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
