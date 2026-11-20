const MAX_BODY_BYTES = 1024 * 1024;

function readRequestBody(req) {
  if (req.body !== undefined) {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    return Promise.resolve(body || undefined);
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body is too large.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(size ? Buffer.concat(chunks) : undefined));
    req.on('error', reject);
  });
}

async function proxyRequest(req, res, requestPath) {
  const backendUrl = process.env.CREDITLOG_BACKEND_URL;
  const backendSecret = process.env.CREDITLOG_BACKEND_SECRET;
  if (!backendUrl || !backendSecret) {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ success: false, message: 'Shared CreditLog backend is not configured.' }));
  }

  try {
    const target = new URL(requestPath, backendUrl);
    if (target.origin !== new URL(backendUrl).origin) {
      throw new Error('Invalid backend request path.');
    }

    const headers = new Headers({
      'X-CreditLog-Backend-Secret': backendSecret,
      'X-Forwarded-Host': req.headers.host || '',
      'X-Forwarded-Proto': req.headers['x-forwarded-proto'] || 'https'
    });
    for (const name of ['accept', 'authorization', 'content-type', 'x-order-access', 'x-bachs-signature', 'x-bachs-signature-v2', 'x-bachs-timestamp', 'verif-hash']) {
      if (req.headers[name]) headers.set(name, req.headers[name]);
    }

    const method = req.method || 'GET';
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await readRequestBody(req);
    const response = await fetch(target, { method, headers, body });
    const responseHeaders = {};
    response.headers.forEach((value, name) => {
      if (!['connection', 'content-length', 'keep-alive', 'transfer-encoding'].includes(name.toLowerCase())) {
        responseHeaders[name] = value;
      }
    });
    responseHeaders['Cache-Control'] = 'no-store';
    res.writeHead(response.status, responseHeaders);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    const status = error.statusCode || 502;
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ success: false, message: status === 502 ? 'Shared CreditLog backend is unavailable.' : error.message }));
  }
}

module.exports = { proxyRequest };
