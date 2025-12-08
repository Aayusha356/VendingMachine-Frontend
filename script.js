let products = [];
const BASE_URL = "http://127.0.0.1:8000";

async function fetchProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  try {
    const res = await fetch(`${BASE_URL}/products/`);
    if (!res.ok) throw new Error("Unable to fetch products");
    const data = await res.json();

    products = data.map((p) => ({
      ...p,
      image: `${BASE_URL}/photos/${p.image}`,
    }));

    renderCategories();
    loadProducts("all");
    showNotification("Products synced from backend");
  } catch (err) {
    console.error("Error fetching products:", err);
    grid.innerHTML = "<p style='color:#fca5a5'>Failed to load products.</p>";
  }
}

function renderCategories() {
  const tabs = document.getElementById("categoryTabs");
  const uniqueCategories = ["all", ...new Set(products.map((p) => p.category || "others"))];

  tabs.innerHTML = "";
  uniqueCategories.forEach((category, index) => {
    const btn = document.createElement("button");
    btn.textContent = category === "all" ? "All" : category.charAt(0).toUpperCase() + category.slice(1);
    btn.className = index === 0 ? "active" : "";
    btn.onclick = () => filterCategory(category, btn);
    tabs.appendChild(btn);
  });
}

function loadProducts(category = "all") {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  const filtered =
    category === "all"
      ? products
      : products.filter((p) => (p.category || "").toLowerCase() === category.toLowerCase());

  if (!filtered.length) {
    grid.innerHTML = "<p style='color:#9ca3af'>No products in this category yet.</p>";
    return;
  }

  filtered.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="img-wrap">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="title">${product.name}</div>
      <div class="meta">
        <span class="pill">${product.category || "item"}</span>
        <span class="price">Rs. ${product.price}</span>
      </div>
      <div class="qty-wrap">
        <label for="qty-${product.id}">Qty</label>
        <input id="qty-${product.id}" class="qty-input" type="number" min="1" max="50" value="1" />
      </div>
      <button class="primary-btn" aria-label="Buy ${product.name}">
        <i class="fas fa-qrcode"></i> Buy Now
      </button>
    `;
    const buyBtn = card.querySelector("button");
    const qtyInput = card.querySelector(".qty-input");
    buyBtn.addEventListener("click", () => {
      const qtyVal = Math.min(Math.max(Number(qtyInput.value) || 1, 1), 50);
      qtyInput.value = qtyVal;
      startCheckout(product.id, qtyVal);
    });
    grid.appendChild(card);
  });
}

function filterCategory(category, btn) {
  document.querySelectorAll("#categoryTabs button").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  loadProducts(category);
}

function startCheckout(productId, qty = 1) {
  window.location.href = `checkout.html?productId=${productId}&qty=${qty}`;
}

function showNotification(message) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.style.display = "block";

  setTimeout(() => {
    notification.style.display = "none";
  }, 2400);
}

function openAdmin() {
  window.open("adminAuth.html", "_blank");
}

document.addEventListener("keydown", (e) => {
  if (e.shiftKey && e.key === "A") {
    openAdmin();
  }
});

window.onload = () => {
  fetchProducts();
};
