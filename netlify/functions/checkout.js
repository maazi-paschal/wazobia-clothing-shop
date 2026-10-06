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
  await checkout({ method: event.httpMethod, body: event.body }, res);
  return { statusCode, headers, body: JSON.stringify(payload) };
};
