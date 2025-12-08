const BASE_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "adminToken";

const tableBody = document.getElementById("productTableBody");
const authHint = document.getElementById("auth-hint");

const mTotal = document.getElementById("m-total");
const mPaid = document.getElementById("m-paid");
const mPending = document.getElementById("m-pending");
const mRevenue = document.getElementById("m-revenue");
const mAvg = document.getElementById("m-avg");
const topList = document.getElementById("top-products");

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function requireTokenOrHint() {
  const token = getToken();
  if (!token) {
    authHint.style.display = "block";
    return null;
  }
  authHint.style.display = "none";
  return token;
}

async function loadProducts() {
  try {
    const res = await fetch(`${BASE_URL}/products`);
    const products = await res.json();

    tableBody.innerHTML = "";

    products.forEach((product) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><img src="${BASE_URL}/photos/${product.image}" alt="${product.name}" /></td>
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>Rs. ${Number(product.price).toFixed(2)}</td>
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

async function loadAnalytics() {
  const token = requireTokenOrHint();
  if (!token) return;

  try {
    const res = await fetch(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      authHint.style.display = "block";
      return;
    }

    const data = await res.json();
    mTotal.textContent = data.total_orders;
    mPaid.textContent = data.paid_orders;
    mPending.textContent = data.pending_orders;
    mRevenue.textContent = data.total_revenue.toFixed(2);
    mAvg.textContent = data.average_ticket_size.toFixed(2);

    topList.innerHTML = "";
    if (!data.top_products || !data.top_products.length) {
      topList.innerHTML = "<li>No paid orders yet.</li>";
    } else {
      data.top_products.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = `${p.product_name} — qty ${p.total_quantity}, Rs. ${p.total_revenue.toFixed(
          2
        )}`;
        topList.appendChild(li);
      });
    }
  } catch (error) {
    console.error("Error loading analytics:", error);
  }
}

function editProduct(id) {
  window.location.href = `editProduct.html?id=${id}`;
}

async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const res = await fetch(`${BASE_URL}/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to delete product");
    }
    alert("✅ Product deleted successfully!");
    loadProducts();
  } catch (error) {
    alert("❌ Error deleting product: " + error.message);
    console.error(error);
  }
}

function addProduct() {
  window.open("admin.html", "_blank");
}

// Init
loadProducts();
loadAnalytics();
