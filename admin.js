document.getElementById("productForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const imageFile = document.getElementById("imageFile").files[0];

  if (!imageFile) {
    document.getElementById("statusMessage").textContent = "❌ Please select an image.";
    return;
  }

  try {
    // 1. Upload image to backend
    const formData = new FormData();
    formData.append("file", imageFile);

    const imageRes = await fetch("http://127.0.0.1:8000/upload_image/", {
      method: "POST",
      body: formData,
    });

    if (!imageRes.ok) throw new Error("Image upload failed.");

    const imageData = await imageRes.json();
    const filename = imageData.filename; // "billing1.jpg"


    // 2. Now send product data
    const product = {
      name: document.getElementById("name").value.trim(),
      price: parseFloat(document.getElementById("price").value),
      category: document.getElementById("category").value.trim(),
      image: filename // Pass only the path from backend
    };

    const productRes = await fetch("http://127.0.0.1:8000/products/", {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(product)
    });

    if (!productRes.ok) throw new Error("Failed to add product.");

    document.getElementById("statusMessage").textContent = "✅ Product added successfully!";
    document.getElementById("productForm").reset();

  } catch (err) {
    document.getElementById("statusMessage").textContent = "❌ Error: " + err.message;
  }
});
