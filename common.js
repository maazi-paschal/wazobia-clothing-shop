/* Wazobia shared client logic: Supabase client, auth, cart, toasts. */
const SUPABASE_URL = "https://adrkhbpriicdejxlbmgq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcmtoYnByaWljZGVqeGxibWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzgxMDAsImV4cCI6MjEwNjcxNDEwMH0.u1mmHqZkjWZosF-K-1riRWQH1RLEfTdjO-zL9FB5k2I";
const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_FLAT = 10;
const CART_KEY = "wazobia_cart_v1";

const sb = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const fmt = (n) => "$" + Number(n).toFixed(2);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f2ec"/><stop offset="1" stop-color="#e3c9b8"/></linearGradient></defs><rect width="300" height="400" fill="url(#g)"/><text x="150" y="205" font-family="sans-serif" font-size="22" letter-spacing="6" text-anchor="middle" fill="#c85a32">WAZOBIA</text></svg>');
window.addEventListener("error", (e) => {
  if (e.target && e.target.tagName === "IMG" && e.target.src !== FALLBACK_IMG) e.target.src = FALLBACK_IMG;
}, true);

/* ---------- Toasts ---------- */
function toast(msg, type = "") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.setAttribute("role", "status");
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 3000);
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
  if (!sb) return toast("Auth service unavailable offline.", "error");
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
  if (error) toast(error.message, "error");
}
async function signOut() { if (sb) await sb.auth.signOut(); currentUser = null; renderAuth(); }

function renderAuth() {
  const el = document.getElementById("auth-area");
  if (el) {
    if (currentUser) {
      const m = currentUser.user_metadata || {};
      const name = m.full_name || m.name || currentUser.email;
      el.innerHTML = `<img class="avatar" id="user-avatar" src="${esc(m.avatar_url || m.picture || FALLBACK_IMG)}" alt="${esc(name)}" referrerpolicy="no-referrer">
        <span class="user-name tracked">${esc(name)}</span>
        <button class="link-btn tracked" id="sign-out-btn">Sign Out</button>`;
      document.getElementById("sign-out-btn").onclick = signOut;
    } else {
      el.innerHTML = `<button class="google-btn tracked" id="sign-in-btn">${GOOGLE_SVG}Sign in</button>`;
      document.getElementById("sign-in-btn").onclick = signInWithGoogle;
    }
  }
  document.dispatchEvent(new CustomEvent("authchange", { detail: currentUser }));
}

async function initAuth() {
  if (sb) {
    try {
      const { data } = await sb.auth.getSession();
      currentUser = data.session ? data.session.user : null;
      sb.auth.onAuthStateChange((_e, session) => { currentUser = session ? session.user : null; renderAuth(); });
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

