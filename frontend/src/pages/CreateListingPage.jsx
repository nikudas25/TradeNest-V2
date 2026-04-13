import {useState} from "react";
import {api} from "../api/client";

export function CreateListingPage() {
    const [form, setForm] = useState({
        name: "",
        short_description: "",
        description: "",
        price: "",
        stock_quantity: "",
        category_id: "",
    });

    const [images, setImages] = useState([]);
    const [preview, setPreview] = useState([]);

    function handleChange(e) {
        setForm({...form, [e.target.name]: e.target.value});
    }

    function handleImageChange(e) {
        const files = Array.from(e.target.files);

        setImages(files);

        const previewUrls = files.map((file) => URL.createObjectURL(file));
        setPreview(previewUrls);
    }

    function removeImage(index) {
        const newImages = [...images];
        const newPreview = [...preview];

        newImages.splice(index, 1);
        newPreview.splice(index, 1);

        setImages(newImages);
        setPreview(newPreview);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData();

        Object.keys(form).forEach((key) => {
            formData.append(key, form[key]);
        });

        images.forEach((img) => {
            formData.append("images", img);
        });

        try {
            const token = localStorage.getItem("token");

            const res = await fetch(
                "http://localhost:8000/api/catalog/my-listings/",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Token ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await res.json();
            console.log(data);

            alert("Product created successfully 🚀");
        } catch (err) {
            console.error(err);
            alert("Error creating product");
        }
    }

    return (
        <div style={{padding: "40px", maxWidth: "800px", margin: "0 auto"}}><h1>Create Listing</h1>

            <form onSubmit={handleSubmit} className="form">
                <input
                    name="name"
                    placeholder="Product name"
                    onChange={handleChange}
                />

                <input
                    name="short_description"
                    placeholder="Short description"
                    onChange={handleChange}
                />

                <textarea
                    name="description"
                    placeholder="Full description"
                    onChange={handleChange}
                />

                <input
                    name="price"
                    placeholder="Price"
                    onChange={handleChange}
                />

                <input
                    name="stock_quantity"
                    placeholder="Stock"
                    onChange={handleChange}
                />

                <input
                    name="category_id"
                    placeholder="Category ID"
                    onChange={handleChange}
                />

                {/* 🔥 IMAGE UPLOAD (single clean version) */}
                <div style={{marginTop: "20px"}}>
                    <label>Upload Images</label>

                    <input type="file" multiple onChange={handleImageChange}/>

                    <div style={{display: "flex", gap: "10px", marginTop: "10px"}}>
                        {preview.map((img, index) => (
                            <div key={index} style={{position: "relative"}}>
                                <img
                                    src={img}
                                    width="80"
                                    height="80"
                                    style={{objectFit: "cover", borderRadius: "8px"}}
                                />

                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        right: 0,
                                        background: "red",
                                        color: "white",
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    X
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <button type="submit">Create Product</button>
            </form>
        </div>
    );
}