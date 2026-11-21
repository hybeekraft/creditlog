const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { brotliCompressSync } = require('node:zlib');
const { proxyRequest } = require('../server/services/sharedBackendProxy');

function makeResponse() {
  return {
    statusCode: null,
    headers: {},
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = body.toString();
    }
  };
}

test('proxy forwards the request and injects the backend secret server-side', async () => {
  const previous = {
    url: process.env.CREDITLOG_BACKEND_URL,
    secret: process.env.CREDITLOG_BACKEND_SECRET
  };
  let requestSeen;
  const backend = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      requestSeen = {
        url: req.url,
        method: req.method,
        secret: req.headers['x-creditlog-backend-secret'],
        authorization: req.headers.authorization,
        body: Buffer.concat(chunks).toString()
      };
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end('{"success":true}');
    });
  });

  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  process.env.CREDITLOG_BACKEND_URL = `http://127.0.0.1:${backend.address().port}`;
  process.env.CREDITLOG_BACKEND_SECRET = 'test-backend-secret';
  const response = makeResponse();

  try {
    await proxyRequest({
      method: 'POST',
      headers: { host: 'creditlog.test', authorization: 'Bearer admin-session', 'content-type': 'application/json' },
      body: { productId: 12 }
    }, response, '/api/orders?source=website');

    assert.equal(response.statusCode, 201);
    assert.deepEqual(JSON.parse(response.body), { success: true });
    assert.equal(requestSeen.url, '/api/orders?source=website');
    assert.equal(requestSeen.method, 'POST');
    assert.equal(requestSeen.secret, 'test-backend-secret');
    assert.equal(requestSeen.authorization, 'Bearer admin-session');
    assert.equal(requestSeen.body, '{"productId":12}');
  } finally {
    await new Promise(resolve => backend.close(resolve));
    if (previous.url === undefined) delete process.env.CREDITLOG_BACKEND_URL;
    else process.env.CREDITLOG_BACKEND_URL = previous.url;
    if (previous.secret === undefined) delete process.env.CREDITLOG_BACKEND_SECRET;
    else process.env.CREDITLOG_BACKEND_SECRET = previous.secret;
  }
});

test('proxy fails closed when backend credentials are missing', async () => {
  const previous = process.env.CREDITLOG_BACKEND_SECRET;
  delete process.env.CREDITLOG_BACKEND_SECRET;
  const response = makeResponse();
  try {
    await proxyRequest({ method: 'GET', headers: {} }, response, '/api/products');
    assert.equal(response.statusCode, 503);
    assert.equal(JSON.parse(response.body).success, false);
  } finally {
    if (previous === undefined) delete process.env.CREDITLOG_BACKEND_SECRET;
    else process.env.CREDITLOG_BACKEND_SECRET = previous;
  }
});

test('proxy removes content encoding after fetch decompresses the backend response', async () => {
  const previous = {
    url: process.env.CREDITLOG_BACKEND_URL,
    secret: process.env.CREDITLOG_BACKEND_SECRET
  };
  const backend = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Encoding': 'br' });
    res.end(brotliCompressSync('{"success":true}'));
  });

  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  process.env.CREDITLOG_BACKEND_URL = `http://127.0.0.1:${backend.address().port}`;
  process.env.CREDITLOG_BACKEND_SECRET = 'test-backend-secret';
  const response = makeResponse();

  try {
    await proxyRequest({ method: 'GET', headers: {} }, response, '/api/products');
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-encoding'], undefined);
    assert.deepEqual(JSON.parse(response.body), { success: true });
  } finally {
    await new Promise(resolve => backend.close(resolve));
    if (previous.url === undefined) delete process.env.CREDITLOG_BACKEND_URL;
    else process.env.CREDITLOG_BACKEND_URL = previous.url;
    if (previous.secret === undefined) delete process.env.CREDITLOG_BACKEND_SECRET;
    else process.env.CREDITLOG_BACKEND_SECRET = previous.secret;
  }
});
