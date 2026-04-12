import {Link} from "react-router-dom";
import {useState, useEffect} from "react"; //change1

import {ProductCard} from "../components/ProductCard";
import {SectionHeading} from "../components/SectionHeading";
import {useShop} from "../context/ShopContext";
import {ShieldIcon, TruckIcon} from "../components/Icons";


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
                    eyebrow="Market segments"
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
                                        ? `http://localhost:8000${category.image}`
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
