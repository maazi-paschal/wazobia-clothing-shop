const welcome = require("../../api/welcome.js");

// Netlify Functions wrapper for /api/welcome
exports.handler = async (event) => {
  let statusCode = 200, payload = {};
  const headers = { "Content-Type": "application/json" };
  const res = {
    setHeader: (k, v) => { headers[k] = v; },
    status(c) { statusCode = c; return this; },
    json(o) { payload = o; return this; },
  };
  await welcome({ method: event.httpMethod, body: event.body }, res);
  return { statusCode, headers, body: JSON.stringify(payload) };
};
