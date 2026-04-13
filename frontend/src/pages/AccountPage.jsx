import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {api} from "../api/client";
import {useShop} from "../context/ShopContext";
import {authStore} from "../api/client";

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
    const {register, saveAddress, updateProfile, user, refreshUser} = useShop();
    const [mode, setMode] = useState("login");
    const [message, setMessage] = useState("");
    const [otp, setOtp] = useState("");
    const [otpStep, setOtpStep] = useState(false);

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
        store_name: "",
        account_holder_name: "",
        bank_account_number: "",
        ifsc_code: "",
        is_seller: false,
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
                if (!authForm.identifier) {
                    setMessage("Please enter your email");
                    return;
                }

                if (!otpStep) {
                    await api.requestOtp(authForm.identifier);
                    setOtpStep(true);
                    setMessage(`OTP sent to ${authForm.identifier}`);
                } else {
                    const data = await api.verifyOtp(authForm.identifier, otp);

                    const token = data.token || data.key;

                    if (!token) {
                        setMessage("Login failed: No token received");
                        return;
                    }

                    localStorage.setItem("tradenest-auth-token", token);

                    await refreshUser();

                    window.location.href = "/account";
                }
                return;
            }

            const payload = { ...authForm };
            
            // 🔥 REMOVE seller fields if not seller
            if (!payload.is_seller) {
                delete payload.store_name;
                delete payload.account_holder_name;
                delete payload.bank_account_number;
                delete payload.ifsc_code;
            }
            
            await register(payload);

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
                    <button
                        className={mode === "login" ? "is-active" : ""}
                        onClick={() => {
                            setMode("login");
                            setOtpStep(false);
                            setOtp("");
                            setMessage("");
                        }}
                        type="button"
                    >
                        Sign in
                    </button>

                    <button
                        className={mode === "register" ? "is-active" : ""}
                        onClick={() => {
                            setMode("register");
                            setOtpStep(false);
                            setOtp("");
                            setMessage("");
                        }}
                        type="button"
                    >
                        Create account
                    </button>
                </div>

                <form className="detail-card auth-form" onSubmit={handleAuthSubmit}>
                    <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>

                    {mode === "register" ? (
                        <>
                            <input
                                placeholder="Username"
                                value={authForm.username}
                                onChange={(e) =>
                                    setAuthForm((c) => ({...c, username: e.target.value}))
                                }
                            />

                            <div className="form-grid">
                                <input
                                    placeholder="First name"
                                    value={authForm.first_name}
                                    onChange={(e) =>
                                        setAuthForm((c) => ({...c, first_name: e.target.value}))
                                    }
                                />
                                <input
                                    placeholder="Last name"
                                    value={authForm.last_name}
                                    onChange={(e) =>
                                        setAuthForm((c) => ({...c, last_name: e.target.value}))
                                    }
                                />
                            </div>

                            {/* Seller checkbox */}
                            <label>
                                <input
                                    type="checkbox"
                                    checked={authForm.is_seller}
                                    onChange={(e) =>
                                        setAuthForm((c) => ({
                                            ...c,
                                            is_seller: e.target.checked,
                                        }))
                                    }
                                />
                                Register as Seller
                            </label>

                            {/* Seller fields */}
                            {authForm.is_seller && (
                                <>
                                    <input
                                        placeholder="Seller store name"
                                        value={authForm.store_name}
                                        onChange={(e) =>
                                            setAuthForm((c) => ({
                                                ...c,
                                                store_name: e.target.value,
                                            }))
                                        }
                                    />

                                    <input
                                        placeholder="Account Holder Name"
                                        value={authForm.account_holder_name}
                                        onChange={(e) =>
                                            setAuthForm((c) => ({
                                                ...c,
                                                account_holder_name: e.target.value,
                                            }))
                                        }
                                    />

                                    <input
                                        placeholder="Bank Account Number"
                                        value={authForm.bank_account_number}
                                        onChange={(e) =>
                                            setAuthForm((c) => ({
                                                ...c,
                                                bank_account_number: e.target.value,
                                            }))
                                        }
                                    />

                                    <input
                                        placeholder="IFSC Code"
                                        value={authForm.ifsc_code}
                                        onChange={(e) =>
                                            setAuthForm((c) => ({
                                                ...c,
                                                ifsc_code: e.target.value,
                                            }))
                                        }
                                    />
                                </>
                            )}

                            <input
                                placeholder="Email address"
                                type="email"
                                required
                                value={authForm.email}
                                onChange={(e) =>
                                    setAuthForm((c) => ({...c, email: e.target.value}))
                                }
                            />

                            <input
                                placeholder="Phone number"
                                value={authForm.phone_number}
                                onChange={(e) =>
                                    setAuthForm((c) => ({
                                        ...c,
                                        phone_number: e.target.value,
                                    }))
                                }
                            />

                            <input
                                placeholder="Password"
                                type="password"
                                required
                                value={authForm.password}
                                onChange={(e) =>
                                    setAuthForm((c) => ({...c, password: e.target.value}))
                                }
                            />

                            <input
                                placeholder="Confirm password"
                                type="password"
                                required
                                value={authForm.confirm_password}
                                onChange={(e) =>
                                    setAuthForm((c) => ({
                                        ...c,
                                        confirm_password: e.target.value,
                                    }))
                                }
                            />
                        </>
                    ) : (
                        <input
                            placeholder="Enter your email"
                            type="email"
                            required
                            value={authForm.identifier}
                            onChange={(e) =>
                                setAuthForm((c) => ({...c, identifier: e.target.value}))
                            }
                        />
                    )}

                    {mode === "login" && otpStep && (
                        <>
                            <input
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />

                            <button
                                type="button"
                                onClick={() => api.requestOtp(authForm.identifier)}
                            >
                                Resend OTP
                            </button>
                        </>
                    )}

                    <button className="button button--primary button--full" type="submit">
                        {mode === "login"
                            ? otpStep
                                ? "Verify OTP"
                                : "Send OTP"
                            : "Create account"}
                    </button>

                    {message && <p className="helper-copy">{message}</p>}
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

        {message && <p className="helper-copy">{message}</p>}

        <div className="account-layout">

            {/* PROFILE */}
            <form className="detail-card" onSubmit={handleProfileSubmit}>
                <h2>Profile</h2>

                <div className="form-grid">
                    {Object.entries(profile).map(([field, value]) => (
                        <input
                            key={field}
                            value={value}
                            placeholder={field.replaceAll("_", " ")}
                            onChange={(e) =>
                                setProfile((c) => ({
                                    ...c,
                                    [field]: e.target.value,
                                }))
                            }
                        />
                    ))}
                </div>

                <button className="button button--secondary">
                    Save profile
                </button>
            </form>

            {/* SELLER SECTION */}
            <div className="detail-card">
                <h2>Seller status</h2>

                <div className="address-list">
                    <article className="address-card">
                        <strong>
                            {user?.seller_profile?.store_name ||
                                (user?.is_seller
                                    ? "TradeNest seller"
                                    : "Buyer only account")}
                        </strong>

                        <p>
                            {user?.seller_profile?.is_verified
                                ? "Verified seller"
                                : user?.is_seller
                                    ? "Seller profile active"
                                    : "Create a seller profile"}
                        </p>

                        <Link to="/sell" className="button button--secondary">
                            Open seller workspace
                        </Link>
                    </article>
                </div>
            </div>

            {/* ADDRESS SECTION (RESTORED) */}
            <form className="detail-card" onSubmit={handleAddressSubmit}>
                <h2>Add Address</h2>

                <div className="form-grid">
                    {Object.entries(address).map(([field, value]) => (
                        typeof value === "boolean" ? null : (
                            <input
                                key={field}
                                value={value}
                                placeholder={field.replaceAll("_", " ")}
                                onChange={(e) =>
                                    setAddress((c) => ({
                                        ...c,
                                        [field]: e.target.value,
                                    }))
                                }
                            />
                        )
                    ))}
                </div>

                <button className="button button--secondary">
                    Save address
                </button>
            </form>

        </div>
    </div>
    );
}