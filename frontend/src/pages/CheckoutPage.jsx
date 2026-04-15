import {useState, useEffect} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useShop} from "../context/ShopContext";
import {formatCurrency} from "../data/formatters";
import {load} from "@cashfreepayments/cashfree-js";
import {api} from "../api/client";

const initialAddress = {
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
};

export function CheckoutPage() {
    const {cart, checkout, user} = useShop();
    const navigate = useNavigate();
    const [isAddressSelected, setIsAddressSelected] = useState(false);
    const [shippingAddress, setShippingAddress] = useState(initialAddress);
    const [addresses, setAddresses] = useState([]);
    const [billingAddress, setBillingAddress] = useState(initialAddress);
    const [sameAsShipping, setSameAsShipping] = useState(true);
    const [confirmation, setConfirmation] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fields = [
        "recipient_name",
        "phone_number",
        "street_line_1",
        "street_line_2",
        "city",
        "state",
        "postal_code",
        "country",
        "landmark",
        "delivery_notes",
    ];

    // ✅ FETCH + AUTO SELECT DEFAULT ADDRESS
    useEffect(() => {
        async function fetchAddresses() {
            try {
                const data = await api.getAddresses();
                const list = data.results;

                setAddresses(list);

                const defaultAddr = list.find(a => a.is_default_shipping);

                if (defaultAddr && !shippingAddress.recipient_name) {
                    setShippingAddress({
                        recipient_name: defaultAddr.recipient_name || "",
                        phone_number: defaultAddr.phone_number || "",
                        street_line_1: defaultAddr.street_line_1 || "",
                        street_line_2: defaultAddr.street_line_2 || "",
                        city: defaultAddr.city || "",
                        state: defaultAddr.state || "",
                        postal_code: defaultAddr.postal_code || "",
                        country: defaultAddr.country || "India",
                        landmark: defaultAddr.landmark || "",
                        delivery_notes: defaultAddr.delivery_notes || "",
                    });
                }
            } catch (err) {
                console.error(err);
            }
        }

        fetchAddresses();
    }, []);

    async function handleSubmit(event) {
        if (!shippingAddress.recipient_name) {
            alert("Please select or enter an address");
            return;
        }
        event.preventDefault();
        setSubmitting(true);
        try {
            const response = await checkout({
                email: user.email,
                phone_number: shippingAddress.phone_number,
                shipping_address: {
                    recipient_name: shippingAddress.recipient_name,
                    phone_number: shippingAddress.phone_number,
                    street_line_1: shippingAddress.street_line_1,
                    street_line_2: shippingAddress.street_line_2,
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    postal_code: shippingAddress.postal_code,
                    country: shippingAddress.country,
                    landmark: shippingAddress.landmark,
                    delivery_notes: shippingAddress.delivery_notes,
                },
                billing_address: sameAsShipping ? shippingAddress : billingAddress,
                same_as_shipping: sameAsShipping,
                payment_method: "escrow",
                notes: "",
            });

            const paymentSessionId = response.payment_session_id;

            const cashfree = await load({mode: "sandbox"});

            cashfree.checkout({
                paymentSessionId,
                redirectTarget: "_modal",
                onSuccess: () => {
                    alert("Payment Successful 🎉");
                    navigate("/orders");
                },
                onFailure: () => alert("Payment Failed ❌"),
            });
        } catch (err) {
            console.error("Checkout error:", err);
            alert("Something went wrong during checkout");
        } finally {
            setSubmitting(false);
        }
    }

    function updateAddress(setter, field, value) {
        setter((current) => ({...current, [field]: value}));
    }

    if (!cart.items.length) {
        return (
            <div className="container empty-panel">
                <h1>Your cart is empty</h1>
                <Link className="button button--primary" to="/shop">
                    Add products
                </Link>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container empty-panel">
                <h1>Sign in for checkout</h1>
                <Link className="button button--primary" to="/account">
                    Sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="page-stack container">
            <div className="checkout-layout">
                <form className="checkout-form" onSubmit={handleSubmit}>

                    {/* ✅ SELECT SAVED ADDRESS */}
                    <div className="detail-card">
                        <h2>Select Saved Address</h2>

                        {addresses.length === 0 ? (
                            <p>No saved addresses</p>
                        ) : (
                            <div className="address-list">
                                {addresses.map(addr => (
                                    <div
                                        key={addr.id}
                                        className="address-card"
                                    >
                                        <strong>{addr.label}</strong>
                                        <p>{addr.formatted}</p>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShippingAddress({
                                                    recipient_name: addr.recipient_name || "",
                                                    phone_number: addr.phone_number || "",
                                                    street_line_1: addr.street_line_1 || "",
                                                    street_line_2: addr.street_line_2 || "",
                                                    city: addr.city || "",
                                                    state: addr.state || "",
                                                    postal_code: addr.postal_code || "",
                                                    country: addr.country || "India",
                                                    landmark: addr.landmark || "",
                                                    delivery_notes: addr.delivery_notes || "",
                                                })
                                            }
                                        >
                                            Use this address
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ✅ SHOW SELECTED ADDRESS */}
                    {isAddressSelected && (
                        <div className="detail-card">
                            <h2>Selected Address</h2>
                            <p><strong>{shippingAddress.recipient_name}</strong></p>
                            <p>{shippingAddress.street_line_1}, {shippingAddress.city}</p>

                            <button
                                type="button"
                                onClick={() => {
                                    setShippingAddress({
                                        recipient_name: addr.recipient_name || "",
                                        phone_number: addr.phone_number || "",
                                        street_line_1: addr.street_line_1 || "",
                                        street_line_2: addr.street_line_2 || "",
                                        city: addr.city || "",
                                        state: addr.state || "",
                                        postal_code: addr.postal_code || "",
                                        country: addr.country || "India",
                                        landmark: addr.landmark || "",
                                        delivery_notes: addr.delivery_notes || "",
                                    });

                                    setIsAddressSelected(true); // ✅ ADD THIS LINE
                                }}
                            >
                                Change Address
                            </button>
                        </div>
                    )}

                    {/* ✅ SHOW FORM ONLY IF NO ADDRESS SELECTED */}
                    {!isAddressSelected && (
                        <div className="detail-card">
                            <h2>Shipping details</h2>
                            <div className="form-grid">
                                {fields.map(field => (
                                    <input
                                        key={field}
                                        value={shippingAddress[field] || ""}
                                        onChange={(e) => updateAddress(setShippingAddress, field, e.target.value)}
                                        placeholder={field.replaceAll("_", " ")}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="button button--primary button--full"
                        disabled={submitting}
                    >            {submitting ? "Placing order..." : "Place order"}
                    </button>
                </form>
            </div>
        </div>
    );
}

