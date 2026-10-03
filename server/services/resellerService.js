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

  // Multi-vendor API registry
  vendors: [
    {
      id: 'vendor_gemini',
      name: 'GeminiPro Wholesale API',
      baseUrl: process.env.RESELLER_BASE_URL || 'https://api-geminipro.ignorelist.com/api/reseller/v1',
      apiKey: process.env.RESELLER_API_KEY || '',
      isDefault: true,
      mode: process.env.RESELLER_API_KEY ? 'live' : 'simulation',
      balance: '50.00',
      currency: 'USD',
      lastChecked: null,
      notes: 'Primary digital goods wholesaler'
    }
  ],

  // Range-based price multipliers:
  // If wholesale price falls in [min, max], this multiplier is applied
  priceTiers: [
    { id: 'tier_nano', min: 0.00, max: 0.99, multiplier: 3.50, label: 'Sub-Dollar ($0.00 – $0.99)' },
    { id: 'tier_micro', min: 1.00, max: 2.00, multiplier: 2.00, label: 'Micro ($1.00 – $2.00)' },
    { id: 'tier_low', min: 2.01, max: 5.00, multiplier: 1.80, label: 'Low ($2.01 – $5.00)' },
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
      const config = {
        ...DEFAULT_CONFIG,
        ...parsed,
        priceTiers: parsed.priceTiers || DEFAULT_CONFIG.priceTiers,
        productOverrides: parsed.productOverrides || {},
        categoryMultipliers: { ...DEFAULT_CONFIG.categoryMultipliers, ...(parsed.categoryMultipliers || {}) },
        vendors: Array.isArray(parsed.vendors) ? parsed.vendors : []
      };

      // Seamless migration: If vendors array is empty, populate from legacy baseUrl & apiKey
      if (config.vendors.length === 0) {
        const legacyKey = (config.apiKey || '').trim();
        config.vendors.push({
          id: 'vendor_primary',
          name: 'GeminiPro Wholesale API (Primary)',
          baseUrl: config.baseUrl || 'https://api-geminipro.ignorelist.com/api/reseller/v1',
          apiKey: legacyKey,
          isDefault: true,
          mode: legacyKey && legacyKey !== 'not generated yet' ? 'live' : 'simulation',
          balance: '50.00',
          currency: 'USD',
          lastChecked: new Date().toISOString(),
          notes: 'Default wholesale supplier account'
        });
      } else {
        // Ensure at least one vendor is set as default
        if (!config.vendors.some(v => v.isDefault)) {
          config.vendors[0].isDefault = true;
        }
      }

      // Synchronize legacy top-level credentials with the active default vendor
      const defaultVendor = config.vendors.find(v => v.isDefault) || config.vendors[0];
      if (defaultVendor) {
        config.baseUrl = defaultVendor.baseUrl || config.baseUrl;
        config.apiKey = defaultVendor.apiKey || config.apiKey;
        config.mode = defaultVendor.mode || config.mode;
      }

      return config;
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

  // Resolve target vendor by ID or default vendor
  resolveVendor(vendorId = null) {
    this.config = readConfig();
    const vendors = Array.isArray(this.config.vendors) ? this.config.vendors : [];
    if (vendorId) {
      const match = vendors.find(v => v.id === String(vendorId).trim());
      if (match) return match;
    }
    const def = vendors.find(v => v.isDefault) || vendors[0];
    if (def) return def;

    // Fallback object
    return {
      id: 'vendor_default',
      name: 'Default Supplier',
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      mode: this.config.mode || 'simulation',
      isDefault: true,
      balance: '50.00',
      currency: 'USD'
    };
  }

  getVendors() {
    this.config = readConfig();
    return (this.config.vendors || []).map(v => {
      const isConfigured = Boolean(v.apiKey && v.apiKey.trim() !== '' && v.apiKey !== 'not generated yet');
      let maskedKey = '';
      if (isConfigured) {
        const key = v.apiKey;
        maskedKey = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : '••••••••';
      }
      return {
        id: v.id,
        name: v.name || 'Unnamed Vendor',
        baseUrl: v.baseUrl || 'https://api-geminipro.ignorelist.com/api/reseller/v1',
        apiKeyMasked: maskedKey,
        isConfigured,
        isDefault: Boolean(v.isDefault),
        mode: isConfigured ? (v.mode || 'live') : 'simulation',
        balance: v.balance !== undefined ? String(v.balance) : '0.00',
        currency: v.currency || 'USD',
        lastChecked: v.lastChecked || null,
        notes: v.notes || ''
      };
    });
  }

  saveVendor(vendorData = {}) {
    this.config = readConfig();
    if (!Array.isArray(this.config.vendors)) {
      this.config.vendors = [];
    }

    const id = vendorData.id ? String(vendorData.id).trim() : `vendor_${Date.now()}`;
    const existingIndex = this.config.vendors.findIndex(v => v.id === id);

    const name = (vendorData.name || '').trim() || 'Custom Wholesaler';
    const baseUrl = (vendorData.baseUrl || '').trim() || 'https://api-geminipro.ignorelist.com/api/reseller/v1';
    let apiKey = vendorData.apiKey !== undefined ? String(vendorData.apiKey).trim() : '';

    // If apiKey is empty or masked in an update, keep existing key
    if (existingIndex >= 0 && (!apiKey || apiKey.includes('••••') || apiKey.includes('...'))) {
      apiKey = this.config.vendors[existingIndex].apiKey || '';
    }

    const isConfigured = Boolean(apiKey && apiKey !== 'not generated yet');
    const mode = isConfigured ? (vendorData.mode || 'live') : 'simulation';
    const isDefault = Boolean(vendorData.isDefault);
    const notes = vendorData.notes !== undefined ? String(vendorData.notes).trim() : '';

    const vendorRecord = {
      id,
      name,
      baseUrl,
      apiKey,
      isDefault,
      mode,
      balance: existingIndex >= 0 && this.config.vendors[existingIndex].balance !== undefined ? this.config.vendors[existingIndex].balance : '0.00',
      currency: (vendorData.currency || (existingIndex >= 0 ? this.config.vendors[existingIndex].currency : 'USD')).toUpperCase(),
      lastChecked: existingIndex >= 0 ? this.config.vendors[existingIndex].lastChecked : null,
      notes
    };

    if (isDefault) {
      this.config.vendors.forEach(v => { v.isDefault = false; });
    }

    if (existingIndex >= 0) {
      this.config.vendors[existingIndex] = { ...this.config.vendors[existingIndex], ...vendorRecord };
    } else {
      if (this.config.vendors.length === 0) {
        vendorRecord.isDefault = true;
      }
      this.config.vendors.push(vendorRecord);
    }

    // Ensure at least one default
    if (!this.config.vendors.some(v => v.isDefault) && this.config.vendors.length > 0) {
      this.config.vendors[0].isDefault = true;
    }

    // Synchronize legacy settings
    const def = this.config.vendors.find(v => v.isDefault) || this.config.vendors[0];
    if (def) {
      this.config.baseUrl = def.baseUrl;
      this.config.apiKey = def.apiKey;
      this.config.mode = def.mode;
    }

    writeConfig(this.config);
    return this.getVendors();
  }

  deleteVendor(vendorId) {
    this.config = readConfig();
    if (!Array.isArray(this.config.vendors)) return this.getVendors();

    const targetId = String(vendorId).trim();
    const wasDefault = (this.config.vendors.find(v => v.id === targetId) || {}).isDefault;
    this.config.vendors = this.config.vendors.filter(v => v.id !== targetId);

    // If removed vendor was default, assign new default
    if (wasDefault && this.config.vendors.length > 0) {
      this.config.vendors[0].isDefault = true;
    }

    // Synchronize legacy settings
    const def = this.config.vendors.find(v => v.isDefault) || this.config.vendors[0];
    if (def) {
      this.config.baseUrl = def.baseUrl;
      this.config.apiKey = def.apiKey;
      this.config.mode = def.mode;
    }

    writeConfig(this.config);
    return this.getVendors();
  }

  setDefaultVendor(vendorId) {
    this.config = readConfig();
    if (!Array.isArray(this.config.vendors)) return this.getVendors();

    const targetId = String(vendorId).trim();
    let found = false;
    this.config.vendors.forEach(v => {
      if (v.id === targetId) {
        v.isDefault = true;
        found = true;
      } else {
        v.isDefault = false;
      }
    });

    if (found) {
      const def = this.config.vendors.find(v => v.isDefault);
      if (def) {
        this.config.baseUrl = def.baseUrl;
        this.config.apiKey = def.apiKey;
        this.config.mode = def.mode;
      }
      writeConfig(this.config);
    }
    return this.getVendors();
  }

  getSettings() {
    this.config = readConfig();
    const vendors = this.getVendors();
    const defVendor = vendors.find(v => v.isDefault) || vendors[0] || {};
    const isConfigured = Boolean(defVendor.isConfigured);
    const maskedKey = defVendor.apiKeyMasked || '';

    return {
      baseUrl: defVendor.baseUrl || this.config.baseUrl,
      isConfigured,
      maskedKey,
      markupPercent: this.config.markupPercent,
      usdToNgnRate: this.config.usdToNgnRate,
      autoFulfill: this.config.autoFulfill,
      mode: isConfigured ? (defVendor.mode || this.config.mode || 'live') : 'simulation',
      lowBalanceThreshold: this.config.lowBalanceThreshold || 5.0,
      priceTiers: this.config.priceTiers || DEFAULT_CONFIG.priceTiers,
      productOverrides: this.config.productOverrides || {},
      categoryMultipliers: this.config.categoryMultipliers || DEFAULT_CONFIG.categoryMultipliers,
      vendors
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

    // If top-level baseUrl or apiKey was updated, sync to default vendor
    if (Array.isArray(this.config.vendors) && this.config.vendors.length > 0) {
      const defIdx = this.config.vendors.findIndex(v => v.isDefault);
      const targetIdx = defIdx >= 0 ? defIdx : 0;
      if (updates.baseUrl !== undefined) this.config.vendors[targetIdx].baseUrl = this.config.baseUrl;
      if (updates.apiKey !== undefined) {
        this.config.vendors[targetIdx].apiKey = this.config.apiKey;
        this.config.vendors[targetIdx].mode = this.config.mode;
      }
    }

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
      const sanitized = {};
      Object.keys(updates.productOverrides).forEach(key => {
        const val = parseFloat(updates.productOverrides[key]);
        if (!isNaN(val) && val > 0) {
          sanitized[String(key).trim()] = Math.round(val * 100) / 100;
        }
      });
      this.config.productOverrides = sanitized;
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

    // 1. Specific Product ID / Key Override (Highest Priority)
    if (productId !== null && productId !== undefined) {
      const pKey = String(productId).trim();
      const pKeyLower = pKey.toLowerCase();
      let matchedKey = null;
      if (overrides[pKey] !== undefined && Number(overrides[pKey]) > 0) {
        matchedKey = pKey;
      } else if (overrides[pKeyLower] !== undefined && Number(overrides[pKeyLower]) > 0) {
        matchedKey = pKeyLower;
      }

      if (matchedKey) {
        multiplier = Number(overrides[matchedKey]);
        ruleMatched = `Product Custom (${pKey})`;
        ruleType = 'product_override';
      }
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

  isLive(vendorId = null) {
    const vendor = this.resolveVendor(vendorId);
    return Boolean(vendor.apiKey && vendor.apiKey.trim() !== '' && vendor.apiKey !== 'not generated yet' && vendor.mode === 'live');
  }

  async request(endpoint, options = {}, vendorId = null) {
    const vendor = this.resolveVendor(vendorId);
    const live = this.isLive(vendor.id);

    if (!live) {
      return this.mockResellerResponse(endpoint, options, vendor);
    }

    const baseUrl = (vendor.baseUrl || 'https://api-geminipro.ignorelist.com/api/reseller/v1').replace(/\/+$/, '');
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      'X-API-Key': vendor.apiKey,
      'Authorization': `Bearer ${vendor.apiKey}`,
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
        return { ok: false, error: 'timeout', message: `Reseller API (${vendor.name}) request timed out after 15s` };
      }
      return { ok: false, error: 'network_error', message: err.message };
    }
  }

  // Account Information
  async getInfo(vendorId = null) {
    return this.request('/account/info', {}, vendorId);
  }

  // Live Balance Check
  async getBalance(vendorId = null) {
    return this.request('/account/balance', {}, vendorId);
  }

  // Test Vendor Connection and Update Cached Balance
  async testVendor(vendorId) {
    const vendor = this.resolveVendor(vendorId);
    if (!vendor) return { ok: false, error: 'vendor_not_found', message: 'Vendor not found' };

    const balanceRes = await this.request('/account/balance', {}, vendor.id);
    const infoRes = await this.request('/account/info', {}, vendor.id);

    this.config = readConfig();
    const vIdx = (this.config.vendors || []).findIndex(v => v.id === vendor.id);
    if (vIdx >= 0) {
      if (balanceRes && balanceRes.ok && balanceRes.balance !== undefined) {
        this.config.vendors[vIdx].balance = String(balanceRes.balance);
        this.config.vendors[vIdx].currency = balanceRes.currency || 'USD';
      }
      this.config.vendors[vIdx].lastChecked = new Date().toISOString();
      writeConfig(this.config);
    }

    return {
      ok: Boolean(balanceRes && balanceRes.ok),
      vendor: {
        id: vendor.id,
        name: vendor.name,
        mode: vendor.mode
      },
      balance: balanceRes,
      info: infoRes
    };
  }

  // Available Products with Calculated Retail Pricing
  async getProducts(vendorId = null) {
    const vendor = this.resolveVendor(vendorId);
    const res = await this.request('/products', {}, vendor.id);
    if (res && res.products && Array.isArray(res.products)) {
      res.products = res.products.map(p => {
        const cost = parseFloat(p.price || 0);
        const pricing = this.calculatePricing(cost, p.id || p.productId, p.category);
        return {
          ...p,
          vendorId: vendor.id,
          vendorName: vendor.name,
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
  async getProduct(productId, vendorId = null) {
    return this.request(`/products/${productId}`, {}, vendorId);
  }

  // Create Order / Buy Goods
  async createOrder(productId, quantity = 1, vendorId = null) {
    return this.request('/orders', {
      method: 'POST',
      body: {
        productId: Number(productId),
        quantity: Number(quantity)
      }
    }, vendorId);
  }

  // List Orders
  async getOrders(vendorId = null) {
    return this.request('/orders', {}, vendorId);
  }

  // Get Single Order Status & Value
  async getOrder(orderCode, vendorId = null) {
    return this.request(`/orders/${encodeURIComponent(orderCode)}`, {}, vendorId);
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

    // Determine target vendor (Variant Vendor > Product Vendor > Default Vendor)
    const targetVendorId = (variant && variant.vendorId) || (product && product.vendorId) || null;
    const vendor = this.resolveVendor(targetVendorId);

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
        vendorId: vendor.id,
        vendorName: vendor.name,
        reason: 'no_supplier_mapping',
        message: `Product "${product ? product.name : order.productId}" is not mapped to an upstream reseller productId. Requires manual dispatch.`
      };
    }

    const qty = Math.max(1, parseInt(order.quantity || 1, 10));
    console.log(`[ResellerService] Auto-dispatching Order #${order.id} to Supplier "${vendor.name}" (Product ID #${supplierProductId}, Qty: ${qty})`);

    const result = await this.createOrder(supplierProductId, qty, vendor.id);

    if (result && result.ok && result.order) {
      const supplierOrder = result.order;
      return {
        success: true,
        vendorId: vendor.id,
        vendorName: vendor.name,
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
      console.error(`[ResellerService] Fulfillment failed for Order #${order.id} with Vendor "${vendor.name}":`, errMsg);
      return {
        success: false,
        pending: true,
        vendorId: vendor.id,
        vendorName: vendor.name,
        reason: 'supplier_error',
        message: `Supplier "${vendor.name}" fulfillment failed: ${errMsg}. Order saved for manual dispatch.`,
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
  mockResellerResponse(endpoint, options = {}, vendor = null) {
    const vendorName = vendor ? vendor.name : 'Gemini Pro Store';
    console.log(`[ResellerService:Simulation][${vendorName}] ${options.method || 'GET'} ${endpoint}`);

    if (endpoint === '/account/info') {
      return {
        ok: true,
        ownerUserId: 7680379564,
        store: `${vendorName} (Sandbox Simulation)`,
        apiVersion: 'v1',
        ordersEnabled: true,
        note: 'Orders simulated locally until live API key is set.'
      };
    }

    if (endpoint === '/account/balance') {
      return {
        ok: true,
        balance: vendor && vendor.balance ? vendor.balance : '50.00',
        currency: vendor && vendor.currency ? vendor.currency : 'USD',
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
        return 'Email: chatgpt_vip_' + Math.floor(Math.random() * 8999 + 1000) + '@creditlog.net | Password: ClPass_' + Math.random().toString(36).substring(2, 8);
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
