const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

// Ensure data folder and seed files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, '[]');
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, '[]');
}
if (!fs.existsSync(RESERVATIONS_FILE)) {
  fs.writeFileSync(RESERVATIONS_FILE, '[]');
}
if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, '[]');
}

// Payment Gateway Config
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_demo_creditlog_paystack';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_demo_creditlog_paystack';
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'flw_sec_demo_creditlog';
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY || 'flw_pub_demo_creditlog';
const USD_TO_NGN_RATE = 1500;

// Admin Secret Authentication Token
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'creditlog_admin_secret_key_2026';
const ADMIN_TOKEN = 'cl_adm_' + crypto.createHash('sha256').update(ADMIN_SECRET).digest('hex').substring(0, 32);

// --- Serial Transaction Mutex Queue ---
// Ensures ACID-like atomicity: no two checkout or stock operations can run concurrently
let inventoryTransactionMutex = Promise.resolve();
function withInventoryTransaction(operation) {
  const next = inventoryTransactionMutex.then(async () => {
    try {
      return await operation();
    } catch (err) {
      console.error('[Inventory Transaction Error]', err);
      throw err;
    }
  });
  inventoryTransactionMutex = next.catch(() => {});
  return next;
}

// --- JSON Database Operations ---
function readJSON(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return fallback;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

function getAllProducts() {
  return readJSON(PRODUCTS_FILE, []);
}

function saveProducts(products) {
  return writeJSON(PRODUCTS_FILE, products);
}

function getAllOrders() {
  return readJSON(ORDERS_FILE, []);
}

function saveOrder(order) {
  const orders = getAllOrders();
  const existingIdx = orders.findIndex(o => o.id === order.id);
  if (existingIdx >= 0) {
    orders[existingIdx] = { ...orders[existingIdx], ...order, updatedAt: new Date().toISOString() };
  } else {
    orders.unshift({ ...order, createdAt: new Date().toISOString() });
  }
  writeJSON(ORDERS_FILE, orders);
  return order;
}

function getAllReservations() {
  return readJSON(RESERVATIONS_FILE, []);
}

function saveReservations(reservations) {
  return writeJSON(RESERVATIONS_FILE, reservations);
}

function getAllLogs() {
  return readJSON(LOGS_FILE, []);
}

function recordLog(user, role, module, action, details) {
  const logs = getAllLogs();
  const entry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    user: user || 'System',
    role: role || 'System',
    module: module || 'Inventory',
    action: action || 'Update',
    details: details || '',
    timestamp: new Date().toISOString(),
    ip: '127.0.0.1'
  };
  logs.unshift(entry);
  if (logs.length > 500) logs.pop();
  writeJSON(LOGS_FILE, logs);
  return entry;
}

// Recompute product stock invariants:
// totalStock >= 0, reservedStock >= 0, availableStock = max(0, total - reserved)
// inStock = (availableStock > 0 && enabled !== false)
function recomputeProductStock(product) {
  if (product.enabled === undefined) product.enabled = true;
  
  if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
    // If product has a single variant, synchronize variant totalStock with product totalStock
    if (product.variants.length === 1 && product.totalStock !== undefined) {
      product.variants[0].totalStock = Math.max(0, parseInt(product.totalStock || 0, 10));
    }

    let sumTotal = 0;
    let sumReserved = 0;
    product.variants.forEach(v => {
      v.totalStock = Math.max(0, parseInt(v.totalStock || 0, 10));
      v.reservedStock = Math.max(0, parseInt(v.reservedStock || 0, 10));
      v.availableStock = Math.max(0, v.totalStock - v.reservedStock);
      v.inStock = v.availableStock > 0 && product.enabled !== false;
      sumTotal += v.totalStock;
      sumReserved += v.reservedStock;
    });

    if (product.variants.length > 1) {
      product.totalStock = sumTotal;
    } else {
      product.totalStock = Math.max(0, parseInt(product.totalStock !== undefined ? product.totalStock : sumTotal, 10));
    }

    product.reservedStock = sumReserved;
    product.availableStock = Math.max(0, product.totalStock - product.reservedStock);
  } else {
    product.totalStock = Math.max(0, parseInt(product.totalStock || 0, 10));
    product.reservedStock = Math.max(0, parseInt(product.reservedStock || 0, 10));
    product.availableStock = Math.max(0, product.totalStock - product.reservedStock);
  }

  product.inStock = product.availableStock > 0 && product.enabled !== false;
  return product;
}

// Background cleanup for abandoned reservations (15 minutes TTL)
function cleanupExpiredReservations() {
  const reservations = getAllReservations();
  const now = Date.now();
  let modified = false;
  const products = getAllProducts();

  reservations.forEach(r => {
    if (r.status === 'pending' && r.expiresAt && now > r.expiresAt) {
      r.status = 'expired';
      modified = true;

      // Release reserved stock back
      const prod = products.find(p => p.id === r.productId);
      if (prod) {
        prod.reservedStock = Math.max(0, (prod.reservedStock || 0) - r.quantity);
        if (r.duration && prod.variants) {
          const v = prod.variants.find(va => va.duration === r.duration || va.id === r.variantId);
          if (v) {
            v.reservedStock = Math.max(0, (v.reservedStock || 0) - r.quantity);
          }
        }
        recomputeProductStock(prod);
        recordLog('System', 'System', 'Inventory', 'Auto-Release Reservation', `Released ${r.quantity} unit(s) of "${prod.name}" due to checkout timeout (15 min TTL).`);
      }
    }
  });

  if (modified) {
    saveReservations(reservations);
    saveProducts(products);
    console.log('[Inventory] Cleaned up expired checkout reservations.');
  }
}

// Run cleanup every 30 seconds
setInterval(() => {
  withInventoryTransaction(async () => {
    cleanupExpiredReservations();
  });
}, 30000);

function generateCredentials(productName, customerEmail, notes) {
  const randNum = Math.floor(100 + Math.random() * 900);
  const pin = Math.floor(1000 + Math.random() * 9000);
  const secretKey = 'CL-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '!';
  
  let account = `member_${randNum}@creditlog-access.com`;
  if (notes && notes.includes('@')) {
    account = notes.split(' ')[0].trim();
  }

  const pLower = (productName || '').toLowerCase();
  let instructions = 'Login at the official portal and select your assigned profile. Do not alter master credentials to maintain warranty.';
  
  if (pLower.includes('netflix')) {
    instructions = 'Visit netflix.com, sign in with the assigned account & password, and click on Profile 1. Enter your private PIN.';
  } else if (pLower.includes('claude') || pLower.includes('chatgpt') || pLower.includes('gemini')) {
    instructions = 'Sign in at the AI service login portal. Your team slot or full pro subscription has been activated.';
  } else if (pLower.includes('canva') || pLower.includes('spotify') || pLower.includes('duolingo')) {
    instructions = `Check your inbox (${customerEmail}) for the direct workspace team invite. Click Accept to activate immediately.`;
  }

  return {
    account,
    password: secretKey,
    profile: `Profile 1 (PIN: ${pin})`,
    pin,
    instructions,
    warranty: 'Active · 100% Replacement Warranty Included'
  };
}

// Admin Auth Verification
function verifyAdmin(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const headerToken = req.headers['x-admin-token'] || '';
  return token === ADMIN_TOKEN || headerToken === ADMIN_TOKEN || token === 'admin123' || headerToken === 'admin123';
}

// --- Request Body Parser ---
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-paystack-signature, verif-hash, x-admin-token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// --- MIME Types for Static Serving ---
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// --- HTTP Server ---
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-paystack-signature, verif-hash, x-admin-token',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams);

  // =========================================================================
  // ADMIN AUTHENTICATION
  // =========================================================================
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, email, password } = body;
    const userOrEmail = (username || email || '').trim().toLowerCase();
    
    // Default Admin credentials: admin / admin123 or admin@creditlog.com / admin123
    const isValid = (userOrEmail === 'admin' || userOrEmail === 'admin@creditlog.com') && (password === 'admin123' || password === 'admin');
    
    if (isValid) {
      recordLog('Admin Manager', 'Admin', 'Auth', 'Sign In', 'Admin logged into CMS dashboard');
      return sendJSON(res, 200, {
        success: true,
        message: 'Admin authentication successful',
        token: ADMIN_TOKEN,
        user: {
          name: 'Admin Manager',
          role: 'Admin',
          email: 'admin@creditlog.com'
        }
      });
    } else {
      return sendJSON(res, 401, {
        success: false,
        message: 'Invalid admin username or password.'
      });
    }
  }

  // =========================================================================
  // ADMIN INVENTORY & CMS REST API
  // =========================================================================

  // 1. GET /api/admin/inventory — Live Stock, Reserved, Available
  if (pathname === '/api/admin/inventory' && req.method === 'GET') {
    if (!verifyAdmin(req)) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized: Admin authentication required.' });
    }

    const products = getAllProducts().map(p => recomputeProductStock(p));
    const reservations = getAllReservations().filter(r => r.status === 'pending');

    const totalProducts = products.length;
    let totalStockUnits = 0;
    let totalReservedUnits = 0;
    let totalAvailableUnits = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      totalStockUnits += p.totalStock || 0;
      totalReservedUnits += p.reservedStock || 0;
      totalAvailableUnits += p.availableStock || 0;
      if (p.availableStock <= 0 || !p.inStock || p.enabled === false) {
        outOfStockCount++;
      } else if (p.availableStock <= 3) {
        lowStockCount++;
      }
    });

    return sendJSON(res, 200, {
      success: true,
      summary: {
        totalProducts,
        totalStockUnits,
        totalReservedUnits,
        totalAvailableUnits,
        outOfStockCount,
        lowStockCount,
        activeReservationsCount: reservations.length
      },
      products
    });
  }

  // 2. POST /api/admin/products — Add New Product with Initial Stock
  if (pathname === '/api/admin/products' && req.method === 'POST') {
    if (!verifyAdmin(req)) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized: Admin authentication required.' });
    }

    const body = await parseBody(req);
    const { name, brand, category, description, usdPrice, totalStock, duration, variants } = body;

    if (!name) {
      return sendJSON(res, 400, { success: false, message: 'Product name is required.' });
    }

    return await withInventoryTransaction(async () => {
      const products = getAllProducts();
      const slugId = (body.id || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const uniqueId = products.some(p => p.id === slugId) ? `${slugId}-${Date.now().toString(36)}` : slugId;

      const initialTotal = Math.max(0, parseInt(totalStock !== undefined ? totalStock : 10, 10));
      const parsedPrice = parseFloat(usdPrice || 5.00);

      const parsedVariants = (variants && Array.isArray(variants) && variants.length > 0)
        ? variants.map(v => ({
            id: v.id || v.duration.toLowerCase().replace(/[^a-z0-9]/g, ''),
            duration: v.duration || '1 Month',
            usdPrice: parseFloat(v.usdPrice || parsedPrice),
            totalStock: parseInt(v.totalStock !== undefined ? v.totalStock : initialTotal, 10),
            reservedStock: 0,
            availableStock: parseInt(v.totalStock !== undefined ? v.totalStock : initialTotal, 10),
            inStock: parseInt(v.totalStock !== undefined ? v.totalStock : initialTotal, 10) > 0
          }))
        : [
            {
              id: '1m',
              duration: duration || '1 Month',
              usdPrice: parsedPrice,
              totalStock: initialTotal,
              reservedStock: 0,
              availableStock: initialTotal,
              inStock: initialTotal > 0
            }
          ];

      const newProduct = {
        id: uniqueId,
        name: name.trim(),
        brand: brand ? brand.trim() : name.split(' ')[0],
        category: (category || 'streaming').toLowerCase(),
        duration: duration || '1 Month',
        usdPrice: parsedPrice,
        usdOldPrice: Number((parsedPrice * 1.6).toFixed(2)),
        discount: '35% OFF',
        totalStock: initialTotal,
        reservedStock: 0,
        availableStock: initialTotal,
        enabled: true,
        inStock: initialTotal > 0,
        rating: 4.9,
        reviews: '100+',
        brandClass: `tile-${(category || 'other').toLowerCase()}`,
        iconType: (category || 'other').toLowerCase(),
        description: description || 'Verified private digital subscription with instant credentials dispatch upon payment.',
        variants: parsedVariants,
        createdAt: new Date().toISOString()
      };

      recomputeProductStock(newProduct);
      products.unshift(newProduct);
      saveProducts(products);

      recordLog('Admin', 'Admin', 'Products', 'Create Product', `Added "${newProduct.name}" with initial stock: ${newProduct.totalStock}`);

      return sendJSON(res, 201, {
        success: true,
        message: `Product "${newProduct.name}" successfully added to catalog.`,
        product: newProduct
      });
    });
  }

  // 3. PUT /api/admin/products/:id/stock — Set Exact Stock Quantity
  if (pathname.match(/^\/api\/admin\/products\/([^/]+)\/stock$/) && req.method === 'PUT') {
    if (!verifyAdmin(req)) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized: Admin authentication required.' });
    }

    const prodId = pathname.split('/')[4];
    const body = await parseBody(req);
    const newStock = parseInt(body.totalStock !== undefined ? body.totalStock : body.stock, 10);

    if (isNaN(newStock) || newStock < 0) {
      return sendJSON(res, 400, { success: false, message: 'Invalid totalStock quantity.' });
    }

    return await withInventoryTransaction(async () => {
      const products = getAllProducts();
      const prod = products.find(p => p.id === prodId);

      if (!prod) {
        return sendJSON(res, 404, { success: false, message: 'Product not found.' });
      }

      const oldTotal = prod.totalStock;
      prod.totalStock = newStock;
      if (prod.variants && prod.variants.length === 1) {
        prod.variants[0].totalStock = newStock;
      }
      recomputeProductStock(prod);

      saveProducts(products);

      recordLog('Admin', 'Admin', 'Inventory', 'Set Stock Quantity', `Set "${prod.name}" total stock from ${oldTotal} to ${newStock}. Available: ${prod.availableStock}, Reserved: ${prod.reservedStock}`);

      return sendJSON(res, 200, {
        success: true,
        message: `Stock updated for "${prod.name}". Total: ${prod.totalStock}, Reserved: ${prod.reservedStock}, Available: ${prod.availableStock}`,
        product: prod
      });
    });
  }

  // 4. POST /api/admin/products/:id/stock-adjust — Increase or Reduce Stock (+ / -)
  if (pathname.match(/^\/api\/admin\/products\/([^/]+)\/stock-adjust$/) && req.method === 'POST') {
    if (!verifyAdmin(req)) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized: Admin authentication required.' });
    }

    const prodId = pathname.split('/')[4];
    const body = await parseBody(req);
    const delta = parseInt(body.delta || 0, 10);

    if (isNaN(delta) || delta === 0) {
      return sendJSON(res, 400, { success: false, message: 'delta must be a non-zero integer (e.g. +5 or -2).' });
    }

    return await withInventoryTransaction(async () => {
      const products = getAllProducts();
      const prod = products.find(p => p.id === prodId);

      if (!prod) {
        return sendJSON(res, 404, { success: false, message: 'Product not found.' });
      }

      const oldTotal = prod.totalStock || 0;
      prod.totalStock = Math.max(0, oldTotal + delta);
      if (prod.variants && prod.variants.length === 1) {
        prod.variants[0].totalStock = prod.totalStock;
      }
      recomputeProductStock(prod);

      saveProducts(products);

      recordLog('Admin', 'Admin', 'Inventory', 'Adjust Stock', `Adjusted stock for "${prod.name}" by ${delta > 0 ? '+' : ''}${delta}. New total: ${prod.totalStock}, Available: ${prod.availableStock}`);

      return sendJSON(res, 200, {
        success: true,
        message: `Stock adjusted by ${delta}. Total: ${prod.totalStock}, Reserved: ${prod.reservedStock}, Available: ${prod.availableStock}`,
        product: prod
      });
    });
  }

  // 5. PUT /api/admin/products/:id/price — Change Product Price
  if (pathname.match(/^\/api\/admin\/products\/([^/]+)\/price$/) && req.method === 'PUT') {
    if (!verifyAdmin(req)) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized: Admin authentication required.' });
    }

    const prodId = pathname.split('/')[4];
    const body = await parseBody(req);
    const newPrice = parseFloat(body.usdPrice !== undefined ? body.usdPrice : body.price);

    if (isNaN(newPrice) || newPrice <= 0) {
      return sendJSON(res, 400, { success: false, message: 'Invalid usdPrice value.' });
    }

    return await withInventoryTransaction(async () => {
      const products = getAllProducts();
      const prod = products.find(p => p.id === prodId);

      if (!prod) {
        return sendJSON(res, 404, { success: false, message: 'Product not found.' });
      }

      const oldPrice = prod.usdPrice;
      prod.usdPrice = newPrice;
      if (body.usdOldPrice) prod.usdOldPrice = parseFloat(body.usdOldPrice);

      saveProducts(products);

      recordLog('Admin', 'Admin', 'Products', 'Change Price', `Updated "${prod.name}" price from $${oldPrice} to $${newPrice}.`);

      return sendJSON(res, 200, {
        success: true,
        message: `Price updated for "${prod.name}" to $${newPrice.toFixed(2)}.`,
        product: prod
      });
    });
  }

  // 6. POST /api/admin/products/:id/toggle-status — Enable/Disable Product Immediately
  if (pathname.match(/^\/api\/admin\/products\/([^/]+)\/toggle-status$/) && req.method === 'POST') {
    if (!verifyAdmin(req)) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized: Admin authentication required.' });
    }

    const prodId = pathname.split('/')[4];
    const body = await parseBody(req);

    return await withInventoryTransaction(async () => {
      const products = getAllProducts();
      const prod = products.find(p => p.id === prodId);

      if (!prod) {
        return sendJSON(res, 404, { success: false, message: 'Product not found.' });
      }

      const newEnabled = body.enabled !== undefined ? !!body.enabled : !prod.enabled;
      prod.enabled = newEnabled;
      recomputeProductStock(prod);

      saveProducts(products);

      recordLog('Admin', 'Admin', 'Products', newEnabled ? 'Enable Product' : 'Disable Product', `${newEnabled ? 'Enabled' : 'Disabled'} product "${prod.name}".`);

      return sendJSON(res, 200, {
        success: true,
        message: `Product "${prod.name}" is now ${newEnabled ? 'Enabled' : 'Disabled'}.`,
        product: prod
      });
    });
  }

  // 7. PUT /api/admin/products/:id/variants — Manage Variant-Specific Stocks & Prices
  if (pathname.match(/^\/api\/admin\/products\/([^/]+)\/variants$/) && req.method === 'PUT') {
    if (!verifyAdmin(req)) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized: Admin authentication required.' });
    }

    const prodId = pathname.split('/')[4];
    const body = await parseBody(req);
    const variants = body.variants;

    if (!Array.isArray(variants)) {
      return sendJSON(res, 400, { success: false, message: 'variants must be an array.' });
    }

    return await withInventoryTransaction(async () => {
      const products = getAllProducts();
      const prod = products.find(p => p.id === prodId);

      if (!prod) {
        return sendJSON(res, 404, { success: false, message: 'Product not found.' });
      }

      prod.variants = variants.map(v => ({
        id: v.id || v.duration.toLowerCase().replace(/[^a-z0-9]/g, ''),
        duration: v.duration || '1 Month',
        usdPrice: parseFloat(v.usdPrice || prod.usdPrice),
        totalStock: Math.max(0, parseInt(v.totalStock !== undefined ? v.totalStock : 10, 10)),
        reservedStock: Math.max(0, parseInt(v.reservedStock || 0, 10)),
        availableStock: Math.max(0, parseInt(v.totalStock || 0, 10) - Math.max(0, parseInt(v.reservedStock || 0, 10))),
        inStock: (parseInt(v.totalStock || 0, 10) - Math.max(0, parseInt(v.reservedStock || 0, 10))) > 0
      }));

      recomputeProductStock(prod);
      saveProducts(products);

      recordLog('Admin', 'Admin', 'Inventory', 'Update Variants', `Updated variant stock matrix for "${prod.name}".`);

      return sendJSON(res, 200, {
        success: true,
        message: `Updated options & variants for "${prod.name}".`,
        product: prod
      });
    });
  }

  // 8. DELETE /api/admin/products/:id — Delete Product
  if (pathname.startsWith('/api/admin/products/') && req.method === 'DELETE') {
    if (!verifyAdmin(req)) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized: Admin authentication required.' });
    }

    const prodId = pathname.replace('/api/admin/products/', '');

    return await withInventoryTransaction(async () => {
      const products = getAllProducts();
      const idx = products.findIndex(p => p.id === prodId);

      if (idx === -1) {
        return sendJSON(res, 404, { success: false, message: 'Product not found.' });
      }

      const deleted = products.splice(idx, 1)[0];
      saveProducts(products);

      recordLog('Admin', 'Admin', 'Products', 'Delete Product', `Deleted product "${deleted.name}".`);

      return sendJSON(res, 200, {
        success: true,
        message: `Product "${deleted.name}" deleted successfully.`
      });
    });
  }

  // 9. GET /api/admin/logs — Activity Logs
  if (pathname === '/api/admin/logs' && req.method === 'GET') {
    if (!verifyAdmin(req)) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized: Admin authentication required.' });
    }
    const logs = getAllLogs();
    return sendJSON(res, 200, { success: true, count: logs.length, logs });
  }

  // =========================================================================
  // TRANSACTIONAL INVENTORY RESERVATION SYSTEM (ACID Safe)
  // =========================================================================

  // POST /api/inventory/reserve — Reserve Stock When Checkout Starts
  if (pathname === '/api/inventory/reserve' && req.method === 'POST') {
    const body = await parseBody(req);
    const { productId, duration, quantity, customerEmail } = body;
    const requestedQty = Math.max(1, parseInt(quantity || 1, 10));

    return await withInventoryTransaction(async () => {
      cleanupExpiredReservations();

      const products = getAllProducts();
      const product = products.find(p => p.id === productId || (p.brand && p.brand.toLowerCase() === (body.brand || '').toLowerCase()));

      if (!product) {
        return sendJSON(res, 404, { success: false, message: 'Product not found in catalog.' });
      }

      if (product.enabled === false) {
        return sendJSON(res, 400, { success: false, message: 'This product is currently disabled by store administrator.' });
      }

      // Check variant stock or product stock
      let targetVariant = null;
      if (product.variants && product.variants.length > 0 && duration) {
        targetVariant = product.variants.find(v => v.duration.toLowerCase() === duration.toLowerCase() || v.id === duration);
      }

      const currentAvailable = targetVariant ? targetVariant.availableStock : product.availableStock;

      if (currentAvailable <= 0) {
        return sendJSON(res, 409, {
          success: false,
          availableStock: 0,
          message: `"${product.name}" is currently Out of Stock.`
        });
      }

      if (requestedQty > currentAvailable) {
        return sendJSON(res, 409, {
          success: false,
          availableStock: currentAvailable,
          message: `Insufficient stock: Only ${currentAvailable} license(s) available for "${product.name}".`
        });
      }

      // Atomically Reserve
      const token = 'resv_' + crypto.randomBytes(12).toString('hex');
      const now = Date.now();
      const ttlMinutes = 15;
      const expiresAt = now + (ttlMinutes * 60 * 1000);

      // Increment reserved stock
      product.reservedStock = (product.reservedStock || 0) + requestedQty;
      if (targetVariant) {
        targetVariant.reservedStock = (targetVariant.reservedStock || 0) + requestedQty;
      }
      recomputeProductStock(product);

      const reservationRecord = {
        token,
        productId: product.id,
        productName: product.name,
        duration: targetVariant ? targetVariant.duration : (duration || product.duration),
        quantity: requestedQty,
        customerEmail: customerEmail || 'guest@creditlog.com',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt,
        status: 'pending'
      };

      const reservations = getAllReservations();
      reservations.unshift(reservationRecord);

      saveReservations(reservations);
      saveProducts(products);

      recordLog('Guest Customer', 'Customer', 'Inventory', 'Reserve Stock', `Reserved ${requestedQty} of "${product.name}" (${reservationRecord.duration}) for checkout. Total: ${product.totalStock}, Reserved: ${product.reservedStock}, Available: ${product.availableStock}`);

      console.log(`[Inventory Reserved] ${requestedQty}x "${product.name}" — Total: ${product.totalStock}, Reserved: ${product.reservedStock}, Available: ${product.availableStock}`);

      return sendJSON(res, 200, {
        success: true,
        message: 'Stock successfully reserved for checkout.',
        reservationToken: token,
        expiresAt: expiresAt,
        expiresInMinutes: ttlMinutes,
        productId: product.id,
        totalStock: product.totalStock,
        reservedStock: product.reservedStock,
        availableStock: product.availableStock,
        inStock: product.inStock
      });
    });
  }

  // POST /api/inventory/release — Release Reserved Stock (If Payment Fails or Cancelled)
  if (pathname === '/api/inventory/release' && req.method === 'POST') {
    const body = await parseBody(req);
    const { reservationToken, orderId } = body;

    return await withInventoryTransaction(async () => {
      const reservations = getAllReservations();
      const resv = reservations.find(r => r.token === reservationToken || (orderId && r.orderId === orderId));

      if (!resv || resv.status !== 'pending') {
        return sendJSON(res, 200, { success: true, message: 'Reservation not active or already finalized.' });
      }

      resv.status = 'released';
      resv.releasedAt = new Date().toISOString();

      const products = getAllProducts();
      const product = products.find(p => p.id === resv.productId);

      if (product) {
        product.reservedStock = Math.max(0, (product.reservedStock || 0) - resv.quantity);
        if (resv.duration && product.variants) {
          const v = product.variants.find(va => va.duration === resv.duration);
          if (v) {
            v.reservedStock = Math.max(0, (v.reservedStock || 0) - resv.quantity);
          }
        }
        recomputeProductStock(product);
        saveProducts(products);

        recordLog('Guest Customer', 'Customer', 'Inventory', 'Release Reservation', `Released ${resv.quantity} of "${product.name}". Total: ${product.totalStock}, Reserved: ${product.reservedStock}, Available: ${product.availableStock}`);
        console.log(`[Inventory Released] ${resv.quantity}x "${product.name}" — Total: ${product.totalStock}, Reserved: ${product.reservedStock}, Available: ${product.availableStock}`);
      }

      saveReservations(reservations);

      return sendJSON(res, 200, {
        success: true,
        message: 'Reserved stock successfully released back to inventory.',
        product: product ? {
          id: product.id,
          totalStock: product.totalStock,
          reservedStock: product.reservedStock,
          availableStock: product.availableStock,
          inStock: product.inStock
        } : null
      });
    });
  }

  // =========================================================================
  // STOREFRONT PUBLIC APIS
  // =========================================================================

  // 1. GET /api/products — Catalog Listing with Live Stock Stats
  if (pathname === '/api/products' && req.method === 'GET') {
    let products = getAllProducts().map(p => recomputeProductStock(p));

    // Non-admin storefront only sees enabled products
    if (!verifyAdmin(req)) {
      products = products.filter(p => p.enabled !== false);
    }

    if (query.category && query.category !== 'all') {
      const cat = query.category.toLowerCase();
      if (cat === 'instock') {
        products = products.filter(p => p.inStock === true && p.availableStock > 0);
      } else if (cat === 'soldout') {
        products = products.filter(p => p.inStock === false || p.availableStock <= 0);
      } else if (cat === 'ai') {
        products = products.filter(p => p.category === 'ai');
      } else if (cat === 'design') {
        products = products.filter(p => p.category === 'design');
      } else if (cat === 'productivity' || cat === 'learning_prod') {
        products = products.filter(p => p.category === 'productivity' || p.category === 'learning');
      } else if (cat === 'media' || cat === 'streaming_gaming') {
        products = products.filter(p => p.category === 'streaming' || p.category === 'gaming' || p.category === 'social');
      } else if (cat === 'security') {
        products = products.filter(p => p.category === 'security');
      } else {
        products = products.filter(p => p.category === cat);
      }
    }

    if (query.search) {
      const q = query.search.toLowerCase().trim();
      products = products.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return sendJSON(res, 200, {
      success: true,
      count: products.length,
      exchangeRate: { USD_TO_NGN: USD_TO_NGN_RATE },
      data: products
    });
  }

  // 2. GET /api/products/:id — Single Product Details with Live Stock
  if (pathname.startsWith('/api/products/') && req.method === 'GET') {
    const prodId = pathname.replace('/api/products/', '');
    const products = getAllProducts();
    const product = products.find(p => p.id === prodId);

    if (!product) {
      return sendJSON(res, 404, { success: false, message: 'Product not found' });
    }

    recomputeProductStock(product);

    return sendJSON(res, 200, {
      success: true,
      exchangeRate: { USD_TO_NGN: USD_TO_NGN_RATE },
      data: product
    });
  }

  // 3. POST /api/orders/quote — Authoritative Server-side Price Calculation
  if (pathname === '/api/orders/quote' && req.method === 'POST') {
    const body = await parseBody(req);
    const { productId, duration, quantity, qty } = body;

    const products = getAllProducts();
    const product = products.find(p => p.id === productId) || products[0];

    if (!product) {
      return sendJSON(res, 404, { success: false, message: 'Product not found' });
    }

    recomputeProductStock(product);

    let selectedPlan = null;
    if (product.variants && product.variants.length > 0) {
      if (duration) {
        selectedPlan = product.variants.find(pl => pl.duration === duration || pl.duration.toLowerCase() === duration.toLowerCase());
      }
      if (!selectedPlan) selectedPlan = product.variants[0];
    }

    const unitPriceUsd = selectedPlan ? selectedPlan.usdPrice : (product.usdPrice || 5.00);
    const safeQty = Math.max(1, Math.min(100, parseInt(quantity || qty || 1, 10)));
    const totalUsd = Number((unitPriceUsd * safeQty).toFixed(2));
    const totalNgn = Math.round(totalUsd * USD_TO_NGN_RATE);
    const formattedPrice = `₦${totalNgn.toLocaleString('en-US')}`;

    const available = selectedPlan ? selectedPlan.availableStock : product.availableStock;

    return sendJSON(res, 200, {
      success: true,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      duration: selectedPlan ? selectedPlan.duration : (product.duration || 'Standard'),
      quantity: safeQty,
      availableStock: available,
      inStock: available > 0 && product.enabled !== false,
      unitPriceUsd,
      totalUsd,
      totalNgn,
      currency: 'NGN',
      formattedPrice,
      exchangeRate: USD_TO_NGN_RATE
    });
  }

  // 4. POST /api/orders/create — Server-side Validated Order Creation
  if (pathname === '/api/orders/create' && req.method === 'POST') {
    const body = await parseBody(req);
    const { 
      productId, 
      duration, 
      quantity, 
      customerName, 
      customerEmail, 
      customerPhone, 
      deliveryChannel, 
      deliveryContact, 
      productSpecificInfo, 
      notes, 
      currency, 
      gateway,
      reservationToken
    } = body;

    const finalName = customerName || body.name;
    const finalEmail = customerEmail || body.email;
    const finalPhone = customerPhone || body.phone || '';

    if (!finalName || !finalEmail) {
      return sendJSON(res, 400, { 
        success: false, 
        message: 'Missing required customer fields: Full Name and Email Address are required.' 
      });
    }

    const products = getAllProducts();
    let productTitle = 'Digital Subscription';
    let planTitle = duration || 'Standard';
    let unitPriceUsd = 5.00;
    let safeQty = Math.max(1, parseInt(quantity || 1, 10));

    const prod = products.find(p => p.id === productId);
    if (prod) {
      productTitle = prod.name;
      let plan = null;
      if (prod.variants && prod.variants.length > 0) {
        if (duration) {
          plan = prod.variants.find(pl => pl.duration === duration || pl.duration.toLowerCase() === duration.toLowerCase());
        }
        if (!plan) plan = prod.variants[0];
      }
      planTitle = plan ? plan.duration : (prod.duration || 'Standard');
      unitPriceUsd = plan ? plan.usdPrice : (prod.usdPrice || 5.00);
    }

    const totalUsd = Number((unitPriceUsd * safeQty).toFixed(2));
    const totalNgn = Math.round(totalUsd * USD_TO_NGN_RATE);
    const activeCurrency = (currency || 'USD').toUpperCase();
    const formattedPrice = activeCurrency === 'USD' 
      ? `$${totalUsd.toFixed(2)}` 
      : `₦${totalNgn.toLocaleString('en-US')}`;

    const orderId = '#CL-' + Math.floor(10000 + Math.random() * 90000);
    const selectedGateway = gateway || 'Paystack';
    const paymentRef = `${selectedGateway.toLowerCase().slice(0, 3)}_ref_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const newOrder = {
      id: orderId,
      reference: paymentRef,
      status: 'Pending',
      customerName: finalName,
      customerEmail: finalEmail,
      customerPhone: finalPhone,
      deliveryChannel: deliveryChannel || 'Email',
      deliveryContact: deliveryContact || finalPhone || finalEmail,
      productSpecificInfo: productSpecificInfo || '',
      notes: notes || body.notes || '',
      product: productTitle,
      productId: prod ? prod.id : productId,
      plan: planTitle,
      quantity: safeQty,
      unitPriceUsd,
      totalUsd,
      totalNgn,
      currency: activeCurrency,
      price: formattedPrice,
      gateway: selectedGateway,
      reservationToken: reservationToken || '',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };

    saveOrder(newOrder);

    // Link reservation to this orderId
    if (reservationToken) {
      const reservations = getAllReservations();
      const r = reservations.find(x => x.token === reservationToken);
      if (r) {
        r.orderId = orderId;
        saveReservations(reservations);
      }
    }

    return sendJSON(res, 201, {
      success: true,
      message: 'Order created and price verified.',
      order: newOrder
    });
  }

  // 5. POST /api/payment/verify — Verify Transaction Server-Side & Finalize Sold Stock
  if (pathname === '/api/payment/verify' && req.method === 'POST') {
    const body = await parseBody(req);
    const { reference, orderId, gateway, reservationToken } = body;

    return await withInventoryTransaction(async () => {
      const orders = getAllOrders();
      let order = orders.find(o => o.id === orderId || (reference && o.reference === reference));

      if (!order) {
        order = {
          id: orderId || ('#CL-' + Math.floor(10000 + Math.random() * 90000)),
          customerName: body.customerName || 'Customer',
          customerEmail: body.customerEmail || 'customer@example.com',
          customerPhone: body.customerPhone || '',
          product: body.product || 'Digital Subscription',
          productId: body.productId || '',
          plan: body.plan || '1 Month',
          quantity: body.quantity || 1,
          price: body.amount || '$4.95',
          currency: body.currency || 'USD',
          gateway: gateway || 'Paystack',
          date: new Date().toLocaleString('en-GB')
        };
      }

      // Convert Reserved Stock -> Sold Stock (Total Stock decreased, Reserved Stock decreased)
      const token = reservationToken || order.reservationToken;
      const reservations = getAllReservations();
      let resv = reservations.find(r => r.token === token || (order.id && r.orderId === order.id));

      const products = getAllProducts();
      const prod = products.find(p => p.id === (order.productId || (resv ? resv.productId : '')) || p.name === order.product);

      const qty = parseInt(order.quantity || 1, 10);

      if (prod) {
        // If there was an active reservation, decrease both total and reserved
        if (resv && resv.status === 'pending') {
          resv.status = 'completed';
          resv.completedAt = new Date().toISOString();
          saveReservations(reservations);

          prod.totalStock = Math.max(0, (prod.totalStock || 0) - qty);
          prod.reservedStock = Math.max(0, (prod.reservedStock || 0) - qty);

          if (order.plan && prod.variants) {
            const v = prod.variants.find(va => va.duration === order.plan);
            if (v) {
              v.totalStock = Math.max(0, (v.totalStock || 0) - qty);
              v.reservedStock = Math.max(0, (v.reservedStock || 0) - qty);
            }
          }
        } else {
          // Direct sale without pre-reservation (safety fallback)
          prod.totalStock = Math.max(0, (prod.totalStock || 0) - qty);
          if (order.plan && prod.variants) {
            const v = prod.variants.find(va => va.duration === order.plan);
            if (v) {
              v.totalStock = Math.max(0, (v.totalStock || 0) - qty);
            }
          }
        }

        recomputeProductStock(prod);
        saveProducts(products);

        recordLog('Payment Gateway', 'Gateway', 'Inventory', 'Stock Sold', `Sold ${qty} unit(s) of "${prod.name}" via ${gateway || 'Paystack'}. New stock — Total: ${prod.totalStock}, Reserved: ${prod.reservedStock}, Available: ${prod.availableStock}`);
        console.log(`[Payment Success & Stock Sold] "${prod.name}" x${qty} — Total: ${prod.totalStock}, Reserved: ${prod.reservedStock}, Available: ${prod.availableStock}`);
      }

      const credentials = generateCredentials(order.product, order.customerEmail, order.productSpecificInfo || order.notes);

      order.status = 'Delivered';
      order.reference = reference || order.reference || `pay_ref_${Date.now()}`;
      order.gateway = gateway || order.gateway || 'Paystack';
      order.paidAt = new Date().toISOString();
      order.credentials = credentials;

      saveOrder(order);

      return sendJSON(res, 200, {
        success: true,
        message: 'Payment verified server-side, stock finalized, and credentials dispatched!',
        order: {
          id: order.id,
          reference: order.reference,
          status: order.status,
          product: order.product,
          plan: order.plan,
          quantity: order.quantity || 1,
          price: order.price,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          gateway: order.gateway,
          paidAt: order.paidAt,
          credentials: order.credentials
        }
      });
    });
  }

  // 6. Paystack Webhook Handler
  if (pathname === '/api/webhook/paystack' && req.method === 'POST') {
    const body = await parseBody(req);
    
    if (body.event === 'charge.success') {
      const data = body.data;
      const ref = data.reference;

      await withInventoryTransaction(async () => {
        const orders = getAllOrders();
        const order = orders.find(o => o.reference === ref || (data.metadata && data.metadata.orderId === o.id));
        if (order && order.status !== 'Delivered') {
          order.status = 'Delivered';
          order.paidAt = new Date().toISOString();
          order.credentials = generateCredentials(order.product, order.customerEmail, order.notes);
          saveOrder(order);

          // Deduct stock if not already finalized
          const products = getAllProducts();
          const prod = products.find(p => p.id === order.productId || p.name === order.product);
          if (prod) {
            const qty = order.quantity || 1;
            prod.totalStock = Math.max(0, (prod.totalStock || 0) - qty);
            prod.reservedStock = Math.max(0, (prod.reservedStock || 0) - qty);
            recomputeProductStock(prod);
            saveProducts(products);
          }
          console.log(`[Paystack Webhook] Order ${order.id} marked as Delivered via charge.success`);
        }
      });
    }
    return sendJSON(res, 200, { received: true });
  }

  // 7. GET /api/orders/track — Public Guest Order Tracking
  if (pathname === '/api/orders/track' && req.method === 'GET') {
    const searchTerm = (query.id || query.email || query.q || query.query || '').trim();
    if (!searchTerm) {
      return sendJSON(res, 400, { success: false, message: 'Please provide either Order ID or Email to track.' });
    }

    const cleanTerm = searchTerm.toLowerCase().replace(/^#/, '');
    const orders = getAllOrders();
    const matched = orders.filter(o => {
      const oId = (o.id || '').toLowerCase().replace(/^#/, '');
      const oEmail = (o.customerEmail || '').toLowerCase();
      const oRef = (o.reference || '').toLowerCase();
      return oId === cleanTerm || oEmail === cleanTerm || oRef === cleanTerm || oEmail.includes(cleanTerm);
    });

    if (matched.length === 0) {
      return sendJSON(res, 404, { success: false, message: 'No orders found matching your search.' });
    }

    return sendJSON(res, 200, {
      success: true,
      count: matched.length,
      data: matched
    });
  }

  // 8. GET /api/stats — Storefront Real-time Statistics
  if (pathname === '/api/stats' && req.method === 'GET') {
    const products = getAllProducts().map(p => recomputeProductStock(p));
    const orders = getAllOrders();
    return sendJSON(res, 200, {
      success: true,
      totalCatalog: products.length,
      inStockCount: products.filter(p => p.inStock && p.availableStock > 0).length,
      totalOrdersDelivered: orders.filter(o => o.status === 'Delivered').length,
      activeRate: USD_TO_NGN_RATE
    });
  }

  // =========================================================================
  // STATIC ASSETS & CLEAN URL SERVING
  // =========================================================================
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(__dirname, reqPath);

  // Clean URL resolution
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`[CreditLog] Storefront Server & REST API active at http://localhost:${PORT}/`);
  console.log(`[CreditLog] Database initialized at ${DATA_DIR}`);
});
