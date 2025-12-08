let products = [];
const BASE_URL = "http://127.0.0.1:8000";
const cartKey = "vendingCart";

async function fetchProducts(category = "chocolate") {
  try {
    const res = await fetch(`${BASE_URL}/products`);
    const data = await res.json();

    // Update image paths to full URL
    products = data.map(p => ({
      ...p,
      image: `${BASE_URL}/${p.image}` // assuming `p.image` is just filename
    }));

    loadProducts(category);
  } catch (err) {
    console.error("Error fetching products:", err);
  }
}

function loadProducts(category = "chocolate") {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  const filtered = products.filter(p => p.category === category);

  filtered.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="title">${product.name}</div>
      <div class="price">Rs. ${product.price}</div>
      <button class="add-cart" onclick="addToCart(${product.id})">🛒 Add to Cart</button>
    `;
    grid.appendChild(card);
  });
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  localStorage.setItem(cartKey, JSON.stringify(cart));
  showNotification(`${product.name} added`);
  updateCartCount();

  setTimeout(() => {
    window.location.href = "cart.html";
  }, 1500);
}

function filterCategory(category) {
  document.querySelectorAll(".tabs button").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");
  loadProducts(category);
}

function showNotification(message) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.style.display = "block";

  setTimeout(() => {
    notification.style.display = "none";
  }, 2500);
}

function renderCart() {
  const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
  const container = document.getElementById("cartItems");
  const subtotalEl = document.getElementById("subtotal");

  if (!container) return;

  container.innerHTML = "";
  let subtotal = 0;

  cart.forEach((item, index) => {
    subtotal += item.price * item.qty;

    const el = document.createElement("div");
    el.className = "cart-item";
    el.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <div class="cart-info">
        <div>${item.name}</div>
        <div class="qty-controls">
          <button onclick="updateQty(${index}, -1)">-</button>
          <span>${item.qty}</span>
          <button onclick="updateQty(${index}, 1)">+</button>
        </div>
      </div>
      <div class="cart-price">Rs. ${item.price * item.qty}</div>
      <button class="remove-btn" onclick="removeItem(${index})">🗑</button>
    `;
    container.appendChild(el);
  });

  subtotalEl.textContent = subtotal;
}

function updateQty(index, change) {
  const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
  cart[index].qty += change;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  localStorage.setItem(cartKey, JSON.stringify(cart));
  renderCart();
}

function removeItem(index) {
  const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
  cart.splice(index, 1);
  localStorage.setItem(cartKey, JSON.stringify(cart));
  renderCart();
}

function clearCart() {
  localStorage.removeItem(cartKey);
  renderCart();
}

function goToCart() {
  window.location.href = "cart.html";
}

function goToCheckout() {
  window.location.href = "checkout.html";
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCountEl = document.getElementById("cartCount");
  if (cartCountEl) {
    cartCountEl.textContent = totalItems;
  }
}

function openAdmin() {
  window.open('adminDashboard.html', '_blank');
}

document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'A') {
    openAdmin();
  }
});

// Initialize
window.onload = () => {
  if (window.location.pathname.includes("cart.html")) {
    renderCart();
  } else {
    fetchProducts(); // fetch from backend on load
  }
};
