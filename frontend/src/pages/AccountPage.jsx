import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useShop } from "../context/ShopContext";


const initialProfile = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  avatar_url: "",
};

const initialAddress = {
  label: "Home",
  recipient_name: "",
  phone_number: "",
  street_line_1: "",
  street_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  landmark: "",
  delivery_notes: "",
  is_default_shipping: true,
  is_default_billing: true,
};


export function AccountPage() {
  const { login, register, saveAddress, updateProfile, user } = useShop();
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState(initialProfile);
  const [authForm, setAuthForm] = useState({
    identifier: "",
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone_number: "",
    is_seller: true,
    store_name: "",
  });
  const [address, setAddress] = useState(initialAddress);

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
        avatar_url: user.avatar_url || "",
      });
    }
  }, [user]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    try {
      if (mode === "login") {
        await login({ identifier: authForm.identifier, password: authForm.password });
        setMessage("");
        return;
      }
      await register(authForm);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    try {
      await updateProfile(profile);
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();
    try {
      await saveAddress(address);
      setAddress(initialAddress);
      setMessage("Address saved.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!user) {
    return (
      <div className="page-stack container narrow-shell">
        <div className="auth-switcher">
          <button className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")} type="button">
            Sign in
          </button>
          <button className={mode === "register" ? "is-active" : ""} onClick={() => setMode("register")} type="button">
            Create account
          </button>
        </div>

        <form className="detail-card auth-form" onSubmit={handleAuthSubmit}>
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          {mode === "register" ? (
            <>
              <input
                onChange={(event) => setAuthForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="Username"
                value={authForm.username}
              />
              <div className="form-grid">
                <input
                  onChange={(event) => setAuthForm((current) => ({ ...current, first_name: event.target.value }))}
                  placeholder="First name"
                  value={authForm.first_name}
                />
                <input
                  onChange={(event) => setAuthForm((current) => ({ ...current, last_name: event.target.value }))}
                  placeholder="Last name"
                  value={authForm.last_name}
                />
              </div>
              <input
                onChange={(event) => setAuthForm((current) => ({ ...current, store_name: event.target.value }))}
                placeholder="Seller store name"
                value={authForm.store_name}
              />
            </>
          ) : (
            <input
              onChange={(event) => setAuthForm((current) => ({ ...current, identifier: event.target.value }))}
              placeholder="Username or phone number"
              required
              type="text"
              value={authForm.identifier}
            />
          )}

          {mode === "register" ? (
            <>
              <input
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email address"
                required
                type="email"
                value={authForm.email}
              />
              <input
                onChange={(event) => setAuthForm((current) => ({ ...current, phone_number: event.target.value }))}
                placeholder="Phone number"
                type="text"
                value={authForm.phone_number}
              />
            </>
          ) : null}
          <input
            onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Password"
            required
            type="password"
            value={authForm.password}
          />
          {mode === "register" ? (
            <input
              onChange={(event) => setAuthForm((current) => ({ ...current, confirm_password: event.target.value }))}
              placeholder="Confirm password"
              required
              type="password"
              value={authForm.confirm_password}
            />
          ) : null}
          <button className="button button--primary button--full" type="submit">
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
          {message ? <p className="helper-copy">{message}</p> : null}
        </form>
      </div>
    );
  }

  return (
    <div className="page-stack container">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Account</p>
          <h1>Your buyer and seller hub</h1>
        </div>
      </div>
      {message ? <p className="helper-copy">{message}</p> : null}

      <div className="account-layout">
        <form className="detail-card" onSubmit={handleProfileSubmit}>
          <h2>Profile</h2>
          <div className="form-grid">
            {Object.entries(profile).map(([field, value]) => (
              <input
                key={field}
                onChange={(event) => setProfile((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={field.replaceAll("_", " ")}
                type={field === "email" ? "email" : "text"}
                value={value}
              />
            ))}
          </div>
          <button className="button button--secondary" type="submit">
            Save profile
          </button>
        </form>

        <div className="detail-card">
          <h2>Seller status</h2>
          <div className="address-list">
            <article className="address-card">
              <strong>
                {user.seller_profile?.store_name || (user.is_seller ? "TradeNest seller" : "Buyer only account")}
              </strong>
              <p>
                {user.seller_profile?.is_verified ? "Verified seller" : user.is_seller ? "Seller profile active" : "Create a seller profile to list items"}
              </p>
              <p>{user.seller_profile?.bio || "Use the seller workspace to add listings, edit seller info, and manage escrow-backed sales."}</p>
              <Link className="button button--secondary" to="/sell">
                Open seller workspace
              </Link>
            </article>
          </div>
        </div>

        <div className="detail-card">
          <h2>Saved addresses</h2>
          <div className="address-list">
            {(user.addresses || []).map((item) => (
              <article className="address-card" key={item.id}>
                <strong>{item.label}</strong>
                <p>{item.recipient_name}</p>
                <p>{item.formatted}</p>
              </article>
            ))}
            {!user.addresses?.length ? <p>No saved addresses yet.</p> : null}
          </div>
        </div>

        <form className="detail-card" onSubmit={handleAddressSubmit}>
          <h2>Add an address</h2>
          <div className="form-grid">
            {Object.entries(address).map(([field, value]) =>
              typeof value === "boolean" ? (
                <label className="checkbox-row" key={field}>
                  <input
                    checked={value}
                    onChange={(event) =>
                      setAddress((current) => ({ ...current, [field]: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  {field.replaceAll("_", " ")}
                </label>
              ) : (
                <input
                  key={field}
                  onChange={(event) => setAddress((current) => ({ ...current, [field]: event.target.value }))}
                  placeholder={field.replaceAll("_", " ")}
                  value={value}
                />
              ),
            )}
          </div>
          <button className="button button--secondary" type="submit">
            Save address
          </button>
        </form>
      </div>
    </div>
  );
}
