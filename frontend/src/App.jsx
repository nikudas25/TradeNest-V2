import { Route, Routes } from "react-router-dom";

import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AccountPage } from "./pages/AccountPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductPage } from "./pages/ProductPage";
import { SellPage } from "./pages/SellPage";
import { ShopPage } from "./pages/ShopPage";
import { WishlistPage } from "./pages/WishlistPage";
import { CreateListingPage } from "./pages/CreateListingPage.jsx";


export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/sell" element={<CreateListingPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

