const fs = require('fs');
const path = require('path');

let DatabaseSync = null;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (e) {
  console.warn('[BotDbBridge] node:sqlite not available on this runtime.');
}

class BotDbBridge {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.init();
  }

  init() {
    if (!DatabaseSync) return false;

    const candidatePaths = [
      path.resolve(__dirname, '../../../creditlog_bot/store.db'),
      path.resolve(__dirname, '../../creditlog_bot/store.db'),
      path.resolve(__dirname, '../creditlog_bot/store.db'),
      'C:/Users/DELL/creditlog_bot/store.db'
    ];

    const found = candidatePaths.find(p => {
      try {
        return fs.existsSync(p);
      } catch (e) {
        return false;
      }
    });

    if (found) {
      this.dbPath = found;
      try {
        this.db = new DatabaseSync(this.dbPath);
        console.log(`[BotDbBridge] Connected to Telegram Bot database at: ${this.dbPath}`);
        return true;
      } catch (err) {
        console.error('[BotDbBridge] Failed to open SQLite store.db:', err.message);
        this.db = null;
        return false;
      }
    } else {
      console.log('[BotDbBridge] Local Telegram Bot database store.db not detected (operating in standalone/cloud mode).');
      return false;
    }
  }

  isAvailable() {
    return Boolean(this.db);
  }

  getUsdToNgnRate() {
    if (!this.isAvailable()) return null;
    try {
      const row = this.db.prepare("SELECT value FROM settings WHERE key = 'usd_ngn_rate'").get();
      if (row && row.value) {
        const rate = parseFloat(row.value);
        if (!isNaN(rate) && rate > 0) return rate;
      }
    } catch (e) {
      console.warn('[BotDbBridge] Error reading usd_ngn_rate:', e.message);
    }
    return null;
  }

  getAllProducts() {
    if (!this.isAvailable()) return [];
    try {
      return this.db.prepare("SELECT * FROM products").all();
    } catch (e) {
      console.warn('[BotDbBridge] Error reading products:', e.message);
      return [];
    }
  }

  findProductBySupplierId(supplierProductId) {
    if (!this.isAvailable() || !supplierProductId) return null;
    try {
      return this.db.prepare("SELECT * FROM products WHERE supplier_product_id = ?").get(String(supplierProductId).trim());
    } catch (e) {
      console.warn('[BotDbBridge] Error finding product by supplier ID:', e.message);
      return null;
    }
  }

  /**
   * Synchronize or upsert a supplier product into store.db products table
   * @param {Object} item - Normalized supplier product details
   */
  upsertSupplierProduct(item) {
    if (!this.isAvailable()) return { success: false, reason: 'db_unavailable' };

    const supplierId = String(item.supplierProductId || item.id || '').trim();
    if (!supplierId) return { success: false, reason: 'no_supplier_id' };

    const name = (item.name || item.title || `Product #${supplierId}`).trim();
    const description = (item.description || '').trim();
    const supplierCostUsd = parseFloat(item.supplierPrice || item.price || 0);
    const supplierCostCents = Math.round(supplierCostUsd * 100);

    const retailPriceUsd = parseFloat(item.retailPriceUsd || (supplierCostUsd * 1.45));
    const retailPriceCents = Math.round(retailPriceUsd * 100);

    const supplierStock = item.stock !== undefined ? parseInt(item.stock, 10) : null;
    const isActive = (item.inStock !== false && (supplierStock === null || supplierStock > 0)) ? 1 : 0;
    const category = item.category || 'AI Tools';
    const autoFulfill = 1;

    try {
      const existing = this.db.prepare("SELECT * FROM products WHERE supplier_product_id = ?").get(supplierId);

      if (existing) {
        // Update existing record
        const stmt = this.db.prepare(`
          UPDATE products 
          SET name = ?, description = ?, price = ?, supplier_price = ?, supplier_stock = ?, active = ?, auto_fulfill = 1
          WHERE id = ?
        `);
        stmt.run(name, description, retailPriceCents, supplierCostCents, supplierStock, isActive, existing.id);
        return { success: true, action: 'updated', botId: existing.id, supplierId };
      } else {
        // Insert new product
        const stmt = this.db.prepare(`
          INSERT INTO products (name, description, price, active, supplier_product_id, supplier_price, auto_fulfill, category, supplier, supplier_stock, delivery_type, fixed_price)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'default', ?, 'auto', 0)
        `);
        const result = stmt.run(name, description, retailPriceCents, isActive, supplierId, supplierCostCents, category, supplierStock);
        return { success: true, action: 'inserted', botId: result.lastInsertRowid, supplierId };
      }
    } catch (err) {
      console.error(`[BotDbBridge] Error upserting product ${supplierId}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Mark products absent from the supplier catalog as inactive in store.db
   */
  deactivateMissingSupplierProducts(activeSupplierIdSet) {
    if (!this.isAvailable()) return 0;
    try {
      const mappedProducts = this.db.prepare("SELECT id, supplier_product_id FROM products WHERE supplier_product_id IS NOT NULL").all();
      let count = 0;
      const updateStmt = this.db.prepare("UPDATE products SET active = 0, supplier_stock = 0 WHERE id = ?");

      for (const prod of mappedProducts) {
        if (!activeSupplierIdSet.has(String(prod.supplier_product_id).trim())) {
          updateStmt.run(prod.id);
          count++;
        }
      }
      return count;
    } catch (e) {
      console.warn('[BotDbBridge] Error deactivating missing products:', e.message);
      return 0;
    }
  }

  /**
   * Record a verified storefront order into store.db orders table for unified transaction records
   */
  recordOrder(orderData) {
    if (!this.isAvailable()) return null;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO orders (user_id, product_id, product_name, price, quantity, payload, refunded, supplier_order_id, status, created, invoice_id, supplier, payment_method, txid, expected_amount)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const userId = 0; // 0 denotes storefront guest purchase
      const productId = orderData.botProductId || null;
      const productName = orderData.productName || orderData.product || 'Digital Subscription';
      const priceCents = Math.round((parseFloat(orderData.totalUsd || orderData.usdPrice || 0)) * 100);
      const quantity = Math.max(1, parseInt(orderData.quantity || 1, 10));
      const payload = orderData.deliveredValue || (orderData.credentials ? (orderData.credentials.value || orderData.credentials.account) : '') || '';
      const supplierOrderId = orderData.supplierOrderCode || null;
      const status = orderData.status === 'Delivered' ? 'completed' : (orderData.status || 'pending').toLowerCase();
      const created = orderData.paidAt || new Date().toISOString();
      const invoiceId = orderData.id || ('#CL-' + Date.now());
      const supplier = 'geminipro';
      const paymentMethod = orderData.gateway || 'Paystack';
      const txid = orderData.reference || null;
      const expectedAmount = String(orderData.totalNgn || orderData.price || '');

      const result = stmt.run(
        userId,
        productId,
        productName,
        priceCents,
        quantity,
        payload,
        supplierOrderId,
        status,
        created,
        invoiceId,
        supplier,
        paymentMethod,
        txid,
        expectedAmount
      );

      console.log(`[BotDbBridge] Recorded order in store.db (ID: ${result.lastInsertRowid}, Invoice: ${invoiceId})`);
      return result.lastInsertRowid;
    } catch (err) {
      console.error('[BotDbBridge] Failed to record order in store.db:', err.message);
      return null;
    }
  }
}

module.exports = new BotDbBridge();
