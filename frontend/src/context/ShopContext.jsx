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


function storageRemove(key) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(key);
}


function emptyCart() {
  return {
    items: [],
    item_count: 0,
    seller_count: 0,
    subtotal: 0,
    shipping_fee: 0,
    discount_total: 0,
    tax_total: 0,
    grand_total: 0,
    coupon_code: "",
  };
}


function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}


function shouldUseLocalFallback(error) {
  const message = String(error?.message || "").toLowerCase();
  return !message || message.includes("failed to fetch") || message.includes("networkerror") || message.includes("load failed");
}


function getLocalSellerKey(product) {
  return product?.seller?.id || product?.seller_name || product?.id || "seller";
}


function groupLocalCartItemsBySeller(items) {
  const groups = new Map();
  items.forEach((item) => {
    const sellerKey = getLocalSellerKey(item.product);
    if (!groups.has(sellerKey)) {
      groups.set(sellerKey, []);
    }
    groups.get(sellerKey).push(item);
  });
  return [...groups.entries()].map(([sellerKey, sellerItems]) => ({
    seller_key: sellerKey,
    seller_name: sellerItems[0]?.product?.seller?.store_name || sellerItems[0]?.product?.seller_name || "TradeNest Seller",
    seller: sellerItems[0]?.product?.seller || null,
    items: sellerItems,
  }));
}


function calculateLocalShippingFee(items) {
  const subtotal = items.reduce((total, item) => total + Number(item.total_price), 0);
  if (subtotal === 0 || subtotal >= 2999 || items.some((item) => item.product.free_shipping)) {
    return 0;
  }
  return 149;
}


function allocateLocalDiscounts(groups, totalDiscount) {
  const roundedDiscount = roundCurrency(totalDiscount);
  if (!groups.length || roundedDiscount <= 0) {
    return groups.map(() => 0);
  }

  const totalSubtotal = groups.reduce((sum, group) => sum + group.subtotal, 0);
  if (totalSubtotal <= 0) {
    return groups.map(() => 0);
  }

  let remainingDiscount = roundedDiscount;
  let remainingSubtotal = totalSubtotal;

  return groups.map((group, index) => {
    if (index === groups.length - 1) {
      return roundCurrency(remainingDiscount);
    }
    const nextDiscount = remainingSubtotal > 0 ? roundCurrency((group.subtotal / remainingSubtotal) * remainingDiscount) : 0;
    remainingDiscount = roundCurrency(remainingDiscount - nextDiscount);
    remainingSubtotal = roundCurrency(remainingSubtotal - group.subtotal);
    return nextDiscount;
  });
}


function buildLocalCart(items, couponCode = "") {
  const sellerGroups = groupLocalCartItemsBySeller(items);
  const subtotal = roundCurrency(items.reduce((total, item) => total + Number(item.total_price), 0));
  const shippingFee = roundCurrency(
    sellerGroups.reduce((total, group) => total + calculateLocalShippingFee(group.items), 0),
  );
  const discountTotal = roundCurrency(couponCode === "TRADENEST5" ? subtotal * 0.05 : 0);
  const taxTotal = roundCurrency(Math.max(subtotal - discountTotal, 0) * 0.12);
  return {
    items,
    item_count: items.reduce((total, item) => total + item.quantity, 0),
    seller_count: sellerGroups.length,
    subtotal,
    shipping_fee: shippingFee,
    discount_total: discountTotal,
    tax_total: taxTotal,
    grand_total: roundCurrency(subtotal + shippingFee + taxTotal - discountTotal),
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
    total_price: roundCurrency(unitPrice * quantity),
    created_at: new Date().toISOString(),
  };
}


function buildLocalCheckoutResponse(cart, payload) {
  const placedAt = new Date().toISOString();
  const estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const sellerGroups = groupLocalCartItemsBySeller(cart.items).map((group) => ({
    ...group,
    subtotal: roundCurrency(group.items.reduce((sum, item) => sum + Number(item.total_price), 0)),
    shipping_fee: calculateLocalShippingFee(group.items),
  }));
  const discountAllocations = allocateLocalDiscounts(sellerGroups, cart.discount_total);
  const orders = sellerGroups.map((group, index) => {
    const discountTotal = discountAllocations[index];
    const taxTotal = roundCurrency(Math.max(group.subtotal - discountTotal, 0) * 0.12);
    const grandTotal = roundCurrency(group.subtotal + group.shipping_fee + taxTotal - discountTotal);
    const orderId = Date.now() + index;
    return {
      id: orderId,
      order_number: `ORD-${String(orderId).slice(-8)}`,
      email: payload.email,
      phone_number: payload.phone_number || payload.shipping_address?.phone_number,
      seller: group.seller?.id || null,
      seller_name: group.seller?.store_name || group.seller_name,
      seller_verified: Boolean(group.seller?.is_verified),
      status: "awaiting_shipment",
      payment_status: "escrow_held",
      payment_method: "escrow",
      subtotal: group.subtotal,
      discount_total: discountTotal,
      shipping_fee: group.shipping_fee,
      tax_total: taxTotal,
      grand_total: grandTotal,
      shipping_address: payload.shipping_address,
      billing_address: payload.same_as_shipping ? payload.shipping_address : payload.billing_address,
      notes: payload.notes || "",
      estimated_delivery: estimatedDelivery,
      placed_at: placedAt,
      items: group.items.map((item) => ({
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
          amount: grandTotal,
          transaction_id: `TXN-${orderId}`,
          created_at: placedAt,
        },
      ],
      escrow: {
        status: "funded",
        held_amount: grandTotal,
        funded_at: placedAt,
        shipped_at: null,
        delivered_at: null,
        released_at: null,
        dispute_reason: "",
        seller_payout_reference: "",
      },
    };
  });

  return {
    orders,
    order_count: orders.length,
    grand_total: cart.grand_total,
  };
}


export function ShopProvider({ children }) {
  const [token, setToken] = useState(authStore.getToken());
  const [user, setUser] = useState(null);
  const [homeData, setHomeData] = useState(fallbackHomeData);
  const [cart, setCart] = useState(storageGet(LOCAL_CART_KEY, emptyCart()));
  const [wishlist, setWishlist] = useState(storageGet(LOCAL_WISHLIST_KEY, []));
  const [orders, setOrders] = useState([]);
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
    if (token) {
      storageSet(LOCAL_ORDERS_KEY, orders);
      return;
    }
    storageRemove(LOCAL_ORDERS_KEY);
  }, [orders, token]);

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

  async function loadCart() {
    try {
      const apiCart = await api.getCart();
      setCart(apiCart || emptyCart());
    } catch {
      setCart(storageGet(LOCAL_CART_KEY, emptyCart()));
    }
  }

  async function loadAuthenticatedData() {
    try {
      const wishlistItems = await api.getWishlist();
      setWishlist(wishlistItems || []);
    } catch {
      setWishlist([]);
    }

    try {
      const orderItems = await api.getOrders();
      setOrders(orderItems || []);
    } catch {
      setOrders(storageGet(LOCAL_ORDERS_KEY, []));
    }
  }

  async function bootstrap() {
    setBooting(true);
    try {
      const home = await api.getHome();
      setHomeData({ ...fallbackHomeData, ...(home || {}) });
    } catch {
      setHomeData(fallbackHomeData);
    }

    await loadCart();

    if (authStore.getToken()) {
      try {
        const profile = await api.getMe();
        setUser(profile);
        setToken(authStore.getToken());
        await loadAuthenticatedData();
      } catch {
        authStore.clear();
        setToken("");
        setUser(null);
        setWishlist(storageGet(LOCAL_WISHLIST_KEY, []));
        setOrders([]);
        storageRemove(LOCAL_ORDERS_KEY);
      }
    } else {
      setOrders([]);
      storageRemove(LOCAL_ORDERS_KEY);
    }
    setBooting(false);
  }

  async function login(payload) {
    const response = await api.login(payload);
    authStore.setToken(response.token);
    setToken(response.token);
    setUser(response.user);
    setFlash("Welcome back.");
    await loadCart();
    await loadAuthenticatedData();
    return response;
  }

  async function register(payload) {
    const response = await api.register(payload);
    authStore.setToken(response.token);
    setToken(response.token);
    setUser(response.user);
    await loadCart();
    await loadAuthenticatedData();
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
    setOrders([]);
    storageRemove(LOCAL_ORDERS_KEY);
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
    } catch (error) {
      if (!shouldUseLocalFallback(error)) {
        setFlash(error.message, true);
        throw error;
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
                total_price: roundCurrency(item.unit_price * (item.quantity + quantity)),
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
    } catch (error) {
      if (!shouldUseLocalFallback(error)) {
        setFlash(error.message, true);
        throw error;
      }
      const nextItems = cart.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity, total_price: roundCurrency(item.unit_price * quantity) }
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
    } catch (error) {
      if (!shouldUseLocalFallback(error)) {
        setFlash(error.message, true);
        throw error;
      }
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
    } catch (error) {
      if (!shouldUseLocalFallback(error)) {
        setFlash(error.message, true);
        throw error;
      }
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
        try {
          const nextOrders = await api.getOrders();
          setOrders(nextOrders || []);
        } catch {
          setOrders((current) => [...(response.orders || []), ...current]);
        }
      } else {
        setOrders((current) => [...(response.orders || []), ...current]);
      }
      setFlash("Order placed successfully.");
      return response;
    } catch (error) {
      if (!shouldUseLocalFallback(error)) {
        setFlash(error.message, true);
        throw error;
      }
      const response = buildLocalCheckoutResponse(cart, payload);
      setOrders((current) => [...response.orders, ...current]);
      setCart(emptyCart());
      setFlash(
        response.order_count > 1
          ? "Escrow orders placed in local demo mode."
          : "Escrow order placed in local demo mode.",
      );
      return response;
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

  async function cancelOrder(orderNumber) {
    try {
      const updatedOrder = await api.cancelOrder(orderNumber);
      setOrders((current) =>
        current.map((order) => (order.order_number === orderNumber ? updatedOrder : order)),
      );
      setFlash("Order cancelled and refund initiated.");
      return updatedOrder;
    } catch (error) {
      if (!shouldUseLocalFallback(error)) {
        setFlash(error.message, true);
        throw error;
      }
      const updatedOrder = {
        ...(orders.find((order) => order.order_number === orderNumber) || {}),
        status: "cancelled",
        payment_status: "refunded",
        escrow: {
          ...(orders.find((order) => order.order_number === orderNumber)?.escrow || {}),
          status: "refunded",
          released_at: new Date().toISOString(),
        },
        payments: (orders.find((order) => order.order_number === orderNumber)?.payments || []).map((payment) => ({
          ...payment,
          status: "refunded",
        })),
      };
      setOrders((current) =>
        current.map((order) => (order.order_number === orderNumber ? updatedOrder : order)),
      );
      setFlash("Order cancelled in local demo mode.");
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
  return fallbackProducts.find(
      (p) => String(p.id) === String(slug) || p.slug === slug
    );
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
        cancelOrder,
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
