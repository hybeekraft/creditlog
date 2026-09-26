// Vercel Serverless Function entry point for CreditLog REST API
const server = require('../server/index.js');

module.exports = (req, res) => {
  try {
    const parsed = new URL(req.url, 'http://localhost');
    const pathParam = parsed.searchParams.get('path');
    if (pathParam) {
      req.url = pathParam;
    } else {
      const original = req.headers['x-matched-path'] || req.headers['x-forwarded-url'] || req.headers['x-original-url'];
      if (original) req.url = original;
    }
  } catch (e) {}
  server.emit('request', req, res);
};
