const BASE_URL = "http://127.0.0.1:8000";

// Get ID from query string
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

// 1. Create a variable to hold the existing image name
let currentImageName = "";

if (!productId) {
  alert("❌ No product ID found.");
  window.location.href = "adminDashboard.html";
}

// Load product details into form
async function loadProduct() {
  try {
    const res = await fetch(`${BASE_URL}/products/${productId}`);
    if (!res.ok) throw new Error("Failed to load product");
    const product = await res.json();

    document.getElementById("name").value = product.name;
    document.getElementById("price").value = product.price;
    document.getElementById("category").value = product.category;
    document.getElementById("previewImage").src = `${BASE_URL}/photos/${product.image}`;
    console.log("Product image path:", product.image)
    currentImageName = product.image;
  } catch (err) {
    console.error(err);
    alert("❌ Error loading product details");
  }
}

// Handle update form submission
document.getElementById("productForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  try {
    let filename = null;
    const imageFile = document.getElementById("imageFile").files[0];

    // Upload new image if selected
    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);

      const imageRes = await fetch(`${BASE_URL}/upload_image/`, {
        method: "POST",
        body: formData
      });

      if (!imageRes.ok) throw new Error("Image upload failed");
      const imageData = await imageRes.json();
       filename = imageData.filename; // "billing1.jpg"
    }

    // Prepare updated product data
    const updatedProduct = {
      name: document.getElementById("name").value.trim(),
      price: parseFloat(document.getElementById("price").value),
      category: document.getElementById("category").value.trim(),
      image: filename ? filename : currentImageName
    };

    // Send update request
    const updateRes = await fetch(`${BASE_URL}/products/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify(updatedProduct)
    });

    if (!updateRes.ok) throw new Error("Failed to update product");

    alert("✅ Product updated successfully!");
    window.location.href = "adminDashboard.html";
  } catch (err) {
    console.error(err);
    alert("❌ " + err.message);
  }
});

loadProduct();
