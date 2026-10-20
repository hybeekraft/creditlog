const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const resellerService = require('../server/services/resellerService');
const botDbBridge = require('../server/services/botDbBridge');
const syncEngine = require('../server/services/syncEngine');
const server = require('../server/index');

const TEST_PORT = 3199;
let baseUrl = `http://localhost:${TEST_PORT}`;

test.before(async () => {
  await new Promise((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Running on ${baseUrl}`);
      resolve();
    });
  });
});

test.after(async () => {
  syncEngine.stopPeriodicSync();
  botDbBridge.close();
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  await new Promise((resolve) => {
    server.close(() => {
      console.log('[Test Server] Closed');
      resolve();
    });
  });
  const handles = process._getActiveHandles ? process._getActiveHandles() : [];
  console.log('Remaining active handles:', handles.map(h => (h.constructor ? h.constructor.name : typeof h)));
  setTimeout(() => process.exit(0), 100).unref();
});

test('1. Supplier Wholesale API Integration & Account Check', async () => {
  const info = await resellerService.getInfo();
  assert.equal(info.ok, true, 'Supplier /account/info should return ok: true');
  assert.ok(info.store, 'Supplier store name should be defined');

  const balance = await resellerService.getBalance();
  assert.equal(balance.ok, true, 'Supplier /account/balance should return ok: true');
  assert.ok(parseFloat(balance.balance) >= 0, 'Supplier balance should be a valid non-negative number');
});

test('2. Telegram Bot SQLite Database Bridge (store.db)', async () => {
  assert.equal(botDbBridge.isAvailable(), true, 'Bot DB should be detected and accessible');
  
  const rate = botDbBridge.getUsdToNgnRate();
  assert.ok(rate && rate > 1000, `Exchange rate from store.db should be > 1000, got ${rate}`);

  const products = botDbBridge.getAllProducts();
  assert.ok(products.length > 50, `Products in store.db should be > 50, got ${products.length}`);
});

test('3. Full Catalog Synchronization Engine', async () => {
  const syncResult = await syncEngine.runCatalogSync();
  assert.equal(syncResult.lastStatus, 'success', 'Catalog sync must succeed');
  assert.ok(syncResult.totalSupplierProducts > 100, `Supplier products should be > 100, got ${syncResult.totalSupplierProducts}`);
  assert.equal(syncResult.botDbSynchronized, true, 'store.db must be synchronized');

  // Verify local products.json was updated
  const productsFile = path.resolve(__dirname, '../data/products.json');
  const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  assert.ok(products.length >= syncResult.totalSupplierProducts, 'Local catalog should contain all synced items');

  // Check out of stock handling
  const outOfStockItem = products.find(p => p.totalStock === 0);
  if (outOfStockItem) {
    assert.equal(outOfStockItem.inStock, false, 'Items with 0 stock must have inStock = false');
  }
});

test('4. Storefront Server-side Price Quote (/api/orders/quote)', async () => {
  const productsFile = path.resolve(__dirname, '../data/products.json');
  const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  const testProduct = products[0];

  const res = await fetch(`${baseUrl}/api/orders/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: testProduct.id,
      quantity: 2,
      currency: 'NGN'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.productId, testProduct.id);
  assert.equal(data.quantity, 2);
  assert.ok(data.totalNgn > 0, 'Total NGN must be calculated');
  assert.ok(data.totalUsd > 0, 'Total USD must be calculated');
});

test('5. Direct Guest Checkout Order Creation (/api/orders/create)', async () => {
  const productsFile = path.resolve(__dirname, '../data/products.json');
  const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  const testProduct = products[0];

  const res = await fetch(`${baseUrl}/api/orders/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: testProduct.id,
      duration: testProduct.duration || '1 Month',
      quantity: 1,
      customerName: 'Test Automation Guest',
      customerEmail: 'automation_test@creditlog.com',
      customerPhone: '+2348123456789',
      deliveryChannel: 'Email',
      gateway: 'Paystack'
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.order && data.order.id, 'Order must have an ID');
  assert.equal(data.order.customerEmail, 'automation_test@creditlog.com');
  assert.equal(data.order.status, 'Pending');
});

test('6. Server-Side Payment Verification & store.db Order Sync (/api/payment/verify)', async () => {
  const productsFile = path.resolve(__dirname, '../data/products.json');
  const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  const testProduct = products.find(p => p.inStock) || products[0];

  // 1. Create order
  const createRes = await fetch(`${baseUrl}/api/orders/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: testProduct.id,
      duration: testProduct.duration || '1 Month',
      quantity: 1,
      customerName: 'Verified Customer',
      customerEmail: 'verified_order@creditlog.com',
      customerPhone: '+2348000000001',
      deliveryChannel: 'Email',
      gateway: 'Paystack'
    })
  });
  const createData = await createRes.json();
  const orderId = createData.order.id;
  const reference = createData.order.reference;

  // 2. Verify payment server-side
  const verifyRes = await fetch(`${baseUrl}/api/payment/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      reference,
      gateway: 'Paystack'
    })
  });

  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.success, true);
  assert.equal(verifyData.order.status, 'Delivered');
  assert.ok(verifyData.order.credentials, 'Order must have dispatched credentials');

  // 3. Verify public tracking can find this verified order
  const trackRes = await fetch(`${baseUrl}/api/orders/track?id=${encodeURIComponent(orderId)}`);
  assert.equal(trackRes.status, 200);
  const trackData = await trackRes.json();
  assert.equal(trackData.success, true);
  assert.equal(trackData.data[0].id, orderId);
});

test('7. Paystack Webhook Processing & Idempotency (/api/webhook/paystack)', async () => {
  const webhookPayload = {
    event: 'charge.success',
    data: {
      reference: 'test_idempotent_ref_' + Date.now(),
      amount: 1450000,
      currency: 'NGN',
      status: 'success',
      metadata: {
        orderId: '#CL-TEST-IDEMPOTENT'
      }
    }
  };

  // First webhook execution
  const res1 = await fetch(`${baseUrl}/api/webhook/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload)
  });
  assert.equal(res1.status, 200);

  // Duplicate replay
  const res2 = await fetch(`${baseUrl}/api/webhook/paystack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload)
  });
  assert.equal(res2.status, 200);
});

test('8. Product-Specific Requirements & Delivery Modes from Seller API', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.data.length >= 124, `Storefront should offer at least 124 products, got ${data.data.length}`);

  // 1. Verify deliveryFormat and importantRequirements exist across products
  const productsWithRequirements = data.data.filter(p => p.importantRequirements && p.importantRequirements.trim().length > 0);
  assert.ok(productsWithRequirements.length > 20, `At least 20 products should have specific requirements, found ${productsWithRequirements.length}`);

  const productsWithDeliveryFmt = data.data.filter(p => p.deliveryFormat && p.deliveryFormat.trim().length > 0);
  assert.ok(productsWithDeliveryFmt.length > 50, `At least 50 products should have parsed delivery format, found ${productsWithDeliveryFmt.length}`);

  // 2. Verify requirements are distinct and product-specific (NOT generic fixed text)
  const reqSet = new Set(productsWithRequirements.map(p => p.importantRequirements));
  assert.ok(reqSet.size > 5, `Requirements must be diverse and product-specific, got ${reqSet.size} unique requirement sets`);

  // 3. Test single product detail endpoint returns seller-provided fields
  const sample = productsWithRequirements[0];
  const detailRes = await fetch(`${baseUrl}/api/products/${encodeURIComponent(sample.id)}`);
  assert.equal(detailRes.status, 200);
  const detailData = await detailRes.json();
  assert.equal(detailData.success, true);
  assert.equal(detailData.data.id, sample.id);
  assert.ok(detailData.data.deliveryFormat, 'Detail product must have deliveryFormat');
  assert.ok(detailData.data.importantRequirements, 'Detail product must have importantRequirements');
  assert.ok(detailData.data.description, 'Detail product must have description');
});

test('9. Amazon Brand Consolidation: All Amazon/Prime products belong strictly to "Amazon"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const amazonItems = json.data.filter(p => 
    p.name.toLowerCase().includes('prime') || 
    p.name.toLowerCase().includes('amazon') ||
    (p.brand && p.brand.toLowerCase().includes('prime')) ||
    (p.brand && p.brand.toLowerCase().includes('amazon'))
  );

  assert.ok(amazonItems.length > 0, 'Must have at least one Amazon/Prime item in catalog');

  for (const item of amazonItems) {
    assert.equal(item.brand, 'Amazon', `Product ${item.id} (${item.name}) must have brand strictly set to "Amazon", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-amazon', `Product ${item.id} must have brandClass tile-amazon`);
    assert.equal(item.iconType, 'amazon', `Product ${item.id} must have iconType amazon`);
  }

  // Ensure no product in the catalog is branded "Amazon Prime"
  const duplicateBrands = json.data.filter(p => p.brand === 'Amazon Prime' || p.brand === 'Prime Video' || p.brand === 'Amazon Prime Video');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split Amazon Prime/Prime Video brand');
});

test('10. Apple TV+ Brand Consolidation: All Apple/Apple TV products belong strictly to "Apple TV+"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const appleItems = json.data.filter(p => 
    (p.name.toLowerCase().includes('apple') && !p.name.toLowerCase().includes('apple pay')) || 
    (p.brand && p.brand.toLowerCase().includes('apple') && !p.brand.toLowerCase().includes('apple pay'))
  );

  assert.ok(appleItems.length > 0, 'Must have Apple items in catalog');

  for (const item of appleItems) {
    assert.equal(item.brand, 'Apple TV+', `Product ${item.id} (${item.name}) must have brand strictly set to "Apple TV+", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-appletv', `Product ${item.id} must have brandClass tile-appletv`);
    assert.equal(item.iconType, 'appletv', `Product ${item.id} must have iconType appletv`);
  }

  // Ensure no product in the catalog is branded with raw "Apple" or "Apple TV"
  const duplicateBrands = json.data.filter(p => p.brand === 'Apple' || p.brand === 'Apple TV');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split "Apple" or "Apple TV" brand');
});

test('11. Gemini Brand Consolidation: All Google Gemini and Gmail products belong strictly to "Gemini"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const geminiItems = json.data.filter(p => 
    p.name.toLowerCase().includes('gemini') || 
    p.name.toLowerCase().includes('gmail') ||
    (p.brand && p.brand.toLowerCase().includes('gemini')) ||
    (p.brand && p.brand.toLowerCase().includes('gmail'))
  );

  assert.ok(geminiItems.length > 0, 'Must have Gemini/Gmail items in catalog');

  for (const item of geminiItems) {
    assert.equal(item.brand, 'Gemini', `Product ${item.id} (${item.name}) must have brand strictly set to "Gemini", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-gemini', `Product ${item.id} must have brandClass tile-gemini`);
    assert.equal(item.iconType, 'gemini', `Product ${item.id} must have iconType gemini`);
  }

  // Ensure no product in the catalog is branded with "Gmail" or "Google Gemini"
  const duplicateBrands = json.data.filter(p => p.brand === 'Gmail' || p.brand === 'Google Gemini');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split "Gmail" or "Google Gemini" brand');
});

test('12. HMA VPN Brand Consolidation: All HMA and HideMyAss products belong strictly to "HMA VPN"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const hmaItems = json.data.filter(p => 
    p.name.toLowerCase().includes('hma') || 
    p.name.toLowerCase().includes('hidemyass') ||
    (p.brand && p.brand.toLowerCase().includes('hma')) ||
    (p.brand && p.brand.toLowerCase().includes('hidemyass'))
  );

  assert.ok(hmaItems.length > 0, 'Must have HMA items in catalog');

  for (const item of hmaItems) {
    assert.equal(item.brand, 'HMA VPN', `Product ${item.id} (${item.name}) must have brand strictly set to "HMA VPN", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-hma', `Product ${item.id} must have brandClass tile-hma`);
    assert.equal(item.iconType, 'hma', `Product ${item.id} must have iconType hma`);
  }

  // Ensure no product in the catalog is branded with raw "HMA" or "HideMyAss"
  const duplicateBrands = json.data.filter(p => p.brand === 'HMA' || p.brand === 'HideMyAss' || p.brand === 'HideMyAss VPN');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split "HMA" or "HideMyAss" brand');
});

test('13. Claude Brand Consolidation: All Claude and Anthropic products belong strictly to "Claude"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const claudeItems = json.data.filter(p => 
    p.name.toLowerCase().includes('claude') || 
    p.name.toLowerCase().includes('anthropic') ||
    (p.brand && p.brand.toLowerCase().includes('claude')) ||
    (p.brand && p.brand.toLowerCase().includes('anthropic'))
  );

  assert.ok(claudeItems.length > 0, 'Must have Claude items in catalog');

  for (const item of claudeItems) {
    assert.equal(item.brand, 'Claude', `Product ${item.id} (${item.name}) must have brand strictly set to "Claude", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-claude', `Product ${item.id} must have brandClass tile-claude`);
    assert.equal(item.iconType, 'claude', `Product ${item.id} must have iconType claude`);
  }

  // Ensure no product in the catalog is branded with "Anthropic" or "Anthropic Claude"
  const duplicateBrands = json.data.filter(p => p.brand === 'Anthropic' || p.brand === 'Anthropic Claude');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split "Anthropic" or "Anthropic Claude" brand');
});

test('14. CapCut Brand Consolidation: All Capcut/CapCut products belong strictly to "CapCut"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const capcutItems = json.data.filter(p => 
    p.name.toLowerCase().includes('capcut') || 
    (p.brand && p.brand.toLowerCase().includes('capcut'))
  );

  assert.ok(capcutItems.length > 0, 'Must have CapCut items in catalog');

  for (const item of capcutItems) {
    assert.equal(item.brand, 'CapCut', `Product ${item.id} (${item.name}) must have brand strictly set to "CapCut", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-capcut', `Product ${item.id} must have brandClass tile-capcut`);
    assert.equal(item.iconType, 'capcut', `Product ${item.id} must have iconType capcut`);
  }

  // Ensure no product in the catalog is branded with lowercase/mixed "Capcut"
  const duplicateBrands = json.data.filter(p => p.brand === 'Capcut');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split "Capcut" brand');
});

test('15. KlingAI Brand Consolidation: All Kling/Kling AI products belong strictly to "KlingAI"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const klingItems = json.data.filter(p => 
    p.name.toLowerCase().includes('kling') || 
    (p.brand && p.brand.toLowerCase().includes('kling'))
  );

  assert.ok(klingItems.length > 0, 'Must have KlingAI items in catalog');

  for (const item of klingItems) {
    assert.equal(item.brand, 'KlingAI', `Product ${item.id} (${item.name}) must have brand strictly set to "KlingAI", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-kling', `Product ${item.id} must have brandClass tile-kling`);
    assert.equal(item.iconType, 'kling', `Product ${item.id} must have iconType kling`);
  }

  // Ensure no product in the catalog is branded with split "Kling" or "Kling AI"
  const duplicateBrands = json.data.filter(p => p.brand === 'Kling' || p.brand === 'Kling AI');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split "Kling" or "Kling AI" brand');
});

test('16. Gamma Brand Consolidation: All Gamma/Gamma AI products belong strictly to "Gamma"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const gammaItems = json.data.filter(p => 
    p.name.toLowerCase().includes('gamma') || 
    (p.brand && p.brand.toLowerCase().includes('gamma'))
  );

  assert.ok(gammaItems.length > 0, 'Must have Gamma items in catalog');

  for (const item of gammaItems) {
    assert.equal(item.brand, 'Gamma', `Product ${item.id} (${item.name}) must have brand strictly set to "Gamma", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-gamma', `Product ${item.id} must have brandClass tile-gamma`);
    assert.equal(item.iconType, 'gamma', `Product ${item.id} must have iconType gamma`);
  }

  // Ensure no product in the catalog is branded with "Gamma AI"
  const duplicateBrands = json.data.filter(p => p.brand === 'Gamma AI');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split "Gamma AI" brand');
});

test('17. Proton VPN Brand Consolidation: All Proton/Proton VPN products belong strictly to "Proton VPN"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const protonItems = json.data.filter(p => 
    p.name.toLowerCase().includes('proton') || 
    (p.brand && p.brand.toLowerCase().includes('proton'))
  );

  assert.ok(protonItems.length > 0, 'Must have Proton VPN items in catalog');

  for (const item of protonItems) {
    assert.equal(item.brand, 'Proton VPN', `Product ${item.id} (${item.name}) must have brand strictly set to "Proton VPN", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-proton', `Product ${item.id} must have brandClass tile-proton`);
    assert.equal(item.iconType, 'proton', `Product ${item.id} must have iconType proton`);
  }

  // Ensure no product in the catalog is branded with raw "Proton" or "ProtonVPN"
  const duplicateBrands = json.data.filter(p => p.brand === 'Proton' || p.brand === 'ProtonVPN');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split "Proton" brand');
});

test('18. Microsoft Brand Consolidation: All Microsoft, Office 365, and O365 products belong strictly to "Microsoft"', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);

  const msItems = json.data.filter(p => 
    ((p.name.toLowerCase().includes('microsoft') || p.name.toLowerCase().includes('o365') || p.name.toLowerCase().includes('office 365')) && !p.name.toLowerCase().includes('xbox')) ||
    ((p.brand && (p.brand.toLowerCase().includes('microsoft') || p.brand.toLowerCase().includes('o365') || p.brand.toLowerCase().includes('office 365'))) && !p.name.toLowerCase().includes('xbox'))
  );

  assert.ok(msItems.length > 0, 'Must have Microsoft items in catalog');

  for (const item of msItems) {
    assert.equal(item.brand, 'Microsoft', `Product ${item.id} (${item.name}) must have brand strictly set to "Microsoft", got "${item.brand}"`);
    assert.equal(item.brandClass, 'tile-microsoft', `Product ${item.id} must have brandClass tile-microsoft`);
    assert.equal(item.iconType, 'microsoft', `Product ${item.id} must have iconType microsoft`);
  }

  // Ensure no product in the catalog is branded with split "Microsoft 365", "Office 365", or "O365"
  const duplicateBrands = json.data.filter(p => p.brand === 'Microsoft 365' || p.brand === 'Office 365' || p.brand === 'O365');
  assert.equal(duplicateBrands.length, 0, 'No product should have a split "Microsoft 365", "Office 365", or "O365" brand');
});


