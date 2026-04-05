import { createContext, useContext, useEffect, useState } from "react";

import { api, authStore } from "../api/client";
import { buildFallbackProduct, fallbackHomeData, fallbackProducts } from "../data/fallbackStore";


const ShopContext = createContext(null);
const LOCAL_CART_KEY = "tradenest-local-cart";
const LOCAL_WISHLIST_KEY = "tradenest-local-wishlist";
const LOCAL_ORDERS_KEY = "tradenest-local-orders";


function storageGet(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}


function storageSet(key, value) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}


function emptyCart() {
  return {
    items: [],
    item_count: 0,
    subtotal: 0,
    shipping_fee: 0,
    discount_total: 0,
    tax_total: 0,
    grand_total: 0,
    coupon_code: "",
  };
}


function buildLocalCart(items, couponCode = "") {
  const subtotal = items.reduce((total, item) => total + Number(item.total_price), 0);
  const shippingFee = subtotal === 0 || subtotal >= 2999 || items.some((item) => item.product.free_shipping) ? 0 : 149;
  const discountTotal = couponCode === "TRADENEST5" ? subtotal * 0.05 : 0;
  const taxTotal = Math.max(subtotal - discountTotal, 0) * 0.12;
  return {
    items,
    item_count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal,
    shipping_fee: shippingFee,
    discount_total: discountTotal,
    tax_total: taxTotal,
    grand_total: subtotal + shippingFee + taxTotal - discountTotal,
    coupon_code: couponCode,
  };
}


function buildLocalCartItem(product, variant, quantity) {
  const unitPrice = Number(variant?.effective_price ?? product.current_price ?? product.price);
  return {
    id: `local-${product.id}-${variant?.id || "default"}`,
    product,
    variant,
    quantity,
    unit_price: unitPrice,
    total_price: unitPrice * quantity,
    created_at: new Date().toISOString(),
  };
}


export function ShopProvider({ children }) {
  const [token, setToken] = useState(authStore.getToken());
  const [user, setUser] = useState(null);
  const [homeData, setHomeData] = useState(fallbackHomeData);
  const [cart, setCart] = useState(storageGet(LOCAL_CART_KEY, emptyCart()));
  const [wishlist, setWishlist] = useState(storageGet(LOCAL_WISHLIST_KEY, []));
  const [orders, setOrders] = useState(storageGet(LOCAL_ORDERS_KEY, []));
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    storageSet(LOCAL_CART_KEY, cart);
  }, [cart]);

  useEffect(() => {
    storageSet(LOCAL_WISHLIST_KEY, wishlist);
  }, [wishlist]);

  useEffect(() => {
    storageSet(LOCAL_ORDERS_KEY, orders);
  }, [orders]);

  function setFlash(message, isError = false) {
    if (isError) {
      setError(message);
    } else {
      setNotice(message);
    }
    window.clearTimeout(window.__tradenestFlashTimer);
    window.__tradenestFlashTimer = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 3000);
  }

  async function bootstrap() {
    setBooting(true);
    try {
      const home = await api.getHome();
      setHomeData({ ...fallbackHomeData, ...(home || {}) });
    } catch {
      setHomeData(fallbackHomeData);
    }

    try {
      const apiCart = await api.getCart();
      setCart(apiCart || emptyCart());
    } catch {
      setCart(storageGet(LOCAL_CART_KEY, emptyCart()));
    }

    if (authStore.getToken()) {
      try {
        const profile = await api.getMe();
        setUser(profile);
        setToken(authStore.getToken());
        const wishlistItems = await api.getWishlist();
        setWishlist(wishlistItems || []);
        const orderItems = await api.getOrders();
        setOrders(orderItems || []);
      } catch {
        authStore.clear();
        setToken("");
        setUser(null);
      }
    }
    setBooting(false);
  }

  async function login(payload) {
    const response = await api.login(payload);
    authStore.setToken(response.token);
    setToken(response.token);
    setUser(response.user);
    setFlash("Welcome back.");
    try {
      const apiCart = await api.getCart();
      setCart(apiCart || emptyCart());
      const wishlistItems = await api.getWishlist();
      setWishlist(wishlistItems || []);
      const orderItems = await api.getOrders();
      setOrders(orderItems || []);
    } catch {
      setWishlist([]);
    }
    return response;
  }

  async function register(payload) {
    const response = await api.register(payload);
    authStore.setToken(response.token);
    setToken(response.token);
    setUser(response.user);
    try {
      const apiCart = await api.getCart();
      setCart(apiCart || emptyCart());
    } catch {
      setCart(storageGet(LOCAL_CART_KEY, emptyCart()));
    }
    setWishlist([]);
    setOrders([]);
    setFlash("Your account is ready.");
    return response;
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // Ignore logout failures and clear local auth anyway.
    }
    authStore.clear();
    setToken("");
    setUser(null);
    setWishlist(storageGet(LOCAL_WISHLIST_KEY, []));
    setOrders(storageGet(LOCAL_ORDERS_KEY, []));
    setFlash("Signed out.");
  }

  async function refreshUser() {
    if (!authStore.getToken()) {
      return null;
    }
    const profile = await api.getMe();
    setUser(profile);
    return profile;
  }

  async function updateProfile(payload) {
    const profile = await api.updateProfile(payload);
    setUser(profile);
    setFlash("Profile updated.");
    return profile;
  }

  async function saveAddress(payload, id) {
    const address = await api.saveAddress(payload, id);
    await refreshUser();
    setFlash("Address saved.");
    return address;
  }

  async function addToCart(product, variant, quantity = 1) {
    try {
      const response = await api.addToCart({
        product_id: product.id,
        variant_id: variant?.id || null,
        quantity,
      });
      setCart(response);
      setFlash(`${product.name} added to cart.`);
      return response;
    } catch {
      const firstSellerId = cart.items[0]?.product?.seller?.id || cart.items[0]?.product?.id;
      const nextSellerId = product.seller?.id || product.id;
      if (cart.items.length && firstSellerId !== nextSellerId) {
        throw new Error("TradeNest escrow checkout supports one seller per cart.");
      }
      const existing = cart.items.find(
        (item) => item.product.id === product.id && item.variant?.id === variant?.id,
      );
      let nextItems = [...cart.items];
      if (existing) {
        nextItems = nextItems.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total_price: item.unit_price * (item.quantity + quantity),
              }
            : item,
        );
      } else {
        nextItems = [buildLocalCartItem(product, variant, quantity), ...nextItems];
      }
      const nextCart = buildLocalCart(nextItems, cart.coupon_code);
      setCart(nextCart);
      setFlash(`${product.name} added to cart.`);
      return nextCart;
    }
  }

  async function updateCartItem(itemId, quantity) {
    try {
      const response = await api.updateCartItem(itemId, { quantity });
      setCart(response);
      return response;
    } catch {
      const nextItems = cart.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity, total_price: item.unit_price * quantity }
          : item,
      );
      const nextCart = buildLocalCart(nextItems, cart.coupon_code);
      setCart(nextCart);
      return nextCart;
    }
  }

  async function removeCartItem(itemId) {
    try {
      const response = await api.removeCartItem(itemId);
      setCart(response || emptyCart());
      return response;
    } catch {
      const nextCart = buildLocalCart(cart.items.filter((item) => item.id !== itemId), cart.coupon_code);
      setCart(nextCart);
      return nextCart;
    }
  }

  async function applyCoupon(code) {
    try {
      const response = await api.applyCoupon(code);
      setCart(response);
      setFlash("Coupon applied.");
      return response;
    } catch {
      if (code.trim().toUpperCase() !== "TRADENEST5") {
        throw new Error("Only TRADENEST5 is available in fallback mode.");
      }
      const nextCart = buildLocalCart(cart.items, "TRADENEST5");
      setCart(nextCart);
      setFlash("Coupon applied.");
      return nextCart;
    }
  }

  function isWishlisted(productId) {
    return wishlist.some((item) => item.product?.id === productId || item.id === productId);
  }

  async function toggleWishlist(product) {
    const currentlyWishlisted = isWishlisted(product.id);
    if (authStore.getToken()) {
      try {
        if (currentlyWishlisted) {
          await api.removeFromWishlist(product.id);
          setWishlist((current) =>
            current.filter((item) => (item.product?.id || item.id) !== product.id),
          );
          setFlash("Removed from wishlist.");
          return;
        }
        const response = await api.addToWishlist(product.id);
        setWishlist((current) => [response, ...current]);
        setFlash("Saved to wishlist.");
        return;
      } catch {
        // Fall through to local wishlist mode if the API is unavailable.
      }
    }

    if (currentlyWishlisted) {
      setWishlist((current) =>
        current.filter((item) => (item.product?.id || item.id) !== product.id),
      );
      setFlash("Removed from wishlist.");
    } else {
      setWishlist((current) => [{ id: product.id, product }, ...current]);
      setFlash("Saved locally. Sign in to sync across devices.");
    }
  }

  async function trackRecentlyViewed(productId) {
    if (!authStore.getToken()) {
      return;
    }
    try {
      await api.trackRecentlyViewed(productId);
    } catch {
      // Ignore tracking errors in the UI.
    }
  }

  async function checkout(payload) {
    try {
      const response = await api.checkout(payload);
      setCart(emptyCart());
      if (authStore.getToken()) {
        const nextOrders = await api.getOrders();
        setOrders(nextOrders || []);
      } else {
        setOrders((current) => [response, ...current]);
      }
      setFlash("Order placed successfully.");
      return response;
    } catch {
      const firstItem = cart.items[0];
      const order = {
        id: Date.now(),
        order_number: `ORD-${Date.now().toString().slice(-8)}`,
        email: payload.email,
        phone_number: payload.phone_number || payload.shipping_address?.phone_number,
        seller: firstItem?.product?.seller?.id || null,
        seller_name: firstItem?.product?.seller?.store_name || firstItem?.product?.seller_name || "TradeNest Seller",
        seller_verified: Boolean(firstItem?.product?.seller?.is_verified || firstItem?.product?.seller_verified),
        status: "awaiting_shipment",
        payment_status: "escrow_held",
        payment_method: "escrow",
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        shipping_fee: cart.shipping_fee,
        tax_total: cart.tax_total,
        grand_total: cart.grand_total,
        shipping_address: payload.shipping_address,
        billing_address: payload.same_as_shipping ? payload.shipping_address : payload.billing_address,
        notes: payload.notes || "",
        estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        placed_at: new Date().toISOString(),
        items: cart.items.map((item) => ({
          id: item.id,
          product_name: item.product.name,
          sku: item.variant?.sku || item.product.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.total_price,
          product_snapshot: {
            slug: item.product.slug,
            image: item.product.primary_image,
            brand: item.product.brand,
            category: item.product.category,
          },
        })),
        payments: [
          {
            provider: "tradenest-escrow",
            status: "escrow_held",
            amount: cart.grand_total,
            transaction_id: `TXN-${Date.now()}`,
            created_at: new Date().toISOString(),
          },
        ],
        escrow: {
          status: "funded",
          held_amount: cart.grand_total,
          funded_at: new Date().toISOString(),
          shipped_at: null,
          delivered_at: null,
          released_at: null,
          dispute_reason: "",
          seller_payout_reference: "",
        },
      };
      setOrders((current) => [order, ...current]);
      setCart(emptyCart());
      setFlash("Escrow order placed in local demo mode.");
      return order;
    }
  }

  async function confirmReceipt(orderNumber) {
    try {
      const updatedOrder = await api.confirmReceipt(orderNumber);
      setOrders((current) =>
        current.map((order) => (order.order_number === orderNumber ? updatedOrder : order)),
      );
      setFlash("Escrow released to the seller.");
      return updatedOrder;
    } catch {
      const updatedOrder = {
        ...(orders.find((order) => order.order_number === orderNumber) || {}),
        status: "completed",
        payment_status: "released_to_seller",
        escrow: {
          ...(orders.find((order) => order.order_number === orderNumber)?.escrow || {}),
          status: "released",
          delivered_at: new Date().toISOString(),
          released_at: new Date().toISOString(),
          seller_payout_reference: `PAYOUT-${orderNumber}`,
        },
      };
      setOrders((current) =>
        current.map((order) => (order.order_number === orderNumber ? updatedOrder : order)),
      );
      setFlash("Escrow released to the seller.");
      return updatedOrder;
    }
  }

  async function openDispute(orderNumber, reason) {
    try {
      const updatedOrder = await api.openDispute(orderNumber, reason);
      setOrders((current) =>
        current.map((order) => (order.order_number === orderNumber ? updatedOrder : order)),
      );
      setFlash("Dispute opened.");
      return updatedOrder;
    } catch {
      const updatedOrder = {
        ...(orders.find((order) => order.order_number === orderNumber) || {}),
        status: "disputed",
        payment_status: "disputed",
        escrow: {
          ...(orders.find((order) => order.order_number === orderNumber)?.escrow || {}),
          status: "disputed",
          dispute_reason: reason,
        },
      };
      setOrders((current) =>
        current.map((order) => (order.order_number === orderNumber ? updatedOrder : order)),
      );
      setFlash("Dispute opened.");
      return updatedOrder;
    }
  }

  async function subscribeToNewsletter(email) {
    try {
      await api.subscribeToNewsletter(email);
      setFlash("Subscribed to the newsletter.");
    } catch {
      setFlash("Subscribed locally. Connect the backend to persist this.", false);
    }
  }

  function getProductFallback(slug) {
    return buildFallbackProduct(slug);
  }

  return (
    <ShopContext.Provider
      value={{
        token,
        user,
        homeData,
        cart,
        wishlist,
        orders,
        booting,
        notice,
        error,
        products: fallbackProducts,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        saveAddress,
        addToCart,
        updateCartItem,
        removeCartItem,
        applyCoupon,
        toggleWishlist,
        isWishlisted,
        trackRecentlyViewed,
        checkout,
        confirmReceipt,
        openDispute,
        subscribeToNewsletter,
        getProductFallback,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}


export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used inside ShopProvider.");
  }
  return context;
}
