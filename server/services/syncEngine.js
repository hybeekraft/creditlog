const fs = require('fs');
const path = require('path');
const resellerService = require('./resellerService');
const botDbBridge = require('./botDbBridge');
const { parseProductDetails } = require('./productParser');
let shared = null;
try {
  shared = require(path.resolve(__dirname, '../../shared.js'));
} catch (e) {}

// Determine persistent data directory
const isVercel = Boolean(process.env.VERCEL);
const candidateRoots = [process.cwd(), path.resolve(__dirname, '../..'), path.resolve(__dirname, '..')];
const ROOT_DIR = candidateRoots.find(dir => fs.existsSync(path.join(dir, 'index.html'))) || process.cwd();
const DATA_DIR = isVercel ? path.join('/tmp', 'creditlog-data') : path.join(ROOT_DIR, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.syncTimer = null;
    this.syncStatus = {
      lastSyncTime: null,
      lastStatus: 'idle',
      totalSupplierProducts: 0,
      newProductsAdded: 0,
      pricesUpdated: 0,
      stockUpdated: 0,
      outOfStockCount: 0,
      deactivatedMissing: 0,
      botDbSynchronized: false,
      error: null
    };
  }

  getSyncStatus() {
    return {
      ...this.syncStatus,
      isSyncing: this.isSyncing,
      botDbAvailable: botDbBridge.isAvailable()
    };
  }

  inferCategory(name = '', supplierCat = '') {
    const text = (name + ' ' + supplierCat).toLowerCase();
    if (text.includes('gpt') || text.includes('claude') || text.includes('gemini') || text.includes('ai') || text.includes('qwen') || text.includes('deepseek') || text.includes('grok') || text.includes('kimi') || text.includes('codex') || text.includes('cursor')) {
      return 'ai';
    }
    if (text.includes('canva') || text.includes('adobe') || text.includes('photoshop') || text.includes('figma') || text.includes('midjourney') || text.includes('design') || text.includes('autodesk') || text.includes('autocad')) {
      return 'design';
    }
    if (text.includes('netflix') || text.includes('spotify') || text.includes('youtube') || text.includes('prime') || text.includes('disney') || text.includes('hulu') || text.includes('apple music') || text.includes('music') || text.includes('game') || text.includes('xbox') || text.includes('playstation') || text.includes('steam') || text.includes('discord')) {
      return 'streaming';
    }
    if (text.includes('vpn') || text.includes('nord') || text.includes('express') || text.includes('surfshark') || text.includes('security')) {
      return 'security';
    }
    if (text.includes('office') || text.includes('word') || text.includes('excel') || text.includes('windows') || text.includes('duolingo') || text.includes('grammarly') || text.includes('notion') || text.includes('cursor') || text.includes('learning')) {
      return 'productivity';
    }
    return 'ai';
  }

  inferBrand(name = '') {
    const n = name.toLowerCase();
    if (n.includes('codex')) return 'Codex';
    if (n.includes('chatgpt') || n.includes('openai')) return 'ChatGPT';
    if (n.includes('claude') || n.includes('anthropic')) return 'Claude';
    if (n.includes('gemini') || n.includes('google') || n.includes('gmail')) return 'Gemini';
    if (n.includes('qwen')) return 'Qwen';
    if (n.includes('deepseek')) return 'DeepSeek';
    if (n.includes('grok') || n.includes('xai')) return 'xAI Grok';
    if (n.includes('canva')) return 'Canva';
    if (n.includes('adobe')) return 'Adobe';
    if (n.includes('netflix')) return 'Netflix';
    if (n.includes('spotify')) return 'Spotify';
    if (n.includes('youtube')) return 'YouTube';
    if (n.includes('duolingo')) return 'Duolingo';
    if (n.includes('cursor')) return 'Cursor';
    if (n.includes('elevenlabs')) return 'ElevenLabs';
    if (n.includes('autodesk') || n.includes('autocad')) return 'Autodesk';
    if (n.includes('capcut')) return 'CapCut';
    if (n.includes('kling')) return 'KlingAI';
    if (n.includes('gamma')) return 'Gamma';
    if (n.includes('proton')) return 'Proton VPN';
    if (n.includes('office') || n.includes('microsoft') || n.includes('o365')) return 'Microsoft';
    if (n.includes('xbox') || n.includes('bethesda') || n.includes('fallout') || n.includes('game pass') || n.includes('pc game')) return 'Xbox';
    if (n.includes('krea')) return 'KREA';
    if (n.includes('lovable') || n.includes('loveable')) return 'Lovable';
    if (n.includes('kimi')) return 'Kimi';
    if (n.includes('prime') || n.includes('amazon')) return 'Amazon';
    if (n.includes('apple') || n.includes('appletv')) return 'Apple TV+';
    if (n.includes('nordvpn')) return 'NordVPN';
    if (n.includes('expressvpn')) return 'ExpressVPN';
    if (n.includes('hma') || n.includes('hidemyass')) return 'HMA VPN';
    return name.split(' ')[0] || 'Digital Service';
  }

  normalizeBrand(brand = '') {
    if (!brand) return '';
    const b = String(brand).trim();
    const lower = b.toLowerCase();
    if (lower === 'amazon' || lower === 'amazon prime' || lower === 'amazon prime video' || lower === 'prime video' || lower === 'primevideo') {
      return 'Amazon';
    }
    if (lower === 'apple' || lower === 'apple tv' || lower === 'apple tv+' || lower === 'appletv' || lower === 'appletv+' || lower === 'apple tv plus') {
      return 'Apple TV+';
    }
    if (lower === 'gemini' || lower === 'google gemini' || lower === 'google ai' || lower === 'gmail' || lower === 'google') {
      return 'Gemini';
    }
    if (lower === 'hma' || lower === 'hma vpn' || lower === 'hidemyass' || lower === 'hidemyass vpn') {
      return 'HMA VPN';
    }
    if (lower === 'claude' || lower === 'anthropic' || lower === 'anthropic claude') {
      return 'Claude';
    }
    if (lower === 'capcut') {
      return 'CapCut';
    }
    if (lower === 'kling' || lower === 'kling ai' || lower === 'klingai') {
      return 'KlingAI';
    }
    if (lower === 'gamma' || lower === 'gamma ai') {
      return 'Gamma';
    }
    if (lower === 'proton' || lower === 'proton vpn' || lower === 'protonvpn') {
      return 'Proton VPN';
    }
    if (lower === 'microsoft' || lower === 'microsoft 365' || lower === 'o365' || lower === 'office 365' || lower === 'office365') {
      return 'Microsoft';
    }
    if (lower === 'xbox' || lower === 'bethesda' || lower === 'bethesda / xbox' || lower === 'bethesda xbox' || lower === 'pc' || lower === 'pc game' || lower === 'pc game pass' || lower === 'game pass' || lower.includes('bethesda') || lower.includes('xbox') || lower.includes('game pass') || lower.includes('pc game')) {
      return 'Xbox';
    }
    if (lower === 'krea' || lower === 'krea ai' || lower === 'kreaai') {
      return 'KREA';
    }
    if (lower === 'lovable' || lower === 'loveable') {
      return 'Lovable';
    }
    if (lower === 'kimi' || lower === 'api' || lower === 'api kimi' || lower === 'kimi api') {
      return 'Kimi';
    }
    if (lower === 'qwen' || lower === 'alibaba qwen' || lower === 'tongyi qwen') {
      return 'Qwen';
    }
    if (lower === 'codex' || lower === 'openai codex' || lower === 'codex api') {
      return 'Codex';
    }
    if (lower === 'chatgpt' || lower === 'openai chatgpt' || lower === 'openai' || lower === 'gpt') {
      return 'ChatGPT';
    }
    return b;
  }

  inferBrandClass(brand = '') {
    const b = brand.toLowerCase();
    if (b.includes('amazon') || b.includes('prime')) return 'tile-amazon';
    if (b.includes('apple')) return 'tile-appletv';
    if (b.includes('codex')) return 'tile-codex';
    if (b.includes('chatgpt') || b.includes('openai')) return 'tile-chatgpt';
    if (b.includes('claude') || b.includes('anthropic')) return 'tile-claude';
    if (b.includes('gemini') || b.includes('gmail')) return 'tile-gemini';
    if (b.includes('canva')) return 'tile-canva';
    if (b.includes('netflix')) return 'tile-netflix';
    if (b.includes('spotify')) return 'tile-spotify';
    if (b.includes('youtube')) return 'tile-youtube';
    if (b.includes('duolingo')) return 'tile-duolingo';
    if (b.includes('hma') || b.includes('hidemyass')) return 'tile-hma';
    if (b.includes('capcut')) return 'tile-capcut';
    if (b.includes('kling')) return 'tile-kling';
    if (b.includes('gamma')) return 'tile-gamma';
    if (b.includes('proton')) return 'tile-proton';
    if (b.includes('nordvpn')) return 'tile-nordvpn';
    if (b.includes('surfshark')) return 'tile-surfshark';
    if (b.includes('expressvpn')) return 'tile-expressvpn';
    if (b.includes('microsoft') || b.includes('office')) return 'tile-microsoft';
    if (b.includes('xbox') || b.includes('bethesda') || b.includes('fallout') || b.includes('game pass') || b.includes('pc game')) return 'tile-xbox';
    if (b.includes('krea')) return 'tile-krea';
    if (b.includes('adobe') || b.includes('photoshop')) return 'tile-adobe';
    if (b.includes('autodesk') || b.includes('autocad')) return 'tile-autodesk';
    if (b.includes('deepseek')) return 'tile-deepseek';
    if (b.includes('cursor')) return 'tile-cursor';
    if (b.includes('discord')) return 'tile-discord';
    if (b.includes('lovable') || b.includes('loveable')) return 'tile-lovable';
    if (b.includes('kimi')) return 'tile-kimi';
    if (b.includes('qwen')) return 'tile-qwen';
    return 'tile-brand-default';
  }

  inferIconType(brand = '') {
    const b = brand.toLowerCase();
    if (b.includes('amazon') || b.includes('prime')) return 'amazon';
    if (b.includes('apple')) return 'appletv';
    if (b.includes('codex')) return 'codex';
    if (b.includes('chatgpt') || b.includes('openai')) return 'chatgpt';
    if (b.includes('claude') || b.includes('anthropic')) return 'claude';
    if (b.includes('gemini') || b.includes('gmail')) return 'gemini';
    if (b.includes('canva')) return 'canva';
    if (b.includes('netflix')) return 'netflix';
    if (b.includes('spotify')) return 'spotify';
    if (b.includes('youtube')) return 'youtube';
    if (b.includes('duolingo')) return 'duolingo';
    if (b.includes('hma') || b.includes('hidemyass')) return 'hma';
    if (b.includes('capcut')) return 'capcut';
    if (b.includes('kling')) return 'kling';
    if (b.includes('gamma')) return 'gamma';
    if (b.includes('proton')) return 'proton';
    if (b.includes('nordvpn')) return 'nordvpn';
    if (b.includes('surfshark')) return 'surfshark';
    if (b.includes('expressvpn')) return 'expressvpn';
    if (b.includes('microsoft') || b.includes('office')) return 'microsoft';
    if (b.includes('xbox') || b.includes('bethesda') || b.includes('fallout') || b.includes('game pass') || b.includes('pc game')) return 'xbox';
    if (b.includes('krea')) return 'krea';
    if (b.includes('adobe') || b.includes('photoshop')) return 'adobe';
    if (b.includes('autodesk') || b.includes('autocad')) return 'autodesk';
    if (b.includes('deepseek')) return 'deepseek';
    if (b.includes('cursor')) return 'cursor';
    if (b.includes('discord')) return 'discord';
    if (b.includes('lovable') || b.includes('loveable')) return 'lovable';
    if (b.includes('kimi')) return 'kimi';
    if (b.includes('qwen')) return 'qwen';
    return 'cube';
  }

  inferDuration(name = '') {
    const match = name.match(/(\d+\s*(?:Month|Months|Year|Years|Day|Days|D|M|Y))/i);
    if (match) return match[1].replace(/(\d+)M/i, '$1 Months').replace(/(\d+)D/i, '$1 Days').replace(/(\d+)Y/i, '$1 Year');
    if (name.toLowerCase().includes('1m') || name.toLowerCase().includes('1 month')) return '1 Month';
    if (name.toLowerCase().includes('3m') || name.toLowerCase().includes('3 months')) return '3 Months';
    if (name.toLowerCase().includes('12m') || name.toLowerCase().includes('1 year')) return '1 Year';
    return 'Standard License';
  }

  /**
   * Main Synchronization Routine
   */
  async runCatalogSync() {
    if (this.isSyncing) {
      console.log('[SyncEngine] Sync already in progress, skipping duplicate invocation.');
      return this.syncStatus;
    }

    this.isSyncing = true;
    console.log('[SyncEngine] Starting full supplier & bot catalog synchronization...');

    try {
      // 1. Fetch live products from Wholesale Supplier API
      const supplierRes = await resellerService.getProducts();
      if (!supplierRes || !supplierRes.ok || !Array.isArray(supplierRes.products)) {
        throw new Error(supplierRes ? (supplierRes.message || supplierRes.error || 'Invalid supplier response') : 'No supplier response');
      }

      const supplierProducts = supplierRes.products;
      const activeSupplierIdSet = new Set(supplierProducts.map(p => String(p.id || p.productId).trim()));

      // 2. Load local products.json
      let localProducts = [];
      try {
        if (fs.existsSync(PRODUCTS_FILE)) {
          localProducts = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
        }
      } catch (err) {
        console.error('[SyncEngine] Error reading products.json:', err.message);
        localProducts = [];
      }

      let newCount = 0;
      let pricesCount = 0;
      let stockCount = 0;
      let outOfStockCount = 0;

      // 3. Process every supplier product
      for (const sp of supplierProducts) {
        const supplierId = String(sp.id || sp.productId).trim();
        const costUsd = parseFloat(sp.price || 0);
        const supplierStock = sp.stock !== undefined ? parseInt(sp.stock, 10) : 0;
        const isSupplierInStock = sp.inStock !== false && supplierStock > 0;

        // Pricing calculation (applying CreditLog's configured tiered markup)
        const pricing = sp.pricing || resellerService.calculatePricing(costUsd, supplierId, sp.category);
        const retailUsd = pricing.retailUsd;
        const parsed = parseProductDetails(sp.name, sp.description);

        if (!isSupplierInStock) {
          outOfStockCount++;
        }

        // Match in products.json
        let existing = localProducts.find(p => 
          (p.resellerProductId !== undefined && String(p.resellerProductId).trim() === supplierId) ||
          p.id === `sp_${supplierId}` ||
          (p.name && p.name.trim().toLowerCase() === sp.name.trim().toLowerCase())
        );

        if (existing) {
          // Check for price changes
          if (existing.wholesaleUsd !== costUsd || existing.usdPrice !== retailUsd) {
            existing.wholesaleUsd = costUsd;
            existing.usdPrice = retailUsd;
            existing.appliedMultiplier = pricing.multiplier;
            existing.pricingRule = pricing.ruleMatched;
            pricesCount++;
          }

          // Check for stock changes
          const prevAvailable = existing.availableStock;
          existing.totalStock = supplierStock;
          const reserved = existing.reservedStock || 0;
          existing.availableStock = Math.max(0, supplierStock - reserved);
          existing.inStock = isSupplierInStock && existing.availableStock > 0;
          if (prevAvailable !== existing.availableStock) {
            stockCount++;
          }

          // Synchronize rich seller details
          if (sp.description && sp.description.trim()) {
            existing.description = sp.description.trim();
          }
          existing.overview = parsed.overview || existing.overview;
          existing.deliveryFormat = parsed.deliveryFormat || existing.deliveryFormat;
          existing.deliveryType = sp.delivery_type || (parsed.deliveryFormat.includes('API') || parsed.deliveryFormat.includes('2FA') ? 'auto' : (existing.deliveryType || 'auto'));
          existing.importantRequirements = parsed.requirements || existing.importantRequirements;
          existing.requirements = parsed.requirements || existing.requirements;
          existing.instructions = parsed.instructions || existing.instructions;
          existing.warrantyPolicy = parsed.warranty || existing.warrantyPolicy;
          existing.hasSpecialRequirements = parsed.hasSpecialRequirements;

          existing.resellerProductId = Number(supplierId);
          existing.lastSynchronizedAt = new Date().toISOString();

          // Brand normalization
          if (existing.brand) {
            existing.brand = this.normalizeBrand(existing.brand);
            if (existing.brand === 'Amazon') {
              existing.brandClass = 'tile-amazon';
              existing.iconType = 'amazon';
            } else if (existing.brand === 'Apple TV+') {
              existing.brandClass = 'tile-appletv';
              existing.iconType = 'appletv';
            } else if (existing.brand === 'Gemini') {
              existing.brandClass = 'tile-gemini';
              existing.iconType = 'gemini';
            } else if (existing.brand === 'HMA VPN') {
              existing.brandClass = 'tile-hma';
              existing.iconType = 'hma';
            } else if (existing.brand === 'Claude') {
              existing.brandClass = 'tile-claude';
              existing.iconType = 'claude';
            } else if (existing.brand === 'CapCut') {
              existing.brandClass = 'tile-capcut';
              existing.iconType = 'capcut';
            } else if (existing.brand === 'KlingAI') {
              existing.brandClass = 'tile-kling';
              existing.iconType = 'kling';
            } else if (existing.brand === 'Gamma') {
              existing.brandClass = 'tile-gamma';
              existing.iconType = 'gamma';
            } else if (existing.brand === 'Proton VPN') {
              existing.brandClass = 'tile-proton';
              existing.iconType = 'proton';
            } else if (existing.brand === 'Microsoft') {
              existing.brandClass = 'tile-microsoft';
              existing.iconType = 'microsoft';
            } else if (existing.brand === 'Lovable') {
              existing.brandClass = 'tile-lovable';
              existing.iconType = 'lovable';
            } else if (existing.brand === 'Kimi') {
              existing.brandClass = 'tile-kimi';
              existing.iconType = 'kimi';
            } else if (existing.brand === 'Qwen') {
              existing.brandClass = 'tile-qwen';
              existing.iconType = 'qwen';
            } else if (existing.brand === 'Codex') {
              existing.brandClass = 'tile-codex';
              existing.iconType = 'codex';
            } else if (existing.brand === 'ChatGPT') {
              existing.brandClass = 'tile-chatgpt';
              existing.iconType = 'chatgpt';
            }
          }

          // Sync variant 0 if present
          if (existing.variants && existing.variants.length > 0) {
            existing.variants[0].wholesaleUsd = costUsd;
            existing.variants[0].usdPrice = retailUsd;
            existing.variants[0].totalStock = supplierStock;
            existing.variants[0].availableStock = existing.availableStock;
            existing.variants[0].inStock = existing.inStock;
            existing.variants[0].resellerProductId = Number(supplierId);
          }
        } else {
          // New product from supplier! Create and add to storefront
          const brand = this.normalizeBrand(this.inferBrand(sp.name));
          const category = this.inferCategory(sp.name, sp.category);
          const duration = this.inferDuration(sp.name);
          const slugId = `sp_${supplierId}_${sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.substring(0, 48);

          const newProduct = {
            id: slugId,
            name: sp.name,
            rawName: `${sp.name} · $${retailUsd.toFixed(2)}`,
            category,
            brand,
            duration,
            wholesaleUsd: costUsd,
            usdPrice: retailUsd,
            usdOldPrice: Number((retailUsd * 1.35).toFixed(2)),
            discount: '30% OFF',
            inStock: isSupplierInStock,
            rating: 4.9,
            reviews: '850+',
            brandClass: this.inferBrandClass(brand),
            iconType: this.inferIconType(brand),
            description: (sp.description || `${sp.name} with instant automated dispatch and 100% replacement warranty.`).trim(),
            overview: parsed.overview,
            deliveryFormat: parsed.deliveryFormat,
            deliveryType: sp.delivery_type || (parsed.deliveryFormat.includes('API') || parsed.deliveryFormat.includes('2FA') ? 'auto' : 'auto'),
            importantRequirements: parsed.requirements,
            requirements: parsed.requirements,
            instructions: parsed.instructions,
            warrantyPolicy: parsed.warranty,
            hasSpecialRequirements: parsed.hasSpecialRequirements,
            totalStock: supplierStock,
            reservedStock: 0,
            availableStock: supplierStock,
            enabled: true,
            resellerProductId: Number(supplierId),
            appliedMultiplier: pricing.multiplier,
            pricingRule: pricing.ruleMatched,
            botCategory: (shared && typeof shared.getProductCategory === 'function')
              ? shared.getProductCategory({ name: sp.name, brand, category, description: sp.description })
              : 'AI Tools',
            lastSynchronizedAt: new Date().toISOString(),
            variants: [
              {
                id: '1m',
                duration,
                wholesaleUsd: costUsd,
                usdPrice: retailUsd,
                totalStock: supplierStock,
                reservedStock: 0,
                availableStock: supplierStock,
                inStock: isSupplierInStock,
                resellerProductId: Number(supplierId)
              }
            ]
          };

          localProducts.push(newProduct);
          newCount++;
        }

        // 4. Synchronize into Telegram Bot SQLite database (store.db)
        if (botDbBridge.isAvailable()) {
          botDbBridge.upsertSupplierProduct({
            supplierProductId: supplierId,
            name: sp.name,
            description: sp.description,
            supplierPrice: costUsd,
            retailPriceUsd: retailUsd,
            stock: supplierStock,
            inStock: isSupplierInStock,
            category: sp.category || this.inferBrand(sp.name)
          });
        }
      }

      // 4.5 Synchronize all active products from Telegram Bot database (store.db)
      if (botDbBridge.isAvailable()) {
        try {
          const botProducts = botDbBridge.getAllProducts().filter(bp => bp.active === 1);
          for (const bp of botProducts) {
            const botPriceUsd = bp.price ? (bp.price / 100) : 5.00;
            const botCostUsd = bp.supplier_price ? (bp.supplier_price / 100) : (botPriceUsd * 0.7);
            const parsed = parseProductDetails(bp.name, bp.description);

            // Find match in localProducts
            let match = localProducts.find(p => 
              (p.botProductId && p.botProductId === bp.id) ||
              (bp.supplier_product_id && String(p.resellerProductId).trim() === String(bp.supplier_product_id).trim()) ||
              (p.name && p.name.trim().toLowerCase() === bp.name.trim().toLowerCase())
            );

            if (match) {
              match.botProductId = bp.id;
              if (!match.deliveryFormat || match.deliveryFormat === 'Direct Account Access') match.deliveryFormat = parsed.deliveryFormat;
              if (!match.importantRequirements) match.importantRequirements = parsed.requirements;
              if (!match.requirements) match.requirements = parsed.requirements;
              if (!match.instructions) match.instructions = parsed.instructions;
              if (!match.warrantyPolicy) match.warrantyPolicy = parsed.warranty;
              if (!match.overview) match.overview = parsed.overview;
              if (bp.description && (!match.description || match.description.length < bp.description.length)) {
                match.description = bp.description;
              }
              if (bp.category) {
                let cat = bp.category;
                if (cat === 'xAI Grok') cat = 'Grok';
                if (cat === 'DeepSeek AI') cat = 'DeepSeek API';
                if (cat === 'Airtable') cat = 'Office';
                if (cat === 'Duolingo') cat = 'Education';
                if (cat === 'Xbox') cat = 'Games';
                if (cat === 'Lovable') cat = 'AI Tools';
                if (cat === 'Snapchat') cat = 'Social';
                if (cat === 'Canva' || cat === 'Mobbin' || cat === 'Supercut' || cat === 'Muse') cat = 'Design';
                if (cat === 'Subscriptions') cat = 'AI Tools';
                if (shared && typeof shared.getProductCategory === 'function') {
                  match.botCategory = shared.getProductCategory({ ...match, botCategory: cat });
                } else {
                  match.botCategory = cat;
                }
              }
              if (match.brand) {
                match.brand = this.normalizeBrand(match.brand);
                if (match.brand === 'Amazon') {
                  match.brandClass = 'tile-amazon';
                  match.iconType = 'amazon';
                } else if (match.brand === 'Apple TV+') {
                  match.brandClass = 'tile-appletv';
                  match.iconType = 'appletv';
                } else if (match.brand === 'Gemini') {
                  match.brandClass = 'tile-gemini';
                  match.iconType = 'gemini';
                } else if (match.brand === 'HMA VPN') {
                  match.brandClass = 'tile-hma';
                  match.iconType = 'hma';
                } else if (match.brand === 'Claude') {
                  match.brandClass = 'tile-claude';
                  match.iconType = 'claude';
                } else if (match.brand === 'CapCut') {
                  match.brandClass = 'tile-capcut';
                  match.iconType = 'capcut';
                } else if (match.brand === 'KlingAI') {
                  match.brandClass = 'tile-kling';
                  match.iconType = 'kling';
                } else if (match.brand === 'Gamma') {
                  match.brandClass = 'tile-gamma';
                  match.iconType = 'gamma';
                } else if (match.brand === 'Proton VPN') {
                  match.brandClass = 'tile-proton';
                  match.iconType = 'proton';
                } else if (match.brand === 'Microsoft') {
                  match.brandClass = 'tile-microsoft';
                  match.iconType = 'microsoft';
                } else if (match.brand === 'Xbox') {
                  match.brandClass = 'tile-xbox';
                  match.iconType = 'xbox';
                } else if (match.brand === 'KREA') {
                  match.brandClass = 'tile-krea';
                  match.iconType = 'krea';
                } else if (match.brand === 'Adobe') {
                  match.brandClass = 'tile-adobe';
                  match.iconType = 'adobe';
                } else if (match.brand === 'Autodesk') {
                  match.brandClass = 'tile-autodesk';
                  match.iconType = 'autodesk';
                } else if (match.brand === 'DeepSeek API' || match.brand === 'DeepSeek') {
                  match.brandClass = 'tile-deepseek';
                  match.iconType = 'deepseek';
                } else if (match.brand === 'Cursor API' || match.brand === 'Cursor') {
                  match.brandClass = 'tile-cursor';
                  match.iconType = 'cursor';
                } else if (match.brand === 'Discord') {
                  match.brandClass = 'tile-discord';
                  match.iconType = 'discord';
                } else if (match.brand === 'Lovable') {
                  match.brandClass = 'tile-lovable';
                  match.iconType = 'lovable';
                } else if (match.brand === 'Kimi') {
                  match.brandClass = 'tile-kimi';
                  match.iconType = 'kimi';
                } else if (match.brand === 'Qwen') {
                  match.brandClass = 'tile-qwen';
                  match.iconType = 'qwen';
                } else if (match.brand === 'Codex') {
                  match.brandClass = 'tile-codex';
                  match.iconType = 'codex';
                } else if (match.brand === 'ChatGPT') {
                  match.brandClass = 'tile-chatgpt';
                  match.iconType = 'chatgpt';
                }
              }
            } else {
              // Add missing active bot product to storefront catalog
              const brand = this.normalizeBrand(this.inferBrand(bp.name));
              const category = this.inferCategory(bp.name, bp.category);
              let botCat = bp.category;
              if (botCat === 'xAI Grok') botCat = 'Grok';
              if (botCat === 'DeepSeek AI') botCat = 'DeepSeek API';
              if (botCat === 'Airtable') botCat = 'Office';
              const duration = this.inferDuration(bp.name);
              const slugId = `bot_${bp.id}_${bp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.substring(0, 48);

              const botStock = bp.supplier_stock !== null && bp.supplier_stock !== undefined ? bp.supplier_stock : 10;
              const newProd = {
                id: slugId,
                botProductId: bp.id,
                name: bp.name,
                rawName: `${bp.name} · $${botPriceUsd.toFixed(2)}`,
                category,
                botCategory: botCat,
                brand,
                duration,
                wholesaleUsd: botCostUsd,
                usdPrice: botPriceUsd,
                usdOldPrice: Number((botPriceUsd * 1.35).toFixed(2)),
                discount: '25% OFF',
                inStock: bp.active === 1 && botStock > 0,
                rating: 4.9,
                reviews: '920+',
                brandClass: this.inferBrandClass(brand),
                iconType: this.inferIconType(brand),
                description: bp.description || `Premium digital access for ${bp.name}.`,
                overview: parsed.overview,
                deliveryFormat: parsed.deliveryFormat,
                deliveryType: bp.delivery_type || 'auto',
                importantRequirements: parsed.requirements,
                requirements: parsed.requirements,
                instructions: parsed.instructions,
                warrantyPolicy: parsed.warranty,
                hasSpecialRequirements: parsed.hasSpecialRequirements,
                totalStock: botStock,
                reservedStock: 0,
                availableStock: botStock,
                enabled: true,
                resellerProductId: bp.supplier_product_id ? Number(bp.supplier_product_id) : null,
                appliedMultiplier: 1.45,
                pricingRule: 'Bot Store DB',
                lastSynchronizedAt: new Date().toISOString(),
                variants: [
                  {
                    id: '1m',
                    duration,
                    wholesaleUsd: botCostUsd,
                    usdPrice: botPriceUsd,
                    totalStock: botStock,
                    reservedStock: 0,
                    availableStock: botStock,
                    inStock: bp.active === 1 && botStock > 0,
                    resellerProductId: bp.supplier_product_id ? Number(bp.supplier_product_id) : null
                  }
                ]
              };
              localProducts.push(newProd);
              newCount++;
            }
          }
        } catch (botSyncErr) {
          console.warn('[SyncEngine] Error merging bot products:', botSyncErr.message);
        }
      }

      // 5. Detect and deactivate missing/retired supplier products (only if supplier returned a full catalog)
      let deactivatedCount = 0;
      if (supplierProducts.length >= 20) {
        for (const p of localProducts) {
          if (p.resellerProductId !== undefined && p.resellerProductId !== null) {
            const sId = String(p.resellerProductId).trim();
            if (!activeSupplierIdSet.has(sId)) {
              p.inStock = false;
              p.totalStock = 0;
              p.availableStock = 0;
              p.enabled = false;
              p.retiredBySupplier = true;
              deactivatedCount++;
            }
          }
        }
      }

      if (botDbBridge.isAvailable()) {
        botDbBridge.deactivateMissingSupplierProducts(activeSupplierIdSet);
      }

      // 6. Save updated catalog to products.json
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(localProducts, null, 2), 'utf8');

      this.syncStatus = {
        lastSyncTime: new Date().toISOString(),
        lastStatus: 'success',
        totalSupplierProducts: supplierProducts.length,
        totalLocalProducts: localProducts.length,
        newProductsAdded: newCount,
        pricesUpdated: pricesCount,
        stockUpdated: stockCount,
        outOfStockCount,
        deactivatedMissing: deactivatedCount,
        botDbSynchronized: botDbBridge.isAvailable(),
        error: null
      };

      console.log(`[SyncEngine] Sync complete: ${supplierProducts.length} supplier items, ${newCount} added, ${pricesCount} price changes, ${stockCount} stock updates, ${outOfStockCount} out-of-stock. Bot DB synced: ${botDbBridge.isAvailable()}`);
      return this.syncStatus;
    } catch (err) {
      console.error('[SyncEngine] Sync failed:', err.message);
      this.syncStatus.lastStatus = 'failed';
      this.syncStatus.error = err.message;
      return this.syncStatus;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Start scheduled periodic polling every X minutes
   */
  startPeriodicSync(intervalMinutes = 15) {
    if (this.syncTimer) clearInterval(this.syncTimer);
    const ms = Math.max(1, intervalMinutes) * 60 * 1000;
    console.log(`[SyncEngine] Scheduled continuous supplier sync every ${intervalMinutes} minutes.`);

    // Run first sync shortly after boot (e.g. 2 seconds)
    this.initialSyncTimer = setTimeout(() => {
      this.runCatalogSync().catch(e => console.error('[SyncEngine] Initial sync error:', e));
    }, 2000);
    if (this.initialSyncTimer && typeof this.initialSyncTimer.unref === 'function') {
      this.initialSyncTimer.unref();
    }

    this.syncTimer = setInterval(() => {
      this.runCatalogSync().catch(e => console.error('[SyncEngine] Interval sync error:', e));
    }, ms);
    if (this.syncTimer && typeof this.syncTimer.unref === 'function') {
      this.syncTimer.unref();
    }
  }

  stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.initialSyncTimer) {
      clearTimeout(this.initialSyncTimer);
      this.initialSyncTimer = null;
    }
  }
}

module.exports = new SyncEngine();
