/**
 * POST /api/welcome
 * Serverless function to send automated luxury welcome email via Mailgun REST API.
 * Body: { email, firstName, siteUrl }
 */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function welcomeHtml(firstName, siteUrl) {
  const name = esc(firstName || "Friend");
  const url = esc(siteUrl || "#");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Wazobia</title>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #f7f6f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111; line-height: 1.6;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e8e6df; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
    
    <div style="padding: 32px 32px 20px; border-bottom: 1px solid #f0ede6; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; letter-spacing: 0.15em; font-weight: 800; color: #111111; text-transform: uppercase;">WAZOBIA</h1>
      <p style="margin: 4px 0 0; font-size: 11px; letter-spacing: 0.12em; color: #c85a32; text-transform: uppercase; font-weight: 600;">Contemporary Afro-Minimalism</p>
    </div>

    <div style="padding: 36px 32px;">
      <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #111111; letter-spacing: -0.01em;">
        Finally! Pheeew! You made it, ${name}.
      </h2>

      <p style="margin: 0 0 16px; font-size: 15px; color: #333333;">
        You're here now—the exact place your wardrobe has been quietly begging for.
      </p>

      <p style="margin: 0 0 16px; font-size: 15px; color: #333333;">
        Premium African clothing, tailored to naturally command attention wherever you walk <em>(unless you throw a plain black jacket over it... ugh, please don't).</em>
      </p>

      <p style="margin: 0 0 24px; font-size: 15px; color: #333333;">
        Whether you want a statement piece that turns heads or an understated, effortless design that quietly speaks to your royalty, you're in the right place.
      </p>

      <div style="background-color: #faf9f5; border: 1px dashed #c85a32; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 28px;">
        <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #c85a32;">
          Your Welcome Gift
        </p>
        <p style="margin: 0 0 12px; font-size: 14px; color: #444444;">
          Enjoy a whooping <strong>10% off</strong> your first order with this code:
        </p>
        <div style="display: inline-block; background: #ffffff; padding: 8px 24px; border: 1px solid #e8e6df; border-radius: 6px; font-size: 20px; font-weight: 800; letter-spacing: 0.2em; color: #111111;">
          WAZOBIA10
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${url}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 14px; letter-spacing: 0.05em;">
          Claim Your 10% &amp; Shop The Collection →
        </a>
      </div>

      <p style="margin: 0 0 4px; font-size: 14px; color: #666666;">Good luck turning down compliments.</p>
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111111;">
        Yours in style,<br>
        <span style="color: #c85a32;">The Wazobia Team</span>
      </p>
    </div>

    <div style="background-color: #faf9f5; padding: 20px 32px; border-top: 1px solid #f0ede6; text-align: center; font-size: 12px; color: #888888;">
      <p style="margin: 0;">© 2026 WAZOBIA Clothing Brand. All rights reserved.</p>
      <p style="margin: 4px 0 0;">Pay on delivery available on all nationwide orders.</p>
    </div>

  </div>
</body>
</html>`;
}

async function sendWelcomeEmail(email, firstName, siteUrl) {
  const domain = process.env.MAILGUN_DOMAIN;
  const key = process.env.MAILGUN_API_KEY;
  if (!domain || !key) {
    throw new Error("Mailgun is not configured (MAILGUN_DOMAIN / MAILGUN_API_KEY missing).");
  }
  const base = process.env.MAILGUN_API_BASE || "https://api.mailgun.net";
  const cleanName = String(firstName || "Friend").trim().split(" ")[0];

  const form = new URLSearchParams({
    from: `Wazobia Fashion <welcome@${domain}>`,
    to: email,
    subject: `Claim your welcome gift, ${cleanName} 🎁 | Wazobia`,
    html: welcomeHtml(cleanName, siteUrl),
  });

  const res = await fetch(`${base}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`api:${key}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mailgun dispatch failed (${res.status}): ${text}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  const email = body?.email;
  const firstName = body?.firstName || "Friend";
  const siteUrl = body?.siteUrl || "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  try {
    await sendWelcomeEmail(String(email).trim(), firstName, siteUrl);
    return res.status(200).json({ success: true, message: "Welcome email sent" });
  } catch (err) {
    console.error("[welcome] email dispatch error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to send welcome email" });
  }
};
