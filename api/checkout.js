/**
 * POST /api/checkout
 * Vercel-style serverless handler (also used by server.js and the Netlify wrapper).
 * Body: { user_email, customer_name, phone_number, shipping_address, items, total_amount, payment_method, status }
 * Secrets (MAILGUN_*, SUPABASE_SERVICE_ROLE_KEY) are read from env and never reach the client.
 */
const crypto = require("crypto");

const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_FLAT = 10;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + Number(n).toFixed(2);

function makeOrderId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  return "WZ-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001F\u007F<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

function validate(body) {
  const b = body || {};
  if (!b.user_email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(b.user_email).trim()) || String(b.user_email).length > 254) return "A valid user_email is required.";
  if (clean(b.customer_name, 100).length < 2) return "customer_name is required.";
  const phone = clean(b.phone_number || (b.shipping_address && b.shipping_address.phone_number), 30);
  if (!phone || phone.length < 7) return "A valid phone_number is required.";
  const a = b.shipping_address;
  if (!a || typeof a !== "object" || clean(a.street, 150).length < 5) return "A shipping_address with a street is required.";
  if (!clean(a.city, 80) || !clean(a.state, 80) || !clean(a.postal_code, 12) || !clean(a.country, 60)) return "shipping_address is incomplete.";
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) return "items must be a non-empty array.";
  for (const i of b.items) {
    if (!i || !i.id || !(Number.isInteger(Number(i.quantity)) && Number(i.quantity) > 0 && Number(i.quantity) <= 20)) return "Invalid item in cart.";
  }
  return null;
}

// Authoritative prices/names come from the products table, never from the client.
async function priceItems(items) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY).");
  const ids = [...new Set(items.map((i) => String(i.id)))];
  const list = ids.map((id) => '"' + id.replace(/["\\]/g, "") + '"').join(",");
  const r = await fetch(`${url}/rest/v1/products?select=id,name,price&id=in.(${encodeURIComponent(list)})`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Supabase product lookup failed (${r.status}): ${await r.text()}`);
  const rows = new Map((await r.json()).map((p) => [String(p.id), p]));
  return items.map((i) => {
    const p = rows.get(String(i.id));
    if (!p) { const e = new Error(`Unknown product: ${clean(i.id, 40)}`); e.status = 400; throw e; }
    return { id: p.id, name: p.name, size: clean(i.size, 20), quantity: Number(i.quantity), price: Number(p.price) };
  });
}

function receiptHtml(orderId, o) {
  const rows = o.items.map((i) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e8e6df;">${esc(i.name)}<br><span style="color:#6e6d67;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Size ${esc(i.size)} &middot; Qty ${esc(i.quantity)} &middot; ${money(i.price)} each</span></td>
      <td style="padding:12px 0;border-bottom:1px solid #e8e6df;text-align:right;">${money(i.price * i.quantity)}</td>
    </tr>`).join("");
  const a = o.shipping_address;
  const phone = o.phone_number || a.phone_number || "";
  return `<!DOCTYPE html><html><body style="margin:0;background:#fcfbf9;font-family:Inter,Helvetica,Arial,sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px;">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e8e6df;">
    <tr><td style="padding:32px;text-align:center;border-bottom:1px solid #e8e6df;"><div style="font-family:Syne,Helvetica,Arial,sans-serif;font-weight:800;font-size:24px;letter-spacing:.22em;">WAZOBIA</div></td></tr>
    <tr><td style="padding:32px;">
      <p style="margin:0 0 4px;color:#c85a32;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Order Confirmed &middot; Pay on Delivery</p>
      <h1 style="margin:0 0 8px;font-size:22px;">Thank you, ${esc(o.customer_name)}.</h1>
      <p style="margin:0 0 16px;color:#6e6d67;">Your order <strong style="color:#111;">#${esc(orderId)}</strong> has been received.</p>
      
      <div style="background:#111;color:#fff;padding:16px;text-align:center;font-weight:bold;margin:20px 0;font-size:18px;letter-spacing:0.05em;">
        TOTAL DUE ON DELIVERY: ${money(o.total_amount)}
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}
        <tr><td style="padding-top:16px;color:#6e6d67;">Subtotal</td><td style="padding-top:16px;text-align:right;">${money(o.subtotal)}</td></tr>
        <tr><td style="padding-top:8px;color:#6e6d67;">Shipping</td><td style="padding-top:8px;text-align:right;">${o.shipping ? money(o.shipping) : "Free"}</td></tr>
        <tr><td style="padding-top:12px;font-weight:600;border-top:1px solid #e8e6df;">Total (Pay on Delivery)</td><td style="padding-top:12px;text-align:right;font-weight:600;border-top:1px solid #e8e6df;">${money(o.total_amount)}</td></tr>
      </table>

      <h2 style="margin:28px 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6e6d67;">Delivery Details</h2>
      <p style="margin:0;line-height:1.6;font-size:14px;">
        <strong>Customer:</strong> ${esc(o.customer_name)}<br>
        <strong>Phone:</strong> ${esc(phone)}<br>
        <strong>Email:</strong> ${esc(o.user_email)}<br>
        <strong>Address:</strong> ${esc(a.street)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.postal_code)}, ${esc(a.country)}
      </p>

      <div style="background:#f4f2ec;border-left:3px solid #c85a32;padding:14px;margin-top:24px;font-size:13px;line-height:1.5;">
        <strong>Note:</strong> Your order has been received. Please ensure the exact payment amount is ready when the courier arrives.
      </div>
    </td></tr>
    <tr><td style="padding:20px;text-align:center;background:#f4f2ec;color:#6e6d67;font-size:12px;">&copy; 2026 Wazobia &middot; Contemporary Afro-Minimalism</td></tr>
  </table></td></tr></table></body></html>`;
}

async function insertOrder(order) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY).");
  const r = await fetch(`${url}/rest/v1/orders`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(order),
  });
  if (!r.ok) throw new Error(`Supabase insert failed (${r.status}): ${await r.text()}`);
}

async function sendReceipt(orderId, o) {
  const domain = process.env.MAILGUN_DOMAIN, key = process.env.MAILGUN_API_KEY;
  if (!domain || !key) throw new Error("Mailgun is not configured.");
  const form = new URLSearchParams({
    from: `Wazobia <postmaster@${domain}>`,
    to: o.user_email,
    subject: `Order Confirmed: #${orderId} - Pay on Delivery (Wazobia)`,
    html: receiptHtml(orderId, o),
  });
  const base = process.env.MAILGUN_API_BASE || "https://api.mailgun.net";
  const r = await fetch(`${base}/v3/${domain}/messages`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`api:${key}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!r.ok) throw new Error(`Mailgun failed (${r.status}): ${await r.text()}`);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  const err = validate(body);
  if (err) return res.status(400).json({ error: err });

  // Reprice from the database and recompute totals server-side; never trust client-supplied prices/total.
  let items;
  try { items = await priceItems(body.items); }
  catch (e) {
    console.error("[checkout] pricing error:", e.message);
    return res.status(e.status || 500).json({ error: e.status ? e.message : "We could not verify your cart. Please try again." });
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total_amount = Number((subtotal + shipping).toFixed(2));

  const a = body.shipping_address;
  const phone = clean(body.phone_number || a.phone_number, 30);
  const orderId = makeOrderId();
  const order = {
    user_email: String(body.user_email).trim(),
    customer_name: clean(body.customer_name, 100),
    phone_number: phone,
    shipping_address: {
      street: clean(a.street, 150),
      city: clean(a.city, 80),
      state: clean(a.state, 80),
      postal_code: clean(a.postal_code, 12),
      country: clean(a.country, 60),
      phone_number: phone,
    },
    items,
    total_amount,
    payment_method: clean(body.payment_method, 50) || "Pay on Delivery",
    status: clean(body.status, 60) || "Order Placed - Pending Delivery",
  };

  try {
    await insertOrder({ id: orderId, ...order });
  } catch (e) {
    console.error("[checkout] order insert error:", e.message);
    return res.status(500).json({ error: "We could not save your order. Please try again." });
  }

  let emailSent = true;
  try { await sendReceipt(orderId, { ...order, subtotal, shipping }); }
  catch (e) { emailSent = false; console.error("[checkout] receipt error:", e.message); }

  return res.status(200).json({ success: true, order_id: orderId, total_amount, email_sent: emailSent });
};
