const BASE_URL = "http://127.0.0.1:8002";
const TOKEN_KEY = "adminToken";

const loginForm = document.getElementById("loginForm");
const statusEl = document.getElementById("loginStatus");

function setStatus(message, isError = false) {
  statusEl.textContent = message || "";
  statusEl.style.color = isError ? "#fca5a5" : "#22c55e";
}

function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    setStatus("Username and password required.", true);
    return;
  }

  try {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);

    const res = await fetch(`${BASE_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(data.detail || "Login failed");
    }

    storeToken(data.access_token);
    setStatus("Login successful. Redirecting...");
    setTimeout(() => (window.location.href = "adminDashboard.html"), 600);
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Login failed", true);
  }
});

// If already logged in, jump to dashboard
const existing = localStorage.getItem(TOKEN_KEY);
if (existing) {
  window.location.href = "adminDashboard.html";
}

