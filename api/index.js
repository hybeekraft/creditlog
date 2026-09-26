// Vercel Serverless Function entry point for CreditLog REST API
const server = require('../server.js');

module.exports = (req, res) => {
  server.emit('request', req, res);
};
