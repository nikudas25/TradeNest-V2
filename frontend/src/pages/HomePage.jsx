import { Link } from "react-router-dom";

import { ProductCard } from "../components/ProductCard";
import { SectionHeading } from "../components/SectionHeading";
import { useShop } from "../context/ShopContext";
import { ShieldIcon, TruckIcon } from "../components/Icons";


export function HomePage() {
  const { homeData, addToCart, toggleWishlist, isWishlisted, booting } = useShop();

  return (
    <div className="page-stack">
      <section className="hero-section container">
        <div className="hero-copy-panel">
          <div className="hero-copy-inner">
            <div className="hero-copy-text">
              <p className="section-eyebrow">Trusted resale marketplace</p>
              <h1>Less to keep, more to share discover value, rare and fair.</h1>
              <p>
                Give your unused items a new purpose and pass them on to someone who truly needs them,
                while discovering unique pieces that perfectly fit your own story.
                TradeNest helps independent sellers list one-of-one inventory while giving buyers
                condition notes, seller trust signals, and protected escrow payouts instead of blind transfers.
              </p>
            </div>
            <div className="hero-copy-image">
              <img
                src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=520&q=80"
                alt="Vintage Omega Dress Watch"
              />
            </div>
          </div>
          <div className="hero-actions">
            <Link className="button button--primary" to="/shop">
              Browse listings
            </Link>
            <Link className="button button--ghost" to="/sell">
              Start selling
            </Link>
          </div>
          <div className="hero-trust-grid">
            <article>
              <TruckIcon size={18} />
              <strong>Seller-led shipping</strong>
              <span>Independent sellers fulfill each order after escrow funding.</span>
            </article>
            <article>
              <ShieldIcon size={18} />
              <strong>Escrow checkout</strong>
              <span>Funds release only after buyer confirmation or marketplace resolution.</span>
            </article>
          </div>
        </div>

      </section>

      <section className="container">
        <SectionHeading
          actionLabel="Browse listings"
          actionTo="/shop"
          eyebrow="Market segments"
          description="Guide buyers into collectible, vintage, and open-box inventory with category-led discovery."
          title="Featured categories"
        />
        <div className="category-grid">
          {(homeData.featured_categories || []).map((category) => (
            <Link className="category-card" key={category.slug} to={`/shop?category=${category.slug}`}>
              <img alt={category.name} src={category.image_url} />
              <div>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container">
        <SectionHeading
          eyebrow="Verified picks"
          description="Each listing surfaces condition, seller identity, and escrow protection before checkout."
          title={booting ? "Loading resale inventory..." : "Marketplace-ready listing grid"}
        />
        <div className="product-grid">
          {(homeData.featured_products || []).map((product) => (
            <ProductCard
              inWishlist={isWishlisted(product.id)}
              key={product.id}
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
              product={product}
            />
          ))}
        </div>
      </section>

      <section className="container spotlight-section">
        <div className="spotlight-copy">
          <p className="section-eyebrow">Why TradeNest works</p>
          <h2>Trust is treated like a product feature, not a footnote after checkout.</h2>
          <p>
            Buyers can inspect seller credibility, item condition, and authenticity status before paying.
            Sellers get a premium listing surface without having to convince every buyer manually.
          </p>
          <div className="brand-pill-row">
            {(homeData.featured_brands || []).map((brand) => (
              <span className="brand-pill" key={brand.slug}>
                {brand.name}
              </span>
            ))}
          </div>
        </div>
        <div className="testimonial-stack">
          {(homeData.testimonials || []).map((item) => (
            <article className="testimonial-card" key={item.id}>
              <p>{item.quote}</p>
              <strong>{item.author}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
