import {Link} from "react-router-dom";
import {useState, useEffect} from "react"; //change1

import {ProductCard} from "../components/ProductCard";
import {SectionHeading} from "../components/SectionHeading";
import {useShop} from "../context/ShopContext";
import {ShieldIcon, TruckIcon} from "../components/Icons";
import { BuyerOrderIcon, SellerShipIcon, PaymentReleasedIcon } from "../components/Icons";


export function HomePage() {
    const {homeData, addToCart, toggleWishlist, isWishlisted, booting} = useShop();
    //change2 added carousel
    const slides = [
        {
            image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
            title: "Discover Rare Finds",
            subtitle: "Unique items from independent sellers",
            buttonText: "Sign In",
            buttonLink: "/login",
        },
        {
            image: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a",
            title: "Sell What You Don’t Need",
            subtitle: "Turn unused items into value",
            buttonText: "Browse Listings",
            buttonLink: "/shop",
        },
        {
            image: "https://images.unsplash.com/photo-1483985988355-763728e1935b",
            title: "Curated Collections",
            subtitle: "Vintage & collectible items",
            buttonText: "Start Selling",
            buttonLink: "/sell",
        },
    ];

    const [currentSlide, setCurrentSlide] = useState(0);

// Auto change slide
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // console.log("HOME PRODUCTS:", homeData.featured_products);

    return (
        <div className="page-stack">
            <div className="carousel">
                {/* ⬅️ LEFT BUTTON */}
                <button
                    className="carousel-btn left"
                    onClick={() =>
                        setCurrentSlide((prev) =>
                            prev === 0 ? slides.length - 1 : prev - 1
                        )
                    }
                >
                    ❮
                </button>

                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`carousel-slide ${index === currentSlide ? "active" : ""}`}
                    >
                        <img
                            src={`${slide.image}?auto=format&fit=crop&w=1200&q=80`}
                            alt=""
                        />
                        <div className="carousel-overlay">
                            <h2>{slide.title}</h2>
                            <p>{slide.subtitle}</p>

                            {slide.buttonText && (
                                <Link to={slide.buttonLink} className="carousel-cta">
                                    {slide.buttonText}
                                </Link>
                            )}
                        </div>
                    </div>
                ))}

                {/* ➡️ RIGHT BUTTON */}
                <button
                    className="carousel-btn right"
                    onClick={() =>
                        setCurrentSlide((prev) => (prev + 1) % slides.length)
                    }
                >
                    ❯
                </button>


            </div>

            {/* change 3 removed a box */}


            <section className="container">
                <SectionHeading
                    actionLabel="Browse listings"
                    actionTo="/shop"
                    // eyebrow="Market segments"
                    description="Guide buyers into collectible, vintage, and open-box inventory with category-led discovery."
                    title="Featured categories"
                />
                <div className="category-grid">
                    {(homeData.featured_categories || []).map((category) => (
                        <Link className="category-card" key={category.slug} to={`/shop?category=${category.slug}`}>
                            <img
                                alt={category.name}
                               src={
                                    category.image
                                        ? `http://localhost:8000${category.image}` // backend image
                                        : category.image_url
                                            ? `${category.image_url}?auto=format&fit=crop&w=500&q=80` // fallback image
                                            : "https://via.placeholder.com/300"
                                }
                            />
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
                    // eyebrow="Verified picks"
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
                            product={{
                                ...product,
                                image:
                                    product.image ||
                                    product.primary_image ||
                                    product.images?.[0]?.image ||
                                    product.images?.[0]?.image_url ||
                                    product.thumbnail_url
                            }}
                        />
                    ))}
                </div>
            </section>

             <section className="container escrow-section">
          <h2>How Escrow Works</h2>

          <div className="escrow-grid">
            <div className="escrow-card">
              <BuyerOrderIcon size={52} />
              <h3>1. Buyer Pays Securely</h3>
              <p>The buyer makes a payment which is held safely in escrow.</p>
            </div>

            <div className="escrow-card">
              <SellerShipIcon size={52} />
              <h3>2. Seller Ships Item</h3>
              <p>The seller ships the product after payment confirmation.</p>
            </div>

            <div className="escrow-card">
              <PaymentReleasedIcon size={52} />
              <h3>3. Payment Released</h3>
              <p>Funds are released to the seller after buyer approval.</p>
            </div>
          </div>
        </section>
        </div>
    );
}
