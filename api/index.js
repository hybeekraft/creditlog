// Vercel Serverless Function entry point for CreditLog REST API
const server = require('../server/index.js');

module.exports = (req, res) => {
  server.emit('request', req, res);
};
