// Backend API used by this browser (WSL → host)
// const BASE_URL = "http://127.0.0.1:8000";
// URL that goes inside the QR code (must be reachable from the PHONE)
// If your phone is on the same Wi‑Fi as the laptop, this should be the
// laptop's LAN IP; update it if your IP changes.
const QR_BASE_URL = "http://192.168.18.23:8000";

let orderId = null;
const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("productId"));

async function initCheckout() {
  if (!productId) {
    showError("No product selected. Please start again.");
    return;
  }

  try {
    const productRes = await fetch(`${BASE_URL}/products/${productId}`);
    if (!productRes.ok) throw new Error("Unable to load product details");
    const product = await productRes.json();

    // Vending machine dispenses exactly one item per transaction
    const qty = 1;
    const total = Number(product.price) * qty;
    document.getElementById("product-name").textContent = product.name;
    document.getElementById("amount").textContent = `Nrs. ${total}`;
    document.getElementById("qty-label").textContent = `Qty: ${qty}`;

    const orderRes = await fetch(`${BASE_URL}/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity: qty }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json().catch(() => ({}));
      throw new Error(err.detail || "Could not create order");
    }

    const order = await orderRes.json();
    orderId = order.id;
    document.getElementById("order-id").textContent = orderId;

    generateQRCode(orderId);
    startPolling();
  } catch (error) {
    console.error(error);
    showError(error.message || "Something went wrong");
  }
}

function generateQRCode(orderId) {
  const qrData = `${QR_BASE_URL}/payment/scan/${orderId}`;
  const qrImg = document.getElementById("qr-img");
  const finalURL = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
  qrImg.src = finalURL;
}

async function startPolling() {
  const interval = setInterval(async () => {
    const res = await fetch(`${BASE_URL}/payment/status/${orderId}`);
    const data = await res.json();

    if (data.status === "paid") {
      clearInterval(interval);
      document.getElementById("success-screen").style.display = "flex";
      setTimeout(() => goHome(), 5000);
    }
  }, 2000);
}

function showError(message) {
  const box = document.getElementById("message");
  box.textContent = message;
  box.style.display = "block";
}

function goHome() {
  window.location.href = "index.html";
}

initCheckout();
