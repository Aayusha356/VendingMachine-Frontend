const BASE_URL = "http://127.0.0.1:8002";
const TOKEN_KEY = "adminToken";

// Auto-redirect if not logged in
const token = localStorage.getItem(TOKEN_KEY);
if (!token) {
  window.location.href = "adminAuth.html";
}

const tableBody = document.getElementById("productTableBody");
const authHint = document.getElementById("auth-hint");

// Operational view — critical alerts
const criticalAlertsEl = document.getElementById("critical-alerts-text");
const criticalSubtextEl = document.getElementById("critical-subtext");
const outOfStockListEl = document.getElementById("out-of-stock-list");

function titleCase(str) {
  return (str || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

async function restockProduct(productId, buttonEl, fromOps = false) {
  try {
    const container = fromOps ? buttonEl.closest("li") : buttonEl.closest("td");
    const input = container.querySelector(fromOps ? ".ops-restock-input" : ".restock-input");
    const raw = Number(input.value) || 0;
    const qtyDelta = Math.max(raw, 1);
    input.value = qtyDelta;

    buttonEl.disabled = true;
    buttonEl.textContent = "Saving...";

    const res = await fetch(`${BASE_URL}/products/${productId}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity_delta: qtyDelta }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to restock");
    }

    await loadProducts();
  } catch (e) {
    console.error("restockProduct error:", e);
    alert(e.message || "Failed to restock");
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = "Restock";
  }
}

const mTotal = document.getElementById("m-total");
const mPaid = document.getElementById("m-paid");
const mPending = document.getElementById("m-pending");
const mRevenue = document.getElementById("m-revenue");
const mAvg = document.getElementById("m-avg");
const mSlope = document.getElementById("m-slope");
const mR2 = document.getElementById("m-r2");
const mLast7 = document.getElementById("m-last7");
const mLast30 = document.getElementById("m-last30");
const mMoM = document.getElementById("m-mom");
const mNext = document.getElementById("m-next");
const mNextMonth = document.getElementById("m-nextmonth");
const topList = document.getElementById("top-products");

let revChart;
let catChart;
let topChart;
let forecastChart;
let monthlyChart;
let hourlyChart;

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function requireTokenOrHint() {
  const token = getToken();
  if (!token) {
    window.location.href = "adminAuth.html";
    return null;
  }
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
        <td>${product.quantity ?? 0}</td>
        <td class="action-buttons">
          <button class="btn edit-btn" onclick="editProduct('${product.id}')">Edit</button>
          <button class="btn delete-btn" onclick="deleteProduct('${product.id}')">Delete</button>
          <div class="restock-inline">
            <input type="number" min="1" value="1" class="restock-input" data-product-id="${product.id}">
            <button class="btn restock-btn" onclick="restockProduct(${product.id}, this)">Restock</button>
          </div>
        </td>
      `;

      tableBody.appendChild(tr);
    });

    // Critical analytics: show out-of-stock products to owner
    if (criticalAlertsEl && criticalSubtextEl && outOfStockListEl) {
      const outOfStock = products.filter((p) => (p.quantity ?? 0) <= 0);
      outOfStockListEl.innerHTML = "";

      if (!outOfStock.length) {
        criticalAlertsEl.textContent = "None";
        criticalSubtextEl.textContent = "All systems healthy";
        document
          .querySelector(".ops-critical-card")
          ?.classList.remove("has-alert");
        const badge = document.querySelector(".ops-critical-badge");
        if (badge) badge.textContent = "✓";
      } else {
        const names = outOfStock.map((p) => titleCase(p.name)).join(", ");
        criticalAlertsEl.textContent = `${outOfStock.length} product${outOfStock.length > 1 ? "s" : ""} out of stock`;
        criticalSubtextEl.textContent = `Restock these items: ${names}`;

        outOfStock.forEach((p) => {
          const li = document.createElement("li");
          li.innerHTML = `
            <span class="ops-outofstock-name">${titleCase(p.name)}</span>
            <input type="number" min="1" value="1" class="ops-restock-input" data-product-id="${p.id}">
            <button class="ops-restock-btn" onclick="restockProduct(${p.id}, this, true)">Restock</button>
          `;
          outOfStockListEl.appendChild(li);
        });

        document
          .querySelector(".ops-critical-card")
          ?.classList.add("has-alert");
        const badge = document.querySelector(".ops-critical-badge");
        if (badge) badge.textContent = "✕";
      }
    }
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
  localStorage.removeItem(TOKEN_KEY);   // token invalid
  window.location.href = "adminAuth.html"; // redirect
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

    renderRevenueChart(data.revenue_by_date || []);
    renderCategoryChart(data.category_breakdown || []);
    renderTopProductsChart(data.top_products || []);
  } catch (error) {
    console.error("Error loading analytics:", error);
    if (error.message.includes("401")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "adminAuth.html";
    }
  }
}

// ── Advanced analytics cache ───────────────────────────────────────────────
const ADV_CACHE_KEY      = "vm_advanced_analytics_cache";
const ADV_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in ms

function _getCached() {
  try {
    const raw = localStorage.getItem(ADV_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > ADV_CACHE_DURATION) {
      localStorage.removeItem(ADV_CACHE_KEY);
      return null;
    }
    // Discard cache entries from old schema that are missing regression fields
    if (!Array.isArray(data.coefficients) || !Array.isArray(data.feature_names)) {
      localStorage.removeItem(ADV_CACHE_KEY);
      return null;
    }
    return { data, timestamp };
  } catch { return null; }
}

function _setCache(data) {
  try {
    localStorage.setItem(ADV_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

function _setCacheStatus(type, text) {
  const el = document.getElementById("cacheStatus");
  if (!el) return;
  el.className = `cache-status ${type}`;
  el.textContent = text;
}

function _timeAgo(timestamp) {
  const mins = Math.round((Date.now() - timestamp) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
}

function _applyAdvancedData(data, fromCache, cacheTimestamp) {
  // Regression panel first — isolated so KPI errors never block it
  try { renderRegressionPanel(data); } catch (e) { console.error("renderRegressionPanel:", e); }

  // ── KPI cards (safe fallbacks so undefined never throws) ───────────────
  try {
    const n = data.sample_count ?? 0;
    if (mSlope)     mSlope.textContent     = n < 2 ? "--" : (data.slope ?? 0).toFixed(4);
    if (mR2)        mR2.textContent        = n < 2 ? "--" : (data.r2   ?? 0).toFixed(4);
    if (mLast7)     mLast7.textContent     = (data.last_7d_revenue  ?? 0).toFixed(2);
    if (mLast30)    mLast30.textContent    = (data.last_30d_revenue ?? 0).toFixed(2);
    if (mMoM)       mMoM.textContent       = `${(data.mom_growth_pct ?? 0).toFixed(2)}%`;
    const f7 = data.forecast_next_7 || [];
    if (mNext)      mNext.textContent      = f7.length ? (f7[0].revenue ?? 0).toFixed(2) : "--";
    if (mNextMonth) mNextMonth.textContent = (data.forecast_next_month ?? 0).toFixed(2);
  } catch (e) { console.error("KPI update error:", e); }

  // ── Charts ─────────────────────────────────────────────────────────────
  try { renderForecastChart(data.forecast_next_7 || []); } catch (e) { console.error(e); }
  try { renderMonthlyChart(data.monthly_sales    || []); } catch (e) { console.error(e); }
  try { renderHourlyChart(data.hourly_sales      || []); } catch (e) { console.error(e); }

  // ── Cache status badge ─────────────────────────────────────────────────
  if (fromCache) {
    _setCacheStatus("fresh", `✓ Cached · ${_timeAgo(cacheTimestamp)} · auto-refresh in 6 h`);
  } else {
    _setCacheStatus("live", `✓ Live data · ${new Date().toLocaleTimeString()}`);
  }

  // Re-enable recalculate button
  const btn = document.getElementById("recalcBtn");
  if (btn) { btn.disabled = false; btn.textContent = "↺ Recalculate"; }
}

async function loadAdvancedAnalytics(forceRefresh = false) {
  const token = requireTokenOrHint();
  if (!token) return;

  // Disable recalculate button while loading
  const btn = document.getElementById("recalcBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Loading…"; }

  // Try cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = _getCached();
    if (cached) {
      _applyAdvancedData(cached.data, true, cached.timestamp);
      return;
    }
  }

  _setCacheStatus("", "Fetching from server…");

  try {
    const res = await fetch(`${BASE_URL}/admin/analytics/advanced`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "adminAuth.html";
      return;
    }
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    _setCache(data);
    _applyAdvancedData(data, false, Date.now());
  } catch (err) {
    console.error("Error loading advanced analytics:", err);
    _setCacheStatus("error", `⚠ Error: ${err.message}`);
    const box = document.getElementById("equationBox");
    if (box) {
      box.textContent =
        `Failed to load regression data. Check that the backend is running.\n\n${err.message}`;
    }
    if (btn) { btn.disabled = false; btn.textContent = "↺ Retry"; }
    if (err.message.includes("401")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "adminAuth.html";
    }
  }
}

function recalculateAdvanced() {
  console.log("[Analytics] Recalculate clicked — clearing cache and fetching fresh data");
  const box = document.getElementById("equationBox");
  if (box) box.textContent = "Fetching fresh data…";
  _setCacheStatus("", "Recalculating…");
  localStorage.removeItem(ADV_CACHE_KEY);
  loadAdvancedAnalytics(true);
}

// ── Feature metadata for the regression table ──────────────────────────────
const FEATURE_META = {
  day_index:   { desc: "Sequential time index (0 = first day)",       unit: "day" },
  day_of_week: { desc: "Day of week (0 = Mon, 6 = Sun)",              unit: "integer" },
  is_weekend:  { desc: "1 if Saturday or Sunday, else 0",             unit: "binary" },
  month:       { desc: "Calendar month (1 = Jan, 12 = Dec)",          unit: "integer" },
  is_holiday:  { desc: "1 if Nepali public holiday, else 0",          unit: "binary" },
};

function coeffInterpretation(name, coeff) {
  const sign   = coeff >= 0 ? "increases" : "decreases";
  const absVal = Math.abs(coeff).toFixed(4);
  switch (name) {
    case "day_index":
      return `Revenue ${sign} by Rs. ${absVal} per additional day (trend)`;
    case "day_of_week":
      return `Revenue ${sign} by Rs. ${absVal} per unit increase in weekday number`;
    case "is_weekend":
      return `Weekend days show Rs. ${absVal} ${sign === "increases" ? "higher" : "lower"} revenue than weekdays`;
    case "month":
      return `Revenue ${sign} by Rs. ${absVal} per month (seasonality)`;
    case "is_holiday":
      return `Nepali public holidays add Rs. ${Math.abs(coeff).toFixed(4)} to revenue vs normal days`;
    default:
      return `Revenue ${sign} by Rs. ${absVal} per unit`;
  }
}

function renderRegressionPanel(data) {
  try {
  const coefficients = data.coefficients || [];
  const featureNames = data.feature_names || [];
  const intercept    = data.multi_intercept ?? 0;
  const r2           = data.r2 ?? 0;
  const n            = data.sample_count ?? 0;

  const eqBox   = document.getElementById("equationBox");
  const metaBox = document.getElementById("regressionMeta");
  if (!eqBox || !metaBox) {
    // Older HTML without regression panel – safely no-op
    return;
  }

  if (n < 2) {
    eqBox.textContent = "Not enough data to fit regression (need ≥ 2 days).";
    return;
  }

  // ── Build full equation string ─────────────────────────────────────────
  let eq = `ŷ = ${intercept >= 0 ? "" : ""}${intercept.toFixed(4)}`;
  featureNames.forEach((name, i) => {
    const c    = coefficients[i] ?? 0;
    const sign = c >= 0 ? "+" : "−";
    eq += `\n    ${sign} ${Math.abs(c).toFixed(4)} · ${name}`;
  });
  eqBox.textContent = eq;

  // ── Meta row (R², n, intercept) ────────────────────────────────────────
  metaBox.innerHTML = `
    <div class="regression-meta-item">R² = <span>${r2.toFixed(4)}</span></div>
    <div class="regression-meta-item">Sample days = <span>${n}</span></div>
    <div class="regression-meta-item">Intercept (β₀) = <span>${intercept.toFixed(4)}</span></div>
  `;

  } catch (err) {
    console.error("renderRegressionPanel error:", err);
    const box = document.getElementById("equationBox");
    if (box) box.textContent = `Render error: ${err.message}`;
  }
}

function renderRevenueChart(rows) {
  const ctx = document.getElementById("revChart");
  if (!ctx) return;
  const labels = rows.map((r) => {
    const d = new Date(r.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const values = rows.map((r) => r.revenue);

  if (revChart) revChart.destroy();

  revChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue (Rs)",
          data: values,
          borderColor: "#404040",
          backgroundColor: "rgba(242,91,60,0.18)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: { color: "#1f2937" },
        },
        tooltip: {
          callbacks: {
            label: (context) => `Revenue: Rs. ${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Date", color: "#1f2937" },
        },
        y: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Revenue (Rs)", color: "#1f2937" },
        },
      },
    },
  });
}

function renderCategoryChart(rows) {
  const ctx = document.getElementById("catChart");
  if (!ctx) return;
  const list = Array.isArray(rows) ? rows : [];
  const labels = list.map((r) => r.category || "Uncategorized");
  const values = list.map((r) => (r.total_revenue != null ? r.total_revenue : 0));

  if (catChart) catChart.destroy();

  if (labels.length === 0) {
    catChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["No data yet"],
        datasets: [{ data: [1], backgroundColor: ["#e5e7eb"], borderWidth: 0 }],
      },
      options: {
        plugins: { legend: { display: true, position: "right" } },
        tooltip: { callbacks: { label: () => "No category sales yet" } },
      },
    });
    return;
  }

  catChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue (Rs)",
          data: values,
          backgroundColor: ["#f25b3c", "#0ea5e9", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"],
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: "right",
          labels: { color: "#1f2937" },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: Rs. ${context.parsed.toFixed(2)}`,
          },
        },
      },
    },
  });
}

function renderTopProductsChart(rows) {
  const ctx = document.getElementById("topChart");
  if (!ctx) return;
  const labels = rows.map((r) => r.product_name);
  const values = rows.map((r) => r.total_revenue);

  if (topChart) topChart.destroy();

  topChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue (Rs)",
          data: values,
          backgroundColor: "rgba(242,91,60,0.6)",
          borderColor: "#404040",
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: { color: "#1f2937" },
        },
        tooltip: {
          callbacks: {
            label: (context) => `Revenue: Rs. ${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Product", color: "#1f2937" },
        },
        y: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Revenue (Rs)", color: "#1f2937" },
        },
      },
    },
  });
}

function renderForecastChart(rows) {
  const ctx = document.getElementById("forecastChart");
  if (!ctx) return;
  const labels = rows.map((r) => {
    const d = new Date(r.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const values = rows.map((r) => r.revenue);

  if (forecastChart) forecastChart.destroy();

  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Forecast (Rs)",
          data: values,
          borderDash: [5, 5],
          borderColor: "#404040",
          backgroundColor: "rgba(14,165,233,0.18)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: { color: "#1f2937" },
        },
        tooltip: {
          callbacks: {
            label: (context) => `Forecast: Rs. ${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Date", color: "#1f2937" },
        },
        y: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Forecast (Rs)", color: "#1f2937" },
        },
      },
    },
  });
}

function renderMonthlyChart(rows) {
  const ctx = document.getElementById("monthlyChart");
  if (!ctx) return;
  const labels = rows.map((r) => `${r.month.substring(0, 3)} ${r.year}`);
  const values = rows.map((r) => r.total_revenue);

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue (Rs)",
          data: values,
          backgroundColor: "rgba(34,197,94,0.6)",
          borderColor: "#404040",
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: { color: "#1f2937" },
        },
        tooltip: {
          callbacks: {
            label: (context) => `Revenue: Rs. ${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Month", color: "#1f2937" },
        },
        y: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Revenue (Rs)", color: "#1f2937" },
        },
      },
    },
  });
}

function renderHourlyChart(rows) {
  const ctx = document.getElementById("hourlyChart");
  if (!ctx) return;
  const labels = rows.map((r) => `${r.hour}:00`);
  const values = rows.map((r) => r.total_revenue);

  if (hourlyChart) hourlyChart.destroy();

  hourlyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue (Rs)",
          data: values,
          borderColor: "#404040",
          backgroundColor: "rgba(168,85,247,0.18)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: { color: "#1f2937" },
        },
        tooltip: {
          callbacks: {
            label: (context) => `Revenue: Rs. ${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Hour of Day", color: "#1f2937" },
        },
        y: {
          ticks: { color: "#1f2937" },
          title: { display: true, text: "Revenue (Rs)", color: "#1f2937" },
        },
      },
    },
  });
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

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "adminAuth.html";
}

function showMoreAnalytics() {
  document.getElementById("advancedSection").scrollIntoView({ behavior: "smooth" });
}

// Init
loadProducts();
loadAnalytics();
loadAdvancedAnalytics();
