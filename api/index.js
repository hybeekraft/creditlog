// Vercel Serverless Function entry point for CreditLog REST API
const server = require('../server/index.js');

module.exports = (req, res) => {
  const originalUrl = req.headers['x-matched-path'] || req.headers['x-forwarded-url'] || req.headers['x-original-url'];
  if (originalUrl) {
    req.url = originalUrl;
  }
  server.emit('request', req, res);
};
