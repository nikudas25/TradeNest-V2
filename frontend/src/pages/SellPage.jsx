import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useShop } from "../context/ShopContext";
import { formatCurrency, formatDate } from "../data/formatters";


const initialSellerForm = {
  store_name: "",
  bio: "",
  city: "",
  payout_email: "",
  escrow_policy: "",
};

const initialListingForm = {
  id: null,
  name: "",
  sku: "",
  short_description: "",
  description: "",
  price: "",
  compare_at_price: "",
  stock_quantity: 1,
  thumbnail_url: "",
  category_id: "",
  brand_id: "",
  condition: "gently_used",
  condition_notes: "",
  authenticity_status: "seller_declared",
  resale_status: "active",
  ships_from: "",
  original_purchase_year: "",
  free_shipping: true,
};


export function SellPage() {
  const { user, refreshUser } = useShop();
  const [sellerForm, setSellerForm] = useState(initialSellerForm);
  const [listingForm, setListingForm] = useState(initialListingForm);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [listings, setListings] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }
    loadWorkspace();
  }, [user]);

  async function loadWorkspace() {
    setLoading(true);
    try {
      const [sellerProfile, listingData, sellerOrderData, categoryData, brandData] = await Promise.all([
        api.getSellerProfile(),
        api.getMyListings(),
        api.getSellerOrders(),
        api.getCategories(),
        api.getBrands(),
      ]);
      setSellerForm({
        store_name: sellerProfile.store_name || "",
        bio: sellerProfile.bio || "",
        city: sellerProfile.city || "",
        payout_email: sellerProfile.payout_email || "",
        escrow_policy: sellerProfile.escrow_policy || "",
      });
      setListings(Array.isArray(listingData) ? listingData : listingData?.results || []);
      setSellerOrders(Array.isArray(sellerOrderData) ? sellerOrderData : sellerOrderData?.results || []);
      setCategories(Array.isArray(categoryData) ? categoryData : categoryData?.results || []);
      setBrands(Array.isArray(brandData) ? brandData : brandData?.results || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Seller workspace needs a running backend API.");
    }
    setLoading(false);
  }

  function handleSellerChange(field, value) {
    setSellerForm((current) => ({ ...current, [field]: value }));
  }

  function handleListingChange(field, value) {
    setListingForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSellerSubmit(event) {
    event.preventDefault();
    try {
      await api.saveSellerProfile(sellerForm);
      await refreshUser();
      setMessage("Seller profile updated.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function normalizeListingPayload() {
    return {
      ...listingForm,
      category_id: Number(listingForm.category_id),
      brand_id: listingForm.brand_id ? Number(listingForm.brand_id) : null,
      price: listingForm.price || "0",
      compare_at_price: listingForm.compare_at_price || null,
      stock_quantity: Number(listingForm.stock_quantity || 1),
      original_purchase_year: listingForm.original_purchase_year ? Number(listingForm.original_purchase_year) : null,
      tags: ["TradeNest Listing"],
      specs: {
        Condition: listingForm.condition.replaceAll("_", " "),
      },
    };
  }

  async function handleListingSubmit(event) {
    event.preventDefault();
    try {
      const payload = normalizeListingPayload();
      if (listingForm.id) {
        await api.updateListing(listingForm.id, payload);
        setMessage("Listing updated.");
      } else {
        await api.createListing(payload);
        setMessage("Listing published.");
      }
      setListingForm(initialListingForm);
      await loadWorkspace();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startEditing(listing) {
    setListingForm({
      id: listing.id,
      name: listing.name || "",
      sku: listing.sku || "",
      short_description: listing.short_description || "",
      description: listing.description || "",
      price: listing.price || "",
      compare_at_price: listing.compare_at_price || "",
      stock_quantity: listing.stock_quantity || 1,
      thumbnail_url: listing.thumbnail_url || "",
      category_id: listing.category_id || listing.category || "",
      brand_id: listing.brand_id || listing.brand || "",
      condition: listing.condition || "gently_used",
      condition_notes: listing.condition_notes || "",
      authenticity_status: listing.authenticity_status || "seller_declared",
      resale_status: listing.resale_status || "active",
      ships_from: listing.ships_from || "",
      original_purchase_year: listing.original_purchase_year || "",
      free_shipping: Boolean(listing.free_shipping),
    });
  }

  async function deleteListing(id) {
    try {
      await api.deleteListing(id);
      setMessage("Listing removed.");
      await loadWorkspace();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function shipOrder(orderNumber) {
    const trackingNumber = window.prompt("Enter a tracking number for this shipment:", "");
    if (trackingNumber === null) {
      return;
    }
    try {
      await api.shipOrder(orderNumber, trackingNumber);
      setMessage("Order marked as shipped.");
      await loadWorkspace();
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!user) {
    return (
      <div className="container empty-panel">
        <h1>Sign in to sell on TradeNest</h1>
        <p>Create a buyer account first, then activate your seller workspace to post escrow-protected listings.</p>
        <Link className="button button--primary" to="/account">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack container">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Sell</p>
          <h1>Seller workspace</h1>
        </div>
      </div>

      {message ? <p className="helper-copy">{message}</p> : null}
      {loading ? <div className="empty-panel">Loading seller workspace...</div> : null}

      <div className="account-layout">
        <form className="detail-card" onSubmit={handleSellerSubmit}>
          <h2>Seller profile</h2>
          <div className="form-grid">
            {Object.entries(sellerForm).map(([field, value]) => (
              field === "bio" || field === "escrow_policy" ? (
                <textarea
                  key={field}
                  onChange={(event) => handleSellerChange(field, event.target.value)}
                  placeholder={field.replaceAll("_", " ")}
                  rows={4}
                  value={value}
                />
              ) : (
                <input
                  key={field}
                  onChange={(event) => handleSellerChange(field, event.target.value)}
                  placeholder={field.replaceAll("_", " ")}
                  value={value}
                />
              )
            ))}
          </div>
          <button className="button button--secondary" type="submit">
            Save seller profile
          </button>
        </form>

        <form className="detail-card" onSubmit={handleListingSubmit}>
          <h2>{listingForm.id ? "Edit listing" : "Create listing"}</h2>
          <div className="form-grid">
            <input
              onChange={(event) => handleListingChange("name", event.target.value)}
              placeholder="Listing title"
              value={listingForm.name}
            />
            <input
              onChange={(event) => handleListingChange("sku", event.target.value)}
              placeholder="SKU (optional)"
              value={listingForm.sku}
            />
            <input
              onChange={(event) => handleListingChange("short_description", event.target.value)}
              placeholder="Short description"
              value={listingForm.short_description}
            />
            <input
              onChange={(event) => handleListingChange("thumbnail_url", event.target.value)}
              placeholder="Thumbnail image URL"
              value={listingForm.thumbnail_url}
            />
            <select onChange={(event) => handleListingChange("category_id", event.target.value)} value={listingForm.category_id}>
              <option value="">Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select onChange={(event) => handleListingChange("brand_id", event.target.value)} value={listingForm.brand_id}>
              <option value="">Brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <input onChange={(event) => handleListingChange("price", event.target.value)} placeholder="Price" type="number" value={listingForm.price} />
            <input
              onChange={(event) => handleListingChange("compare_at_price", event.target.value)}
              placeholder="Compare at price"
              type="number"
              value={listingForm.compare_at_price}
            />
            <select onChange={(event) => handleListingChange("condition", event.target.value)} value={listingForm.condition}>
              <option value="new">New</option>
              <option value="like_new">Like New</option>
              <option value="gently_used">Gently Used</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
              <option value="vintage">Vintage</option>
            </select>
            <input
              onChange={(event) => handleListingChange("ships_from", event.target.value)}
              placeholder="Ships from"
              value={listingForm.ships_from}
            />
            <input
              onChange={(event) => handleListingChange("original_purchase_year", event.target.value)}
              placeholder="Original purchase year"
              type="number"
              value={listingForm.original_purchase_year}
            />
            <input
              onChange={(event) => handleListingChange("stock_quantity", event.target.value)}
              placeholder="Stock quantity"
              type="number"
              value={listingForm.stock_quantity}
            />
            <input
              onChange={(event) => handleListingChange("condition_notes", event.target.value)}
              placeholder="Condition notes"
              value={listingForm.condition_notes}
            />
            <textarea
              onChange={(event) => handleListingChange("description", event.target.value)}
              placeholder="Listing description"
              rows={4}
              value={listingForm.description}
            />
          </div>
          <div className="hero-actions">
            <button className="button button--primary" type="submit">
              {listingForm.id ? "Update listing" : "Publish listing"}
            </button>
            {listingForm.id ? (
              <button className="button button--ghost" onClick={() => setListingForm(initialListingForm)} type="button">
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <section className="detail-card">
        <h2>Your listings</h2>
        {!listings.length ? <p className="helper-copy">No listings yet. Publish your first item above.</p> : null}
        <div className="order-list">
          {listings.map((listing) => (
            <article className="order-card" key={listing.id}>
              <strong>{listing.name}</strong>
              <p>{listing.short_description}</p>
              <div className="summary-row">
                <span>Price</span>
                <strong>{formatCurrency(listing.price)}</strong>
              </div>
              <div className="summary-row">
                <span>Status</span>
                <strong>{listing.resale_status}</strong>
              </div>
              <div className="hero-actions">
                <button className="button button--secondary" onClick={() => startEditing(listing)} type="button">
                  Edit
                </button>
                <button className="button button--ghost" onClick={() => deleteListing(listing.id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-card">
        <h2>Your seller orders</h2>
        {!sellerOrders.length ? <p className="helper-copy">No buyer orders yet.</p> : null}
        <div className="order-list">
          {sellerOrders.map((order) => (
            <article className="order-card" key={order.order_number}>
              <strong>{order.order_number}</strong>
              <p>
                Buyer placed order on {formatDate(order.placed_at)} for {formatCurrency(order.grand_total)}
              </p>
              <div className="summary-row">
                <span>Status</span>
                <strong>{order.status}</strong>
              </div>
              <div className="summary-row">
                <span>Escrow</span>
                <strong>{order.escrow?.status || order.payment_status}</strong>
              </div>
              {order.status === "awaiting_shipment" ? (
                <button className="button button--secondary" onClick={() => shipOrder(order.order_number)} type="button">
                  Mark shipped
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
