const fs = require('fs');
const path = require('path');

// Determine persistent data directory
const isVercel = Boolean(process.env.VERCEL);
const candidateRoots = [process.cwd(), path.resolve(__dirname, '../..'), path.resolve(__dirname, '..')];
const ROOT_DIR = candidateRoots.find(dir => fs.existsSync(path.join(dir, 'index.html'))) || process.cwd();
const DATA_DIR = isVercel ? path.join('/tmp', 'creditlog-data') : path.join(ROOT_DIR, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'reseller_config.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Configuration
const DEFAULT_CONFIG = {
  baseUrl: process.env.RESELLER_BASE_URL || 'https://api-geminipro.ignorelist.com/api/reseller/v1',
  apiKey: process.env.RESELLER_API_KEY || '',
  markupPercent: 25,
  usdToNgnRate: 1500,
  autoFulfill: true,
  mode: process.env.RESELLER_API_KEY ? 'live' : 'simulation',
  lowBalanceThreshold: 5.0
};

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('[ResellerService] Error reading config file:', err.message);
  }
  return { ...DEFAULT_CONFIG };
}

function writeConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[ResellerService] Error saving config file:', err.message);
    return false;
  }
}

// Reseller API Client
class ResellerService {
  constructor() {
    this.config = readConfig();
  }

  getSettings() {
    this.config = readConfig();
    const isConfigured = Boolean(this.config.apiKey && this.config.apiKey.trim() !== '' && this.config.apiKey !== 'not generated yet');
    let maskedKey = '';
    if (isConfigured) {
      const key = this.config.apiKey;
      maskedKey = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : '••••••••';
    }

    return {
      baseUrl: this.config.baseUrl,
      isConfigured,
      maskedKey,
      markupPercent: this.config.markupPercent,
      usdToNgnRate: this.config.usdToNgnRate,
      autoFulfill: this.config.autoFulfill,
      mode: isConfigured ? (this.config.mode || 'live') : 'simulation',
      lowBalanceThreshold: this.config.lowBalanceThreshold || 5.0
    };
  }

  saveSettings(updates = {}) {
    this.config = readConfig();
    if (updates.baseUrl !== undefined) this.config.baseUrl = updates.baseUrl.trim();
    if (updates.apiKey !== undefined) {
      const trimmed = updates.apiKey.trim();
      if (trimmed && trimmed !== 'not generated yet') {
        this.config.apiKey = trimmed;
        this.config.mode = 'live';
      } else if (trimmed === '') {
        this.config.apiKey = '';
        this.config.mode = 'simulation';
      }
    }
    if (updates.markupPercent !== undefined) this.config.markupPercent = Math.max(0, Number(updates.markupPercent) || 0);
    if (updates.usdToNgnRate !== undefined) this.config.usdToNgnRate = Math.max(1, Number(updates.usdToNgnRate) || 1500);
    if (updates.autoFulfill !== undefined) this.config.autoFulfill = Boolean(updates.autoFulfill);
    if (updates.mode !== undefined) this.config.mode = updates.mode;
    if (updates.lowBalanceThreshold !== undefined) this.config.lowBalanceThreshold = Number(updates.lowBalanceThreshold) || 5.0;

    writeConfig(this.config);
    return this.getSettings();
  }

  isLive() {
    this.config = readConfig();
    return Boolean(this.config.apiKey && this.config.apiKey.trim() !== '' && this.config.apiKey !== 'not generated yet' && this.config.mode === 'live');
  }

  async request(endpoint, options = {}) {
    this.config = readConfig();
    const live = this.isLive();

    if (!live) {
      return this.mockResellerResponse(endpoint, options);
    }

    const url = `${this.config.baseUrl.replace(/\/+$/, '')}${endpoint}`;
    const headers = {
      'X-API-Key': this.config.apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await response.json().catch(() => ({ ok: false, error: 'invalid_json', message: 'Failed to parse JSON response' }));
      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        return { ok: false, error: 'timeout', message: 'Reseller API request timed out after 15s' };
      }
      return { ok: false, error: 'network_error', message: err.message };
    }
  }

  // Account Information
  async getInfo() {
    return this.request('/account/info');
  }

  // Live Balance Check
  async getBalance() {
    return this.request('/account/balance');
  }

  // Available Products
  async getProducts() {
    return this.request('/products');
  }

  // Single Product Detail
  async getProduct(productId) {
    return this.request(`/products/${productId}`);
  }

  // Create Order / Buy Goods
  async createOrder(productId, quantity = 1) {
    return this.request('/orders', {
      method: 'POST',
      body: {
        productId: Number(productId),
        quantity: Number(quantity)
      }
    });
  }

  // List Orders
  async getOrders() {
    return this.request('/orders');
  }

  // Get Single Order Status & Value
  async getOrder(orderCode) {
    return this.request(`/orders/${encodeURIComponent(orderCode)}`);
  }

  // Automated CreditLog Order Fulfillment Engine
  async fulfillCreditLogOrder(order, product, variant) {
    this.config = readConfig();

    if (!this.config.autoFulfill) {
      return {
        success: false,
        pending: true,
        reason: 'auto_fulfill_disabled',
        message: 'Automated fulfillment is disabled in settings. Order awaits manual dispatch.'
      };
    }

    // Determine supplier product ID
    let supplierProductId = null;
    if (variant && variant.resellerProductId !== undefined) {
      supplierProductId = variant.resellerProductId;
    } else if (product && product.resellerProductId !== undefined) {
      supplierProductId = product.resellerProductId;
    }

    // Fallback: Check standard product mapping if not explicitly mapped
    if (!supplierProductId && product) {
      supplierProductId = this.resolveSupplierProductId(product.id, variant ? variant.duration : null);
    }

    if (!supplierProductId) {
      return {
        success: false,
        pending: true,
        reason: 'no_supplier_mapping',
        message: `Product "${product ? product.name : order.productId}" is not mapped to an upstream reseller productId. Requires manual dispatch.`
      };
    }

    const qty = Math.max(1, parseInt(order.quantity || 1, 10));
    console.log(`[ResellerService] Auto-dispatching Order #${order.id} to Supplier Product ID #${supplierProductId} (Qty: ${qty})`);

    const result = await this.createOrder(supplierProductId, qty);

    if (result && result.ok && result.order) {
      const supplierOrder = result.order;
      return {
        success: true,
        orderCode: supplierOrder.orderCode,
        deliveredValue: supplierOrder.value,
        supplierTotal: supplierOrder.total,
        currency: supplierOrder.currency || 'USD',
        status: supplierOrder.status || 'completed',
        uniqueId: supplierOrder.uniqueId || supplierOrder.boughtId,
        rawOrder: supplierOrder,
        deliveredAt: new Date().toISOString()
      };
    } else {
      const errMsg = (result && (result.message || result.error)) || 'Unknown supplier error';
      console.error(`[ResellerService] Fulfillment failed for Order #${order.id}:`, errMsg);
      return {
        success: false,
        pending: true,
        reason: 'supplier_error',
        message: `Supplier fulfillment failed: ${errMsg}. Order saved for manual dispatch.`,
        rawError: result
      };
    }
  }

  // Heuristic resolver for unmapped items
  resolveSupplierProductId(productId, duration) {
    const slug = (productId || '').toLowerCase();
    if (slug.includes('gemini')) return 1;
    if (slug.includes('chatgpt') || slug.includes('openai')) return 2;
    if (slug.includes('duolingo')) return 3;
    if (slug.includes('xbox')) return 4;
    if (slug.includes('prime')) return 5;
    if (slug.includes('lovable')) return 6;
    if (slug.includes('snapchat')) return 7;
    return null;
  }

  // High-fidelity local simulation for development & testing prior to live key generation
  mockResellerResponse(endpoint, options = {}) {
    console.log(`[ResellerService:Simulation] ${options.method || 'GET'} ${endpoint}`);

    if (endpoint === '/account/info') {
      return {
        ok: true,
        ownerUserId: 7680379564,
        store: 'Gemini Pro Store (Sandbox Simulation)',
        apiVersion: 'v1',
        ordersEnabled: true,
        note: 'Orders simulated locally until live API key is set.'
      };
    }

    if (endpoint === '/account/balance') {
      return {
        ok: true,
        balance: '50.00',
        currency: 'USD',
        simulated: true
      };
    }

    if (endpoint === '/products') {
      return {
        ok: true,
        products: [
          { id: 1, productId: 1, name: 'Google Gemini Pro 18M Invite', title: 'Google Gemini Pro 18M Invite', price: '0.90', currency: 'USD', stock: 25, inStock: true, supplier: 'gemini_direct' },
          { id: 2, productId: 2, name: 'ChatGPT Plus 1 Month Private Account', title: 'ChatGPT Plus 1 Month Private Account', price: '8.50', currency: 'USD', stock: 12, inStock: true, supplier: 'openai_direct' },
          { id: 3, productId: 3, name: 'Duolingo Super 1 Year Invite Link', title: 'Duolingo Super 1 Year Invite Link', price: '1.20', currency: 'USD', stock: 40, inStock: true, supplier: 'duo_family' },
          { id: 4, productId: 4, name: 'Xbox Game Pass PC Digital Key', title: 'Xbox Game Pass PC Digital Key', price: '3.00', currency: 'USD', stock: 15, inStock: true, supplier: 'ms_wholesale' },
          { id: 5, productId: 5, name: 'Amazon Prime Video 6 Months', title: 'Amazon Prime Video 6 Months', price: '2.50', currency: 'USD', stock: 18, inStock: true, supplier: 'amazon_direct' },
          { id: 6, productId: 6, name: 'Lovable Pro Lite 1 Year Invite', title: 'Lovable Pro Lite 1 Year Invite', price: '10.00', currency: 'USD', stock: 8, inStock: true, supplier: 'lovable_direct' },
          { id: 7, productId: 7, name: 'Snapchat Plus 3 Months License', title: 'Snapchat Plus 3 Months License', price: '4.50', currency: 'USD', stock: 14, inStock: true, supplier: 'snap_direct' }
        ]
      };
    }

    if (endpoint.startsWith('/products/')) {
      const id = parseInt(endpoint.split('/').pop(), 10);
      return {
        ok: true,
        product: {
          id,
          productId: id,
          name: `Digital Subscription Service #${id}`,
          price: '2.50',
          currency: 'USD',
          stock: 20,
          inStock: true
        }
      };
    }

    if (endpoint === '/orders' && options.method === 'POST') {
      const body = options.body || {};
      const orderCode = 'rs_sim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const deliveryPayload = this.generateSimulatedDeliveryValue(body.productId);

      return {
        ok: true,
        order: {
          orderCode,
          productId: body.productId,
          name: `Digital Service #${body.productId}`,
          quantity: body.quantity || 1,
          status: 'completed',
          total: '2.50',
          currency: 'USD',
          value: deliveryPayload,
          uniqueId: Date.now(),
          boughtId: body.productId,
          createdAt: new Date().toISOString()
        }
      };
    }

    if (endpoint.startsWith('/orders/')) {
      const orderCode = endpoint.split('/').pop();
      return {
        ok: true,
        order: {
          orderCode,
          productId: 1,
          quantity: 1,
          status: 'completed',
          total: '2.50',
          value: 'https://invite.example.com/activate?token=simulated_token_' + Date.now(),
          error: null,
          createdAt: new Date().toISOString()
        }
      };
    }

    return { ok: false, error: 'not_found', message: `Simulated endpoint ${endpoint} not recognized` };
  }

  generateSimulatedDeliveryValue(productId) {
    const id = Number(productId);
    switch (id) {
      case 1:
        return 'https://one.google.com/promo/join?token=' + Math.random().toString(36).substring(2, 15) + '_gemini_pro_vip';
      case 2:
        return 'Email: chatgpt_vip_' + Math.floor(Math.random()*8999+1000) + '@creditlog.net | Password: ClPass_' + Math.random().toString(36).substring(2, 8);
      case 3:
        return 'https://invite.duolingo.com/family/' + Math.random().toString(36).substring(2, 12);
      case 4:
        return 'XBX-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-GAME';
      case 5:
        return 'Prime Video Profile: Pin 4920 | Access: prime_watch_' + Math.random().toString(36).substring(2, 6) + '@creditlog.com';
      case 6:
        return 'https://lovable.dev/invite?code=lovable_pro_' + Math.random().toString(36).substring(2, 10);
      default:
        return 'KEY-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-CL2026';
    }
  }
}

module.exports = new ResellerService();
