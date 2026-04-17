import { startTransition, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import { ProductCard } from "../components/ProductCard";
import { SectionHeading } from "../components/SectionHeading";
import { useShop } from "../context/ShopContext";
import { fallbackBrands, fallbackCategories } from "../data/fallbackStore";
import jordanShoes from "../assets/product-image/jordanShoes.webp";
import Headphone from "../assets/product-image/Headphone.webp";
import leatherToteBag from "../assets/product-image/leatherToteBag.webp";
import watch from "../assets/product-image/watch.webp";
export const fallbackProducts = [
    {
    id: 1,
    slug:"1",
    name: "Jordan 1 Retro High",
    image: jordanShoes,
    price: 12999
  },
  {
    id: 2,
    slug:"2",
    name: "Sony WH-1000XM5",
    image: Headphone,
    price: 24999
  },
  {
    id: 3,
    slug:"3",
    name: "Leather Tote Bag",
    image: leatherToteBag,
    price: 3499
  },
  {
    id: 4,
    slug:"4",
    name: "Watch",
    image: watch,
    price: 5999
  }
];

function unwrapResults(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload?.results || [];
}


function filterFallbackProducts(searchParams) {
  let products = [...fallbackProducts];
  const query = searchParams.get("q")?.toLowerCase();
  const category = searchParams.get("category");
  const brand = searchParams.get("brand");
  const condition = searchParams.get("condition");
  const minPrice = Number(searchParams.get("min_price") || 0);
  const maxPrice = Number(searchParams.get("max_price") || 0);
  const sort = searchParams.get("sort");

  if (query) {
  products = products.filter((item) =>
    [item.name, item.short_description, item.category, item.brand].some((field) =>
      (field || "").toLowerCase().includes(query)
    )
  );
}
  if (category) {
    products = products.filter((item) => item.category_slug === category);
  }
  if (brand) {
    products = products.filter((item) => item.brand_slug === brand);
  }
  if (condition) {
    products = products.filter((item) => item.condition === condition);
  }
  if (minPrice) {
    products = products.filter((item) => Number(item.price) >= minPrice);
  }
  if (maxPrice) {
    products = products.filter((item) => Number(item.price) <= maxPrice);
  }

  const sorters = {
    newest: (a, b) => Number(b.new_arrival) - Number(a.new_arrival),
    price_asc: (a, b) => Number(a.price) - Number(b.price),
    price_desc: (a, b) => Number(b.price) - Number(a.price),
    rating: (a, b) => Number(b.average_rating) - Number(a.average_rating),
    popular: (a, b) => Number(b.review_count) - Number(a.review_count),
  };
  return products.sort(sorters[sort] || ((a, b) => Number(b.featured) - Number(a.featured)));
}


export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, toggleWishlist, isWishlisted } = useShop();
  const [products, setProducts] = useState(fallbackProducts);
  const [categories, setCategories] = useState(fallbackCategories);
  const [brands, setBrands] = useState(fallbackBrands);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFilters() {
      try {
        const [categoryData, brandData] = await Promise.all([api.getCategories(), api.getBrands()]);
        setCategories(unwrapResults(categoryData) || fallbackCategories);
        setBrands(unwrapResults(brandData) || fallbackBrands);
      } catch {
        setCategories(fallbackCategories);
        setBrands(fallbackBrands);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const response = await api.getProducts(Object.fromEntries(searchParams.entries()));
        setProducts(unwrapResults(response) || fallbackProducts);
      } catch {
        setProducts(filterFallbackProducts(searchParams));
      }
      setLoading(false);
    }

    loadProducts();
  }, [searchParams]);

  function updateFilter(name, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    startTransition(() => {
      setSearchParams(next);
    });
  }

  function clearFilters() {
    setSearchParams({});
  }

  return (
    <div className="page-stack container">
      <SectionHeading
        // eyebrow="Browse"
        description="Search, sort, and filter seller-owned listings by category, brand, price, and item condition."
        title="TradeNest marketplace"
      />

      <div className="catalog-layout">
        <aside className="filter-panel">
          <div className="filter-block">
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              onChange={(event) => updateFilter("category", event.target.value)}
              value={searchParams.get("category") || ""}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-block">
            <label htmlFor="brand-filter">Brand</label>
            <select
              id="brand-filter"
              onChange={(event) => updateFilter("brand", event.target.value)}
              value={searchParams.get("brand") || ""}
            >
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand.slug} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-block">
            <label htmlFor="condition-filter">Condition</label>
            <select
              id="condition-filter"
              onChange={(event) => updateFilter("condition", event.target.value)}
              value={searchParams.get("condition") || ""}
            >
              <option value="">Any condition</option>
              <option value="new">New</option>
              <option value="like_new">Like New</option>
              <option value="gently_used">Gently Used</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
              <option value="vintage">Vintage</option>
            </select>
          </div>

          <div className="filter-block">
            <label htmlFor="sort-filter">Sort by</label>
            <select
              id="sort-filter"
              onChange={(event) => updateFilter("sort", event.target.value)}
              value={searchParams.get("sort") || ""}
            >
              <option value="">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price low to high</option>
              <option value="price_desc">Price high to low</option>
              <option value="rating">Top rated</option>
              <option value="popular">Most reviewed</option>
            </select>
          </div>

          <div className="filter-block filter-block--inline">
            <div>
              <label htmlFor="min-price">Min price</label>
              <input
                id="min-price"
                onChange={(event) => updateFilter("min_price", event.target.value)}
                placeholder="0"
                type="number"
                value={searchParams.get("min_price") || ""}
              />
            </div>
            <div>
              <label htmlFor="max-price">Max price</label>
              <input
                id="max-price"
                onChange={(event) => updateFilter("max_price", event.target.value)}
                placeholder="99999"
                type="number"
                value={searchParams.get("max_price") || ""}
              />
            </div>
          </div>

          <button className="button button--ghost" onClick={clearFilters} type="button">
            Clear filters
          </button>
        </aside>

        <section className="catalog-content">
          <div className="catalog-toolbar">
            <div>
              <strong>{products.length}</strong> listings
            </div>
            {searchParams.get("q") ? <p>Showing results for “{searchParams.get("q")}”</p> : null}
          </div>

          {loading ? <div className="empty-panel">Loading products...</div> : null}

          {!loading && products.length === 0 ? (
            <div className="empty-panel">No products match the filters you selected.</div>
          ) : null}

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
        </section>
      </div>
    </div>
  );
}
