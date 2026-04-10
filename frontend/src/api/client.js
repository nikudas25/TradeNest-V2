const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const TOKEN_KEY = "tradenest-auth-token";
const SESSION_KEY = "tradenest-session-key";


function safeStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

export const authStore = {
  getToken() {
    return safeStorage()?.getItem(TOKEN_KEY) || "";
  },
  setToken(token) {
    if (!safeStorage()) {
      return;
    }
    if (token) {
      safeStorage().setItem(TOKEN_KEY, token);
    } else {
      safeStorage().removeItem(TOKEN_KEY);
    }
  },
  getSessionKey() {
    return safeStorage()?.getItem(SESSION_KEY) || "";
  },
  setSessionKey(value) {
    if (!safeStorage()) {
      return;
    }
    if (value) {
      safeStorage().setItem(SESSION_KEY, value);
    }
  },
  clear() {
    safeStorage()?.removeItem(TOKEN_KEY);
  },
};


function buildUrl(path, params) {
  if (!params) {
    return `${API_BASE_URL}${path}`;
  }
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, value);
    }
  });
  const queryString = search.toString();
  return `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;
}


async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = authStore.getToken();
  const sessionKey = authStore.getSessionKey();
  if (token) {
    headers.Authorization = `Token ${token}`;
  }
  if (sessionKey) {
    headers["X-Session-Key"] = sessionKey;
  }

  const response = await fetch(buildUrl(path, options.params), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }
  if (data?.session_key) {
    authStore.setSessionKey(data.session_key);
  }

  if (!response.ok) {
    const fieldErrors = data && typeof data === "object"
      ? Object.entries(data)
          .filter(([key, value]) => key !== "detail" && key !== "non_field_errors" && Array.isArray(value) && value.length)
          .map(([key, value]) => `${key}: ${value[0]}`)
      : [];
    const message =
      data?.detail ||
      data?.non_field_errors?.[0] ||
      fieldErrors[0] ||
      data?.message ||
      "Something went wrong while talking to the API.";
    throw new Error(message);
  }
  return data;
}


export const api = {
  getHome() {
    return request("/catalog/home/");
  },
  getProducts(params) {
    return request("/catalog/products/", { params });
  },
  getMyListings() {
    return request("/catalog/my-listings/");
  },
  createListing(payload) {
    return request("/catalog/my-listings/", {
      method: "POST",
      body: payload,
    });
  },
  updateListing(id, payload) {
    return request(`/catalog/my-listings/${id}/`, {
      method: "PATCH",
      body: payload,
    });
  },
  deleteListing(id) {
    return request(`/catalog/my-listings/${id}/`, {
      method: "DELETE",
    });
  },
  getProduct(slug) {
    return request(`/catalog/products/${slug}/`);
  },
  getCategories() {
    return request("/catalog/categories/");
  },
  getBrands() {
    return request("/catalog/brands/");
  },
  createReview(slug, payload) {
    return request(`/catalog/products/${slug}/reviews/`, {
      method: "POST",
      body: payload,
    });
  },
  register(payload) {
    return request("/auth/register/", {
      method: "POST",
      body: payload,
    });
  },
  login(payload) {
    return request("/auth/login/", {
      method: "POST",
      body: payload,
    });
  },
  logout() {
    return request("/auth/logout/", {
      method: "POST",
    });
  },
  getMe() {
    return request("/auth/me/");
  },
  updateProfile(payload) {
    return request("/auth/me/", {
      method: "PATCH",
      body: payload,
    });
  },
  getAddresses() {
    return request("/auth/addresses/");
  },
  getSellerProfile() {
    return request("/auth/seller-profile/");
  },
  saveSellerProfile(payload) {
    return request("/auth/seller-profile/", {
      method: "PATCH",
      body: payload,
    });
  },
  saveAddress(payload, id) {
    return request(id ? `/auth/addresses/${id}/` : "/auth/addresses/", {
      method: id ? "PATCH" : "POST",
      body: payload,
    });
  },
  getCart() {
    return request("/commerce/cart/");
  },
  addToCart(payload) {
    return request("/commerce/cart/items/", {
      method: "POST",
      body: payload,
    });
  },
  updateCartItem(itemId, payload) {
    return request(`/commerce/cart/items/${itemId}/`, {
      method: "PATCH",
      body: payload,
    });
  },
  removeCartItem(itemId) {
    return request(`/commerce/cart/items/${itemId}/`, {
      method: "DELETE",
    });
  },
  applyCoupon(code) {
    return request("/commerce/cart/coupon/", {
      method: "POST",
      body: { code },
    });
  },
  getWishlist() {
    return request("/commerce/wishlist/");
  },
  addToWishlist(productId) {
    return request("/commerce/wishlist/", {
      method: "POST",
      body: { product_id: productId },
    });
  },
  removeFromWishlist(productId) {
    return request(`/commerce/wishlist/${productId}/`, {
      method: "DELETE",
    });
  },
  getRecentlyViewed() {
    return request("/commerce/recently-viewed/");
  },
  trackRecentlyViewed(productId) {
    return request("/commerce/recently-viewed/", {
      method: "POST",
      body: { product_id: productId },
    });
  },
  checkout(payload) {
    return request("/commerce/checkout/", {
      method: "POST",
      body: payload,
    });
  },
  getOrders() {
    return request("/commerce/orders/");
  },
  getSellerOrders() {
    return request("/commerce/seller/orders/");
  },
  cancelOrder(orderNumber) {
    return request(`/commerce/orders/${orderNumber}/cancel/`, {
      method: "POST",
    });
  },
  shipOrder(orderNumber, trackingNumber) {
    return request(`/commerce/seller/orders/${orderNumber}/ship/`, {
      method: "POST",
      body: { tracking_number: trackingNumber },
    });
  },
  confirmReceipt(orderNumber) {
    return request(`/commerce/orders/${orderNumber}/confirm-receipt/`, {
      method: "POST",
    });
  },
  openDispute(orderNumber, reason) {
    return request(`/commerce/orders/${orderNumber}/dispute/`, {
      method: "POST",
      body: { reason },
    });
  },
  subscribeToNewsletter(email) {
    return request("/commerce/newsletter/", {
      method: "POST",
      body: { email },
    });
  },
};
