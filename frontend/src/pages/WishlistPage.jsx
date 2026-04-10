import { Link } from "react-router-dom";

import { ProductCard } from "../components/ProductCard";
import { useShop } from "../context/ShopContext";


export function WishlistPage() {
  const { wishlist, addToCart, toggleWishlist, isWishlisted } = useShop();
  const products = wishlist.map((item) => item.product || item);

  if (!products.length) {
    return (
      <div className="container empty-panel">
        <h1>Your wishlist is empty</h1>
        <p>Save products you want to revisit later.</p>
        <Link className="button button--primary" to="/shop">
          Explore products
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack container">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Wishlist</p>
          <h1>Saved for later</h1>
        </div>
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <ProductCard
            inWishlist={isWishlisted(product.id)}
            key={product.id}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            product={product}
          />
        ))}
      </div>
    </div>
  );
}

