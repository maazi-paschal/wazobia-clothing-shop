/* Wazobia shared client logic: Supabase client, auth, cart, toasts. */
const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_FLAT = 10;
const CART_KEY = "wazobia_cart_v1";

let sb = null;
let supabaseInitPromise = null;

async function initSupabase() {
  if (sb) return sb;
  if (supabaseInitPromise) return supabaseInitPromise;
  supabaseInitPromise = (async () => {
    try {
      const res = await fetch("/api/config");
      const config = await res.json();
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error("Missing Supabase configuration from server");
      }
      if (window.supabase && window.supabase.createClient) {
        sb = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      }
      return sb;
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      return null;
    }
  })();
  return supabaseInitPromise;
}

const fmt = (n) => "$" + Number(n).toFixed(2);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f2ec"/><stop offset="1" stop-color="#e3c9b8"/></linearGradient></defs><rect width="300" height="400" fill="url(#g)"/><text x="150" y="205" font-family="sans-serif" font-size="22" letter-spacing="6" text-anchor="middle" fill="#c85a32">WAZOBIA</text></svg>');
window.addEventListener("error", (e) => {
  if (e.target && e.target.tagName === "IMG" && e.target.src !== FALLBACK_IMG) e.target.src = FALLBACK_IMG;
}, true);

/* ---------- Toasts ---------- */
function toast(msg, type = "", duration = 3000) {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.setAttribute("role", "status");
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, duration);
}

/* ---------- Cart ---------- */
const Cart = {
  items: [],
  listeners: [],
  load() {
    try { this.items = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { this.items = []; }
  },
  save() { localStorage.setItem(CART_KEY, JSON.stringify(this.items)); this.listeners.forEach((fn) => fn()); },
  onChange(fn) { this.listeners.push(fn); },
  add(p, size) {
    const found = this.items.find((i) => i.id === p.id && i.size === size);
    if (found) found.quantity += 1;
    else this.items.push({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, size, quantity: 1 });
    this.save();
  },
  setQty(id, size, q) {
    const it = this.items.find((i) => i.id === id && i.size === size);
    if (!it) return;
    it.quantity = q;
    if (it.quantity <= 0) this.items = this.items.filter((i) => i !== it);
    this.save();
  },
  remove(id, size) { this.items = this.items.filter((i) => !(i.id === id && i.size === size)); this.save(); },
  clear() { this.items = []; this.save(); },
  count() { return this.items.reduce((n, i) => n + i.quantity, 0); },
  subtotal() { return this.items.reduce((s, i) => s + i.price * i.quantity, 0); },
  shipping() { const s = this.subtotal(); return s === 0 || s >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT; },
  total() { return this.subtotal() + this.shipping(); },
};
Cart.load();

/* ---------- Auth ---------- */
const GOOGLE_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

let currentUser = null;

async function signInWithGoogle() {
  if (!sb) await initSupabase();
  if (!sb) return toast("Auth service unavailable offline.", "error");
  const redirectTarget = window.location.origin + window.location.pathname;
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTarget }
  });
  if (error) toast(error.message, "error");
}

async function signOut() {
  if (!sb) await initSupabase();
  if (sb) await sb.auth.signOut();
  currentUser = null;
  sessionStorage.removeItem("auth_toast_shown");
  renderAuth();
}

function checkWelcomeEmail(user) {
  if (!user || !user.email) return;
  const welcomeKey = "wazobia_welcome_sent_" + user.email;
  if (!localStorage.getItem(welcomeKey)) {
    const firstName = (user.user_metadata?.full_name || "Friend").trim().split(" ")[0];
    fetch("/api/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        firstName: firstName,
        siteUrl: window.location.origin
      })
    })
      .then((res) => {
        if (res.ok) {
          localStorage.setItem(welcomeKey, "true");
        }
      })
      .catch((err) => console.error("Welcome email error:", err));
  }
}

function renderAuth() {
  const el = document.getElementById("auth-area");
  let greetingEl = document.getElementById("user-greeting-el");

  if (currentUser) {
    const m = currentUser.user_metadata || {};
    const fullName = m.full_name || m.name || currentUser.email || "";
    const firstName = fullName.trim().split(" ")[0] || "Friend";
    const avatarSrc = m.avatar_url || m.picture || FALLBACK_IMG;

    if (!greetingEl) {
      greetingEl = document.createElement("a");
      greetingEl.id = "user-greeting-el";
      greetingEl.className = "user-greeting tracked user-profile-link";
      greetingEl.href = "profile.html";
      const cartBtn = document.getElementById("cart-btn");
      if (cartBtn && cartBtn.parentNode) {
        cartBtn.parentNode.insertBefore(greetingEl, cartBtn);
      }
    }
    greetingEl.textContent = `Hi, ${firstName}`;
    greetingEl.style.display = "inline-block";

    if (el) {
      el.innerHTML = `
        <a href="profile.html" class="user-profile-link" title="View Profile & Orders">
          <img class="avatar" id="user-avatar" src="${esc(avatarSrc)}" alt="${esc(fullName)}" referrerpolicy="no-referrer">
        </a>`;
    }
  } else {
    if (greetingEl) {
      greetingEl.style.display = "none";
    }
    if (el) {
      el.innerHTML = `<button class="google-btn tracked" id="sign-in-btn">${GOOGLE_SVG}Sign in</button>`;
      const btn = document.getElementById("sign-in-btn");
      if (btn) btn.onclick = signInWithGoogle;
    }
  }
  document.dispatchEvent(new CustomEvent("authchange", { detail: currentUser }));
}

async function initAuth() {
  if (!sb) await initSupabase();
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      currentUser = data.session ? data.session.user : null;

      const handleUserSession = (user) => {
        if (!user) return;

        if (window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }

        checkWelcomeEmail(user);

        if (!sessionStorage.getItem("auth_toast_shown")) {
          const m = user.user_metadata || {};
          const fullName = m.full_name || m.name || user.email || "";
          const firstName = fullName.trim().split(" ")[0] || "Friend";
          toast(`✓ Successfully signed in as ${firstName}! Welcome to Wazobia.`, "success", 4000);
          sessionStorage.setItem("auth_toast_shown", "true");
        }
      };

      if (currentUser) {
        handleUserSession(currentUser);
      }

      sb.auth.onAuthStateChange((event, session) => {
        currentUser = session ? session.user : null;
        if (currentUser) {
          handleUserSession(currentUser);
        }
        renderAuth();
      });
    } catch (e) { console.warn("Auth init failed", e); }
  }
  renderAuth();
}

/* ---------- Cart count badge ---------- */
function updateBadge() {
  const b = document.getElementById("cart-count");
  if (!b) return;
  b.textContent = Cart.count();
  b.classList.add("bump");
  setTimeout(() => b.classList.remove("bump"), 300);
}
Cart.onChange(updateBadge);

/* ---------- Footer helpers ---------- */
function handleNewsletter() {
  const el = document.getElementById("newsletter-email");
  if (el && el.value) {
    toast("Thank you for joining the Wazobia list!");
    el.value = "";
  }
}

function showFooterDialog(title, text) {
  let modal = document.getElementById("info-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal-bg";
    modal.id = "info-modal";
    modal.setAttribute("role", "dialog");
    modal.innerHTML = `
      <div class="modal info-modal">
        <h2 id="info-title"></h2>
        <p id="info-text"></p>
        <button class="btn btn-block" style="margin-top:20px" onclick="document.getElementById('info-modal').classList.remove('open')">Close</button>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById("info-title").textContent = title;
  document.getElementById("info-text").textContent = text;
  modal.classList.add("open");
}

