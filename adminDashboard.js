const BASE_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "adminToken";

// Auto-redirect if not logged in
const token = localStorage.getItem(TOKEN_KEY);
if (!token) {
  window.location.href = "adminAuth.html";
}

const tableBody = document.getElementById("productTableBody");
const authHint = document.getElementById("auth-hint");

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

async function loadAdvancedAnalytics() {
  const token = requireTokenOrHint();
  if (!token) return;
  try {
    const res = await fetch(`${BASE_URL}/admin/analytics/advanced`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "adminAuth.html";
      return;
    }
    const data = await res.json();
    mSlope.textContent = data.sample_count < 2 ? "--" : data.slope.toFixed(2);
    mR2.textContent = data.sample_count < 2 ? "--" : data.r2.toFixed(2);
    mLast7.textContent = data.last_7d_revenue.toFixed(2);
    mLast30.textContent = data.last_30d_revenue.toFixed(2);
    mMoM.textContent = `${data.mom_growth_pct.toFixed(2)}%`;
    mNext.textContent = data.forecast_next_7.length
      ? data.forecast_next_7[0].revenue.toFixed(2)
      : "--";
    mNextMonth.textContent = data.forecast_next_month.toFixed(2);

    renderForecastChart(data.forecast_next_7 || []);
    renderMonthlyChart(data.monthly_sales || []);
    renderHourlyChart(data.hourly_sales || []);
  } catch (err) {
    console.error("Error loading advanced analytics:", err);
    if (err.message.includes("401")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "adminAuth.html";
    }
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
  const labels = rows.map((r) => r.category || "Uncategorized");
  const values = rows.map((r) => r.total_revenue);

  if (catChart) catChart.destroy();

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
