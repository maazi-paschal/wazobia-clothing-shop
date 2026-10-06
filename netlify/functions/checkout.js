const checkout = require("../../api/checkout.js");

// Netlify Functions wrapper: adapts the Vercel-style handler.
exports.handler = async (event) => {
  let statusCode = 200, payload = {};
  const headers = { "Content-Type": "application/json" };
  const res = {
    setHeader: (k, v) => { headers[k] = v; },
    status(c) { statusCode = c; return this; },
    json(o) { payload = o; return this; },
  };
  try {
    await checkout({ method: event.httpMethod, body: event.body }, res);
  } catch (err) {
    console.error("Netlify checkout handler error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Server error: ${err.message || 'Checkout process failed'}`, details: err })
    };
  }
  return { statusCode, headers, body: JSON.stringify(payload) };
};
