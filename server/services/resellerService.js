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
  lowBalanceThreshold: 5.0,

  // Range-based price multipliers:
  // If wholesale price falls in [min, max], this multiplier is applied
  priceTiers: [
    { id: 'tier_micro', min: 0.00, max: 2.00, multiplier: 2.50, label: 'Micro ($0.00 – $2.00)' },
    { id: 'tier_low', min: 2.01, max: 5.00, multiplier: 2.00, label: 'Low ($2.01 – $5.00)' },
    { id: 'tier_mid', min: 5.01, max: 15.00, multiplier: 1.60, label: 'Mid ($5.01 – $15.00)' },
    { id: 'tier_upper', min: 15.01, max: 40.00, multiplier: 1.35, label: 'Upper ($15.01 – $40.00)' },
    { id: 'tier_high', min: 40.01, max: 999999, multiplier: 1.20, label: 'High ($40.01+)' }
  ],
  // Product-specific overrides (productId -> multiplier)
  productOverrides: {},
  // Category-specific fallback multipliers
  categoryMultipliers: {
    ai: 1.75,
    gaming: 1.50,
    streaming: 1.40,
    productivity: 1.50,
    security: 1.60
  }
};

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { 
        ...DEFAULT_CONFIG, 
        ...parsed,
        priceTiers: parsed.priceTiers || DEFAULT_CONFIG.priceTiers,
        productOverrides: parsed.productOverrides || {},
        categoryMultipliers: { ...DEFAULT_CONFIG.categoryMultipliers, ...(parsed.categoryMultipliers || {}) }
      };
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
      lowBalanceThreshold: this.config.lowBalanceThreshold || 5.0,
      priceTiers: this.config.priceTiers || DEFAULT_CONFIG.priceTiers,
      productOverrides: this.config.productOverrides || {},
      categoryMultipliers: this.config.categoryMultipliers || DEFAULT_CONFIG.categoryMultipliers
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

    // Save Price Range Tiers
    if (updates.priceTiers && Array.isArray(updates.priceTiers)) {
      this.config.priceTiers = updates.priceTiers.map((tier, idx) => ({
        id: tier.id || ('tier_' + (idx + 1)),
        min: Math.max(0, parseFloat(tier.min) || 0),
        max: Math.max(0, parseFloat(tier.max) || 0),
        multiplier: Math.max(1.0, parseFloat(tier.multiplier) || 1.0),
        label: tier.label || `Tier $${tier.min} - $${tier.max}`
      })).sort((a, b) => a.min - b.min);
    }

    // Save Product Overrides
    if (updates.productOverrides && typeof updates.productOverrides === 'object') {
      this.config.productOverrides = updates.productOverrides;
    }

    // Save Category Multipliers
    if (updates.categoryMultipliers && typeof updates.categoryMultipliers === 'object') {
      this.config.categoryMultipliers = { ...this.config.categoryMultipliers, ...updates.categoryMultipliers };
    }

    writeConfig(this.config);
    return this.getSettings();
  }

  // Calculate dynamic retail pricing based on range tiers and overrides
  calculatePricing(wholesalePriceUsd, productId = null, category = null) {
    this.config = readConfig();
    const cost = Math.max(0, parseFloat(wholesalePriceUsd || 0));
    const tiers = Array.isArray(this.config.priceTiers) ? this.config.priceTiers : DEFAULT_CONFIG.priceTiers;
    const overrides = this.config.productOverrides || {};
    const catMultipliers = this.config.categoryMultipliers || {};
    const defaultMultiplier = 1 + (Number(this.config.markupPercent || 25) / 100);

    let multiplier = null;
    let ruleMatched = '';
    let ruleType = '';

    // 1. Specific Product ID / Key Override
    if (productId && overrides[productId] !== undefined && Number(overrides[productId]) > 0) {
      multiplier = Number(overrides[productId]);
      ruleMatched = `Product Custom (${productId})`;
      ruleType = 'product_override';
    }

    // 2. Price Range Tier (if cost falls in [min, max])
    if (multiplier === null) {
      const matchedTier = tiers.find(t => cost >= Number(t.min) && cost <= Number(t.max));
      if (matchedTier && Number(matchedTier.multiplier) > 0) {
        multiplier = Number(matchedTier.multiplier);
        ruleMatched = matchedTier.label || `Range $${matchedTier.min} - $${matchedTier.max}`;
        ruleType = 'price_tier';
      }
    }

    // 3. Category Multiplier
    if (multiplier === null && category && catMultipliers[category] !== undefined && Number(catMultipliers[category]) > 0) {
      multiplier = Number(catMultipliers[category]);
      ruleMatched = `Category (${category})`;
      ruleType = 'category';
    }

    // 4. Fallback to default markup percentage
    if (multiplier === null) {
      multiplier = defaultMultiplier;
      ruleMatched = `Default Store Markup (+${this.config.markupPercent || 25}%)`;
      ruleType = 'default';
    }

    const rate = Number(this.config.usdToNgnRate) || 1500;
    const retailUsd = Number((cost * multiplier).toFixed(2));
    const retailNgn = Math.round(retailUsd * rate);
    const profitUsd = Number((retailUsd - cost).toFixed(2));
    const profitMarginPercent = retailUsd > 0 ? Math.round(((retailUsd - cost) / retailUsd) * 100) : 0;

    return {
      wholesaleUsd: cost,
      multiplier,
      ruleMatched,
      ruleType,
      retailUsd,
      retailNgn,
      profitUsd,
      profitMarginPercent
    };
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

  // Available Products with Calculated Retail Pricing
  async getProducts() {
    const res = await this.request('/products');
    if (res && res.products && Array.isArray(res.products)) {
      res.products = res.products.map(p => {
        const cost = parseFloat(p.price || 0);
        const pricing = this.calculatePricing(cost, p.id || p.productId, p.category);
        return {
          ...p,
          pricing,
          suggestedRetailUsd: pricing.retailUsd,
          suggestedRetailNgn: pricing.retailNgn,
          appliedMultiplier: pricing.multiplier,
          pricingRule: pricing.ruleMatched
        };
      });
    }
    return res;
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
