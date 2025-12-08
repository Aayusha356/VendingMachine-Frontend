const BASE_URL = "http://192.168.18.23:8000";
const cartKey = "vendingCart";

// Generate order ID automatically from backend
let orderId = null;

// Get cart and amount
const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
document.getElementById("amount").textContent = `Nrs. ${total}`;

// Use first product name
const productName = cart.length ? cart[0].name : "Unknown";

async function createOrder() {
  console.log("createOrder called");     // DEBUG
  const res = await fetch(`${BASE_URL}/payment/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: total,
      product_name: productName
    })
  });

  console.log("Order created response:", res.status); // DEBUG

  const order = await res.json();

  console.log("Order data:", order);      // DEBUG
  orderId = order.id;

  // Show on UI
  document.getElementById("order-id").textContent = orderId;

  generateQRCode(orderId);
  startPolling();
}

function generateQRCode(orderId) {
  const qrData = `${BASE_URL}/payment/scan/${orderId}/${encodeURIComponent(productName)}`;

  const qrImg = document.getElementById("qr-img");

  console.log("QR data:", qrData);

  const finalURL = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;

  console.log("QR URL:", finalURL);

  qrImg.src = finalURL;
}


async function startPolling() {
  const interval = setInterval(async () => {
    const res = await fetch(`${BASE_URL}/payment/status/${orderId}`);
    const data = await res.json();

    if (data.status === "paid") {
    clearInterval(interval);

    // Show success UI
    document.getElementById("success-screen").style.display = "flex";

    // Optional: Auto redirect after 5 sec
    setTimeout(() => {
        goHome();
    }, 5000);
}

  }, 2000);
}

function goHome() {
  window.location.href = "index.html";
}


// Run
createOrder();
