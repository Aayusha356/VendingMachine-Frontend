let products = [];
const BASE_URL = "http://127.0.0.1:8000";
const WEATHER_API_KEY = "c75ea9264be52e6fba406ca8b0e2146f";
const WEATHER_CITY = "Kathmandu"; 
const HOT_THRESHOLD = 10; 
const WEATHER_CACHE_KEY = `vm_weather_cache_t${HOT_THRESHOLD}`;

let currentWeather = null;

// ─── Weather ───────────────────────────────────────────────────────────────

async function fetchWeather() {
  try {
    const cached = sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      currentWeather = JSON.parse(cached);
      console.log("Weather loaded from session cache:", currentWeather.temp + "°C");
      injectWeatherBanner();
      return;
    }

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${WEATHER_CITY}&appid=${WEATHER_API_KEY}&units=metric`
    );
    if (!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();

    currentWeather = {
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      isHot: data.main.temp >= HOT_THRESHOLD,
    };

    sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(currentWeather));
    console.log("Weather fetched from API:", currentWeather.temp + "°C");

    injectWeatherBanner();
  } catch (err) {
    console.warn("Weather unavailable:", err.message);
    currentWeather = null;
  }
}

function injectWeatherBanner() {
  if (!currentWeather) return;

  document.getElementById("weatherBanner")?.remove();

  const banner = document.createElement("div");
  banner.id = "weatherBanner";
  banner.className = `weather-banner ${currentWeather.isHot ? "hot" : "cool"}`;

  const emoji = currentWeather.isHot ? "🌡️" : "❄️";
  const tip = currentWeather.isHot
    ? "It's hot outside — <strong>Juices</strong> are featured first for you!"
    : `${currentWeather.temp.toFixed(1)}°C in ${WEATHER_CITY} — stay refreshed!`;

  // banner.innerHTML = `
  //   <span class="weather-icon">
  //     <img src="https://openweathermap.org/img/wn/${currentWeather.icon}.png" alt="${currentWeather.description}" width="28" height="28" />
  //   </span>
  //   <span class="weather-text">
  //     ${emoji} <strong>${currentWeather.temp.toFixed(1)}°C</strong> · ${capitalise(currentWeather.description)} · ${tip}
  //   </span>
  // `;

  const tabs = document.getElementById("categoryTabs");
  if (tabs && tabs.parentNode) {
    tabs.parentNode.insertBefore(banner, tabs);
  }
}

// ─── Products ──────────────────────────────────────────────────────────────

async function fetchProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "<p style='color:#9ca3af'>Loading menu...</p>";

  // KEY FIX: Wait for weather data BEFORE fetching products
  // This ensures currentWeather is set before renderCategories() runs.
  await fetchWeather(); 
  await fetchProductsOnly();
}

async function fetchProductsOnly() {
  const grid = document.getElementById("productGrid");

  try {
    const res = await fetch(`${BASE_URL}/products/`);
    if (!res.ok) throw new Error("Unable to fetch products");
    const data = await res.json();

    products = data.map((p) => ({
      ...p,
      image: `${BASE_URL}/photos/${p.image}`,
    }));

    renderCategories();
    showNotification("Products synced from backend");
  } catch (err) {
    console.error("Error fetching products:", err);
    grid.innerHTML = "<p style='color:#fca5a5'>Failed to load products. Please check if the backend is running.</p>";
  }
}

// ─── Categories ────────────────────────────────────────────────────────────

function renderCategories() {
  const tabs = document.getElementById("categoryTabs");
  if (!tabs) return;

  // Create unique category list
  let uniqueCategories = ["all", ...new Set(products.map((p) => p.category || "others"))];

  // If hot, move juice to the second position (after "all")
  if (currentWeather?.isHot) {
    const juiceIndex = uniqueCategories.findIndex(
      (c) => c.toLowerCase() === "juice"
    );
    if (juiceIndex !== -1) {
      const [juiceCat] = uniqueCategories.splice(juiceIndex, 1);
      uniqueCategories.splice(1, 0, juiceCat);
    }
  }

  tabs.innerHTML = "";
  uniqueCategories.forEach((category) => {
    const btn = document.createElement("button");
    const label = category === "all" ? "All" : capitalise(category);
    const isJuiceHot = currentWeather?.isHot && category.toLowerCase() === "juice";

    btn.innerHTML = isJuiceHot ? ` ${label}` : label;
    
    // Logic to set active class
    if (currentWeather?.isHot && category.toLowerCase() === "juice") {
        btn.className = "active tab-hot";
    } else if (!currentWeather?.isHot && category === "all") {
        btn.className = "active";
    } else {
        btn.className = "";
    }

    btn.onclick = () => filterCategory(category, btn);
    tabs.appendChild(btn);
  });

  // Load the correct set of products based on weather
  if (currentWeather?.isHot) {
    const hasJuice = products.some(p => (p.category || "").toLowerCase() === "juice");
    if (hasJuice) {
      loadProducts("juice");
      return;
    }
  }

  loadProducts("all");
}

function loadProducts(category = "all") {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  const filtered =
    category === "all"
      ? products
      : products.filter(
          (p) => (p.category || "").toLowerCase() === category.toLowerCase()
        );

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
  document
    .querySelectorAll("#categoryTabs button")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  loadProducts(category);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function startCheckout(productId, qty = 1) {
  window.location.href = `checkout.html?productId=${productId}&qty=${qty}`;
}

function showNotification(message) {
  const notification = document.getElementById("notification");
  if (!notification) return;
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
  if (e.shiftKey && e.key === "A") openAdmin();
});

window.onload = () => {
  fetchProducts();
};