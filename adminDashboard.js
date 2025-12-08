 const BASE_URL = 'http://127.0.0.1:8000'; // Your FastAPI backend
    const tableBody = document.getElementById("productTableBody");

    async function loadProducts() {
      try {
        const res = await fetch(`${BASE_URL}/products`);
        const products = await res.json();

        tableBody.innerHTML = ""; // Clear previous

        products.forEach(product => {
          const tr = document.createElement("tr");

          tr.innerHTML = `
            <td><img src="${BASE_URL}/${product.image}" alt="${product.name}" /></td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td class="action-buttons">
              <button class="btn edit-btn" onclick="editProduct('${product.id}')">Edit</button>
              <button class="btn delete-btn" onclick="deleteProduct('${product.id}')">Delete</button>
            </td>
          `;

          tableBody.appendChild(tr);
        });
      } catch (error) {
        console.error("Error loading products:", error);
      }
    }


    // Go to Edit Product page with ID in URL
    function editProduct(id) {
  window.location.href = `editProduct.html?id=${id}`;
}

// Delete product
    async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const res = await fetch(`${BASE_URL}/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to delete product");
    }
    alert("✅ Product deleted successfully!");
    loadProducts();  // Refresh product list
  } catch (error) {
    alert("❌ Error deleting product: " + error.message);
    console.error(error);
  }
}


    // Load on page load
    loadProducts();

    function addProduct() {
    window.open('admin.html', '_blank');
}


