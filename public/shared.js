/* ==========================================================================
   CreditLog — Shared Data, Digital Subscriptions Inventory & Multi-Currency System
   ========================================================================== */

// --- User Authentication & Session State ---
function getCurrentUser() {
  const sessionStr = localStorage.getItem('creditlog_session');
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch (e) {
    return null;
  }
}

function guardAdminPage() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith('admin.html') || path.endsWith('admin-dashboard.html') || path.endsWith('activity-logs.html') || path.endsWith('inventory.html')) {
    const user = getCurrentUser();
    if (!user || !user.role || user.role.toLowerCase() !== 'admin') {
      sessionStorage.setItem('auth_redirect_msg', 'Access restricted: Admin panel is only accessible to store administrators.');
      window.location.href = 'index.html';
      return false;
    }
  }
  return true;
}
guardAdminPage();

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem('creditlog_session');
  } else {
    localStorage.setItem('creditlog_session', JSON.stringify(user));
  }
  renderHeaderAuth();
}

function logoutUser() {
  localStorage.removeItem('creditlog_session');
  localStorage.removeItem('creditlog_admin_token');
  showToast('Signed out successfully.');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 400);
}

function renderHeaderAuth() {
  const actions = document.querySelector('.site-header .header-actions');
  if (!actions) return;

  const user = getCurrentUser();
  const existingAuthWrap = document.getElementById('headerAuthContainer');

  const authHtml = (user && user.role && user.role.toLowerCase() === 'admin') ? `
    <div class="user-profile-menu" id="headerAuthContainer">
      <button class="user-avatar-btn" id="userMenuBtn" onclick="toggleUserDropdown()" title="${user.name}">
        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="${user.name}" class="avatar-img">
      </button>
      <div class="user-dropdown hidden" id="userDropdown">
        <div class="user-dropdown-header">
          <span class="user-name">${user.name}</span>
          <span class="user-role">${user.role}</span>
        </div>
        <div class="dropdown-divider"></div>
        <a href="inventory.html" style="display: flex; align-items: center; gap: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <span>Inventory & CMS</span>
        </a>
        <a href="admin.html" style="display: flex; align-items: center; gap: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Admin Analytics</span>
        </a>
        <a href="activity-logs.html" style="display: flex; align-items: center; gap: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>Activity Logs</span>
        </a>
        <div class="dropdown-divider"></div>
        <a href="javascript:void(0)" onclick="logoutUser()" style="display: flex; align-items: center; gap: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Sign Out</span>
        </a>
      </div>
    </div>
  ` : `
    <div class="header-guest-actions" id="headerAuthContainer"></div>
  `;

  if (existingAuthWrap) {
    existingAuthWrap.outerHTML = authHtml;
  } else {
    const staticMenu = actions.querySelector('.user-profile-menu');
    if (staticMenu) {
      staticMenu.outerHTML = authHtml;
    } else {
      actions.appendChild(document.createRange().createContextualFragment(authHtml));
    }
  }

  // Remove obsolete links from desktop navigation
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    const text = link.textContent.trim().toLowerCase();
    if (href.includes('track') || text.includes('track') || href.includes('wallet') || text.includes('wallet') || href.includes('dashboard') || text.includes('dashboard') || href.includes('signin') || href.includes('signup') || text === 'cart' || text.includes('cart') || href.includes('checkout')) {
      link.remove();
    }
  });
}

// --- Active Exchange Rate (1 USD = ₦1,500) ---
const USD_TO_NGN_RATE = 1500;

// --- Authoritative Currency & Pricing Formatter (NGN Naira) ---
function getCurrency() {
  return 'NGN';
}

function setCurrency() {
  // Currency changing removed completely
}

function toggleCurrency() {
  // Currency changing removed completely
}

function formatPrice(usdVal) {
  const num = Number(usdVal) || 0;
  return '₦' + Math.round(num * USD_TO_NGN_RATE).toLocaleString('en-US');
}

function formatDualPrice(usdVal) {
  return formatPrice(usdVal);
}

// Backward compatible formatter
function formatNaira(val) {
  return '₦' + Number(val).toLocaleString('en-US');
}

function updateCurrencyUI() {
  // Obsolete - currency switchers removed
}

// --- Stock Status Badges Helper ---
function renderStockBadge(inStock) {
  if (inStock) {
    return `<span class="stock-badge in-stock"><span class="badge-dot in-stock-dot"></span>In Stock</span>`;
  }
  return `<span class="stock-badge out-of-stock"><span class="badge-dot out-stock-dot"></span>Sold Out</span>`;
}

// Universal Apple Pro Brand Icon Renderer
function renderBrandIcon(prod) {
  if (!prod) {
    return `<div class="directory-icon-box" style="background: #1E293B; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/></svg></div>`;
  }
  const name = (prod.name || '').toLowerCase();
  const brand = (prod.brand || '').toLowerCase();
  const cat = (prod.category || '').toLowerCase();

  if (name.includes('netflix') || brand.includes('netflix')) {
    return `<div class="directory-icon-box" style="background: linear-gradient(135deg, #E50914, #990000); color: #fff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(229, 9, 20, 0.35);">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2h4.5l5.5 13.5V2H18v20h-4.5L8 8.5V22H4V2z"/></svg>
    </div>`;
  }
  if (name.includes('gemini') || name.includes('google') || brand.includes('gemini')) {
    return `<div class="directory-icon-box" style="background: linear-gradient(135deg, #1A73E8, #8E24AA); color: #fff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(26, 115, 232, 0.35);">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>
    </div>`;
  }
  if (name.includes('chatgpt') || name.includes('openai') || brand.includes('openai')) {
    return `<div class="directory-icon-box" style="background: linear-gradient(135deg, #10A37F, #0E8064); color: #fff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(16, 163, 127, 0.35);">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="2"/></svg>
    </div>`;
  }
  if (name.includes('claude') || brand.includes('anthropic') || brand.includes('claude')) {
    return `<div class="directory-icon-box" style="background: linear-gradient(135deg, #D97706, #B45309); color: #fff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z"/></svg>
    </div>`;
  }
  if (name.includes('spotify') || brand.includes('spotify')) {
    return `<div class="directory-icon-box" style="background: linear-gradient(135deg, #1DB954, #15883e); color: #fff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(29, 185, 84, 0.35);">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.58 14.42a.75.75 0 01-1.04.24c-2.85-1.74-6.44-2.14-10.67-1.17a.75.75 0 11-.34-1.46c4.63-1.06 8.62-.61 11.81 1.34a.75.75 0 01.24 1.05zm1.5-3.34a.94.94 0 01-1.3.31c-3.26-2-8.23-2.58-12.08-1.41a.94.94 0 11-.55-1.79c4.4-1.34 9.9-.69 13.62 1.6a.94.94 0 01.31 1.29zm.13-3.48c-3.9-2.32-10.35-2.53-14.07-1.4a1.13 1.13 0 11-.66-2.16c4.28-1.3 11.41-1.06 15.9 1.6a1.13 1.13 0 01-1.17 1.96z"/></svg>
    </div>`;
  }
  if (name.includes('canva') || brand.includes('canva')) {
    return `<div class="directory-icon-box" style="background: linear-gradient(135deg, #00C4CC, #7D2AE8); color: #fff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0, 196, 204, 0.35); font-weight: 900; font-size: 20px;">
      <span>C</span>
    </div>`;
  }
  if (name.includes('microsoft') || name.includes('o365') || brand.includes('microsoft')) {
    return `<div class="directory-icon-box" style="background: linear-gradient(135deg, #0078D4, #106EBE); color: #fff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0, 120, 212, 0.35);">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M1 1h10v10H1zM13 1h10v10H13zM1 13h10v10H1zM13 13h10v10H13z"/></svg>
    </div>`;
  }
  if (name.includes('vpn') || cat === 'security') {
    return `<div class="directory-icon-box" style="background: linear-gradient(135deg, #0EA5E9, #2563EB); color: #fff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
    </div>`;
  }
  return `<div class="directory-icon-box" style="background: linear-gradient(135deg, #1E293B, #0F172A); border: 1px solid rgba(255, 255, 255, 0.1); color: #38BDF8; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>
  </div>`;
}

// --- FULL SUBSCRIPTIONS CATALOG (All 93 Verified Items) ---
var CATALOG_PRODUCTS = [
  {
    "id": "google-gemini-3m",
    "name": "Google AI Pro Gemini 3M",
    "rawName": "Google AI Pro Gemini 3M · $6.97",
    "category": "ai",
    "brand": "Google Gemini",
    "duration": "3 Months",
    "usdPrice": 6.97,
    "usdOldPrice": 19.99,
    "discount": "65% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.2k",
    "brandClass": "tile-gemini",
    "iconType": "gemini",
    "description": "Google AI Pro Gemini Advanced with 2M context window, Gemini 1.5 Pro, and deep Google Workspace integration.",
    "currPrice": 10455,
    "oldPrice": 29985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"30\" height=\"30\" fill=\"none\"><path d=\"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z\" fill=\"#3186FF\"/><path d=\"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z\" fill=\"url(#gemGrad1)\"/><path d=\"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z\" fill=\"url(#gemGrad2)\"/><path d=\"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z\" fill=\"url(#gemGrad3)\"/><defs><linearGradient gradientUnits=\"userSpaceOnUse\" id=\"gemGrad1\" x1=\"7\" x2=\"11\" y1=\"15.5\" y2=\"12\"><stop stop-color=\"#08B962\"/><stop offset=\"1\" stop-color=\"#08B962\" stop-opacity=\"0\"/></linearGradient><linearGradient gradientUnits=\"userSpaceOnUse\" id=\"gemGrad2\" x1=\"8\" x2=\"11.5\" y1=\"5.5\" y2=\"11\"><stop stop-color=\"#F94543\"/><stop offset=\"1\" stop-color=\"#F94543\" stop-opacity=\"0\"/></linearGradient><linearGradient gradientUnits=\"userSpaceOnUse\" id=\"gemGrad3\" x1=\"3.5\" x2=\"17.5\" y1=\"13.5\" y2=\"12\"><stop stop-color=\"#FABC12\"/><stop offset=\".46\" stop-color=\"#FABC12\" stop-opacity=\"0\"/></linearGradient></defs></svg>",
    "plans": [
      {
        "duration": "3 Months",
        "usdPrice": 6.97,
        "usdOldPrice": 19.99,
        "price": 10455,
        "oldPrice": 29985,
        "discount": "65% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "hma-vpn-30d",
    "name": "HMA VPN 20-30 Days",
    "rawName": "HMA VPN 20-30 Days · $2.50",
    "category": "security",
    "brand": "HMA VPN",
    "duration": "20-30 Days",
    "usdPrice": 2.5,
    "usdOldPrice": 9.99,
    "discount": "75% OFF",
    "inStock": true,
    "rating": 4.6,
    "reviews": "420",
    "brandClass": "tile-vpn",
    "iconType": "vpn",
    "description": "HideMyAss VPN premium license with global high-speed servers and lightning fast encryption.",
    "currPrice": 3750,
    "oldPrice": 14985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#0084FF\"><path d=\"M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z\"/></svg>",
    "plans": [
      {
        "duration": "20-30 Days",
        "usdPrice": 2.5,
        "usdOldPrice": 9.99,
        "price": 3750,
        "oldPrice": 14985,
        "discount": "75% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "o365-ready-account",
    "name": "O365 Ready Account Random 6-12M",
    "rawName": "O365 Ready Account Random 6-12M · $4.00",
    "category": "productivity",
    "brand": "Microsoft 365",
    "duration": "6-12 Months",
    "usdPrice": 4,
    "usdOldPrice": 15,
    "discount": "73% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "980",
    "brandClass": "tile-microsoft",
    "iconType": "microsoft",
    "description": "Instant ready-to-use Microsoft Office 365 account with 1TB OneDrive cloud storage & desktop apps.",
    "currPrice": 6000,
    "oldPrice": 22500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\"><path fill=\"#F25022\" d=\"M1 1h10v10H1z\"/><path fill=\"#7FBA00\" d=\"M13 1h10v10H13z\"/><path fill=\"#00A4EF\" d=\"M1 13h10v10H1z\"/><path fill=\"#FFB900\" d=\"M13 13h10v10H13z\"/></svg>",
    "plans": [
      {
        "duration": "6-12 Months",
        "usdPrice": 4,
        "usdOldPrice": 15,
        "price": 6000,
        "oldPrice": 22500,
        "discount": "73% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "microsoft-365-family-5u",
    "name": "Microsoft 365 Family 5U 12M",
    "rawName": "Microsoft 365 Family 5U 12M · $12.00",
    "category": "productivity",
    "brand": "Microsoft 365",
    "duration": "12 Months (5 Users)",
    "usdPrice": 12,
    "usdOldPrice": 99.99,
    "discount": "88% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.5k",
    "brandClass": "tile-microsoft",
    "iconType": "microsoft",
    "description": "Full Microsoft 365 Family subscription for up to 5 user slots with Word, Excel, PowerPoint & 1TB per user.",
    "currPrice": 18000,
    "oldPrice": 149985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\"><path fill=\"#F25022\" d=\"M1 1h10v10H1z\"/><path fill=\"#7FBA00\" d=\"M13 1h10v10H13z\"/><path fill=\"#00A4EF\" d=\"M1 13h10v10H1z\"/><path fill=\"#FFB900\" d=\"M13 13h10v10H13z\"/></svg>",
    "plans": [
      {
        "duration": "12 Months (5 Users)",
        "usdPrice": 12,
        "usdOldPrice": 99.99,
        "price": 18000,
        "oldPrice": 149985,
        "discount": "88% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "capcut-pro-7d",
    "name": "CapCut Pro 7 Days",
    "rawName": "CapCut Pro 7 Days · $0.50",
    "category": "design",
    "brand": "CapCut",
    "duration": "7 Days",
    "usdPrice": 0.5,
    "usdOldPrice": 2.99,
    "discount": "83% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "3.4k",
    "brandClass": "tile-capcut",
    "iconType": "capcut",
    "description": "CapCut Pro quick pass: Unlock all VIP effects, filters, captions, and 4K 60fps export for 7 days.",
    "currPrice": 750,
    "oldPrice": 4485,
    "brandSymbol": "<svg viewBox=\"0 0 192 192\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"#FFFFFF\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"16\"><path d=\"M170 42 22 124v14a12 12 0 0 0 12 12h78a12 12 0 0 0 12-12v-9.5\"/><path d=\"M170 150 22 68V54a12 12 0 0 1 12-12h78a12 12 0 0 1 12 12v9.5\"/></svg>",
    "plans": [
      {
        "duration": "7 Days",
        "usdPrice": 0.5,
        "usdOldPrice": 2.99,
        "price": 750,
        "oldPrice": 4485,
        "discount": "83% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "lovable-pro-lite-1y",
    "name": "Lovable Pro Lite 1 Year Link",
    "rawName": "Lovable Pro Lite 1 Year Link · $12.00",
    "category": "ai",
    "brand": "Lovable",
    "duration": "1 Year",
    "usdPrice": 12,
    "usdOldPrice": 48,
    "discount": "75% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "810",
    "brandClass": "tile-lovable",
    "iconType": "lovable",
    "description": "Build full-stack apps effortlessly with Lovable Pro Lite 1 Year activation invite link.",
    "currPrice": 18000,
    "oldPrice": 72000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M7.082 0c3.91 0 7.081 3.179 7.081 7.1v2.7h2.357c3.91 0 7.082 3.178 7.082 7.1 0 3.923-3.17 7.1-7.082 7.1H0V7.1C0 3.18 3.17 0 7.082 0z\" fill=\"url(#lovableGrad)\"/><defs><linearGradient id=\"lovableGrad\" x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0%\" stop-color=\"#FF5E62\"/><stop offset=\"50%\" stop-color=\"#FF66F4\"/><stop offset=\"100%\" stop-color=\"#4B73FF\"/></linearGradient></defs></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 12,
        "usdOldPrice": 48,
        "price": 18000,
        "oldPrice": 72000,
        "discount": "75% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "capcut-pro-team-1m",
    "name": "CapCut Pro Team 1M",
    "rawName": "CapCut Pro Team 1M · $2.60",
    "category": "design",
    "brand": "CapCut",
    "duration": "1 Month (Team)",
    "usdPrice": 2.6,
    "usdOldPrice": 9.99,
    "discount": "74% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "1.1k",
    "brandClass": "tile-capcut",
    "iconType": "capcut",
    "description": "CapCut Pro Team plan with collaborative editing, cloud storage, and shared media assets.",
    "currPrice": 3900,
    "oldPrice": 14985,
    "brandSymbol": "<svg viewBox=\"0 0 192 192\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"#FFFFFF\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"16\"><path d=\"M170 42 22 124v14a12 12 0 0 0 12 12h78a12 12 0 0 0 12-12v-9.5\"/><path d=\"M170 150 22 68V54a12 12 0 0 1 12-12h78a12 12 0 0 1 12 12v9.5\"/></svg>",
    "plans": [
      {
        "duration": "1 Month (Team)",
        "usdPrice": 2.6,
        "usdOldPrice": 9.99,
        "price": 3900,
        "oldPrice": 14985,
        "discount": "74% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "duolingo-super-12m",
    "name": "Duolingo Super 12M",
    "rawName": "Duolingo Super 12M · $1.00",
    "category": "learning",
    "brand": "Duolingo",
    "duration": "12 Months",
    "usdPrice": 1,
    "usdOldPrice": 83.99,
    "discount": "98% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "2.8k",
    "brandClass": "tile-duolingo",
    "iconType": "duolingo",
    "description": "Duolingo Super 1 Full Year: Unlimited hearts, no advertisements, personalized practice, and offline lessons.",
    "currPrice": 1500,
    "oldPrice": 125985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#58CC02\"><path d=\"M14.484 18.213c1.142 1.033 2.657 1.662 4.316 1.662l.294-.001c1.985-.038 3.749-.9 4.906-2.454.004-.006.012-.016.016-.022a1.36 1.36 0 0 0 .163-.357c.075-.276.016-.549-.163-.746a.78.78 0 0 0-.585-.251c-.244 0-.482.115-.653.315-.884 1.188-2.227 1.848-3.738 1.876l-.239.001c-1.272 0-2.433-.483-3.311-1.277a.78.78 0 0 0-.52-.204.77.77 0 0 0-.555.234.78.78 0 0 0 .07 1.248M7.818 10.742c-.93 0-1.688.758-1.688 1.688s.758 1.688 1.688 1.688 1.688-.758 1.688-1.688-.758-1.688-1.688-1.688m8.364 0c-.93 0-1.688.758-1.688 1.688s.758 1.688 1.688 1.688 1.688-.758 1.688-1.688-.758-1.688-1.688-1.688M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12c.571 0 1.13-.042 1.68-.12a9.63 9.63 0 0 1-.48-3.03c0-3.32 1.7-6.24 4.28-7.96C17.06 1.25 14.67 0 12 0\"/></svg>",
    "plans": [
      {
        "duration": "12 Months",
        "usdPrice": 1,
        "usdOldPrice": 83.99,
        "price": 1500,
        "oldPrice": 125985,
        "discount": "98% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "duolingo-super-2m",
    "name": "Duolingo Super 2M",
    "rawName": "Duolingo Super 2M · $0.50",
    "category": "learning",
    "brand": "Duolingo",
    "duration": "2 Months",
    "usdPrice": 0.5,
    "usdOldPrice": 14,
    "discount": "96% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "950",
    "brandClass": "tile-duolingo",
    "iconType": "duolingo",
    "description": "Duolingo Super 2 Months access with unlimited hearts and ads removed.",
    "currPrice": 750,
    "oldPrice": 21000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#58CC02\"><path d=\"M14.484 18.213c1.142 1.033 2.657 1.662 4.316 1.662l.294-.001c1.985-.038 3.749-.9 4.906-2.454.004-.006.012-.016.016-.022a1.36 1.36 0 0 0 .163-.357c.075-.276.016-.549-.163-.746a.78.78 0 0 0-.585-.251c-.244 0-.482.115-.653.315-.884 1.188-2.227 1.848-3.738 1.876l-.239.001c-1.272 0-2.433-.483-3.311-1.277a.78.78 0 0 0-.52-.204.77.77 0 0 0-.555.234.78.78 0 0 0 .07 1.248M7.818 10.742c-.93 0-1.688.758-1.688 1.688s.758 1.688 1.688 1.688 1.688-.758 1.688-1.688-.758-1.688-1.688-1.688m8.364 0c-.93 0-1.688.758-1.688 1.688s.758 1.688 1.688 1.688 1.688-.758 1.688-1.688-.758-1.688-1.688-1.688M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12c.571 0 1.13-.042 1.68-.12a9.63 9.63 0 0 1-.48-3.03c0-3.32 1.7-6.24 4.28-7.96C17.06 1.25 14.67 0 12 0\"/></svg>",
    "plans": [
      {
        "duration": "2 Months",
        "usdPrice": 0.5,
        "usdOldPrice": 14,
        "price": 750,
        "oldPrice": 21000,
        "discount": "96% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "super-duolingo-yourmail-12m",
    "name": "Super Duolingo Your Mail 12 Months",
    "rawName": "Super Duolingo Your Mail 12 Months · $9.00",
    "category": "learning",
    "brand": "Duolingo",
    "duration": "12 Months (Personal Mail)",
    "usdPrice": 9,
    "usdOldPrice": 83.99,
    "discount": "89% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "640",
    "brandClass": "tile-duolingo",
    "iconType": "duolingo",
    "description": "Super Duolingo activated directly on your personal email address for 1 full year.",
    "currPrice": 13500,
    "oldPrice": 125985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#58CC02\"><path d=\"M14.484 18.213c1.142 1.033 2.657 1.662 4.316 1.662l.294-.001c1.985-.038 3.749-.9 4.906-2.454.004-.006.012-.016.016-.022a1.36 1.36 0 0 0 .163-.357c.075-.276.016-.549-.163-.746a.78.78 0 0 0-.585-.251c-.244 0-.482.115-.653.315-.884 1.188-2.227 1.848-3.738 1.876l-.239.001c-1.272 0-2.433-.483-3.311-1.277a.78.78 0 0 0-.52-.204.77.77 0 0 0-.555.234.78.78 0 0 0 .07 1.248M7.818 10.742c-.93 0-1.688.758-1.688 1.688s.758 1.688 1.688 1.688 1.688-.758 1.688-1.688-.758-1.688-1.688-1.688m8.364 0c-.93 0-1.688.758-1.688 1.688s.758 1.688 1.688 1.688 1.688-.758 1.688-1.688-.758-1.688-1.688-1.688M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12c.571 0 1.13-.042 1.68-.12a9.63 9.63 0 0 1-.48-3.03c0-3.32 1.7-6.24 4.28-7.96C17.06 1.25 14.67 0 12 0\"/></svg>",
    "plans": [
      {
        "duration": "12 Months (Personal Mail)",
        "usdPrice": 9,
        "usdOldPrice": 83.99,
        "price": 13500,
        "oldPrice": 125985,
        "discount": "89% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "notion-business-3m",
    "name": "Notion Business 3M",
    "rawName": "Notion Business 3M · $2.50",
    "category": "productivity",
    "brand": "Notion",
    "duration": "3 Months",
    "usdPrice": 2.5,
    "usdOldPrice": 30,
    "discount": "92% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.9k",
    "brandClass": "tile-notion",
    "iconType": "notion",
    "description": "Notion Business workspace with unlimited file uploads, 90-day page history, and advanced team permissions.",
    "currPrice": 3750,
    "oldPrice": 45000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFF\"><path d=\"M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.768c-.42-.326-.981-.7-2.055-.607L3.01 2.235c-.466.046-.56.326-.374.513l1.823 1.46zm.793 3.824v12.78c0 .793.42 1.073 1.26 1.026l14.288-.84c.84-.046.933-.56.933-1.166V6.96c0-.606-.373-.886-.98-.84l-14.52.84c-.653.047-.98.373-.98.84v.232zm13.12 1.352c.048.467 0 .934-.465.98l-.794.14v7.742c-.56.374-1.26.56-1.868.56-.98 0-1.447-.326-2.286-1.353l-4.106-6.436v6.297l1.493.326c.046.513-.374.933-.934.933l-3.36.187c-.046-.467.14-.933.607-.98l1.027-.234V9.81l-1.213-.093c-.047-.514.28-.934.84-.934l3.593-.233 4.293 6.576V9.436l-1.213-.14c-.047-.467.28-.933.84-.933l3.548-.233z\"/></svg>",
    "plans": [
      {
        "duration": "3 Months",
        "usdPrice": 2.5,
        "usdOldPrice": 30,
        "price": 3750,
        "oldPrice": 45000,
        "discount": "92% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "canva-pro-team-12m",
    "name": "Canva Pro Add to Team 12 Months",
    "rawName": "Canva Pro Add to Team 12 Months · $4.50",
    "category": "design",
    "brand": "Canva",
    "duration": "12 Months",
    "usdPrice": 4.5,
    "usdOldPrice": 55,
    "discount": "91% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "4.2k",
    "brandClass": "tile-canva",
    "iconType": "canva",
    "description": "Canva Pro Team member invite for 12 months with 100M+ stock assets, Magic Studio AI, Brand Kit, and resize.",
    "currPrice": 6750,
    "oldPrice": 82500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"url(#canvaGrad)\"/><path d=\"M14.6 7.8c-.8-.5-1.8-.7-2.9-.5-2.5.5-4.4 2.8-4.4 5.3 0 2.2 1.6 3.9 3.8 3.9 1.4 0 2.6-.7 3.3-1.8.3-.4.2-1-.2-1.3-.4-.3-1-.2-1.3.2-.5.7-1.1 1.1-1.8 1.1-1.2 0-2.1-.9-2.1-2.1 0-1.8 1.4-3.4 3.1-3.7.7-.1 1.3 0 1.8.3.4.3 1 .1 1.3-.3.3-.4.2-1-.2-1.3z\" fill=\"#FFF\"/><defs><linearGradient id=\"canvaGrad\" x1=\"2\" y1=\"2\" x2=\"22\" y2=\"22\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#00C4CC\"/><stop offset=\"1\" stop-color=\"#7D2AE8\"/></linearGradient></defs></svg>",
    "plans": [
      {
        "duration": "12 Months",
        "usdPrice": 4.5,
        "usdOldPrice": 55,
        "price": 6750,
        "oldPrice": 82500,
        "discount": "91% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "adobe-express-4m",
    "name": "Adobe Express 4M",
    "rawName": "Adobe Express 4M · $8.97",
    "category": "design",
    "brand": "Adobe",
    "duration": "4 Months",
    "usdPrice": 8.97,
    "usdOldPrice": 39.99,
    "discount": "77% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "530",
    "brandClass": "tile-adobe",
    "iconType": "adobe",
    "description": "Adobe Express Premium with Firefly generative AI credits, Adobe Fonts, and premium graphic templates.",
    "currPrice": 13455,
    "oldPrice": 59985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FA0F00\"><path d=\"M13.96 22H18.9L12.04 4.5h-.08L5.1 22h4.94l2-5.4h3.92l-2-5.4zM24 2h-7.6L24 22V2zM0 2h7.6L0 22V2z\"/></svg>",
    "plans": [
      {
        "duration": "4 Months",
        "usdPrice": 8.97,
        "usdOldPrice": 39.99,
        "price": 13455,
        "oldPrice": 59985,
        "discount": "77% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "scribd-premium-1m",
    "name": "Scribd Premium 1M",
    "rawName": "Scribd Premium 1M · $2.50",
    "category": "learning",
    "brand": "Scribd",
    "duration": "1 Month",
    "usdPrice": 2.5,
    "usdOldPrice": 11.99,
    "discount": "79% OFF",
    "inStock": true,
    "rating": 4.6,
    "reviews": "310",
    "brandClass": "tile-scribd",
    "iconType": "scribd",
    "description": "Unlimited access to audiobooks, ebooks, magazines, and academic documents on Scribd/Everand.",
    "currPrice": 3750,
    "oldPrice": 17985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#1E7B85\"><path d=\"M18.8 4.2c-1.8-1.4-4.2-2.2-6.8-2.2-5.5 0-10 4.5-10 10s4.5 10 10 10c3.2 0 6.1-1.5 8-3.8-.3-.2-.5-.5-.7-.8-1.6 1.9-4 3.1-6.7 3.1-4.7 0-8.5-3.8-8.5-8.5s3.8-8.5 8.5-8.5c2.3 0 4.4.9 5.9 2.4.4-.5.8-.9 1.3-1.4-.4-.1-.7-.2-1-.3z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 2.5,
        "usdOldPrice": 11.99,
        "price": 3750,
        "oldPrice": 17985,
        "discount": "79% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "adobe-express-12m",
    "name": "Adobe Express 12M",
    "rawName": "Adobe Express 12M · $0.50",
    "category": "design",
    "brand": "Adobe",
    "duration": "12 Months",
    "usdPrice": 0.5,
    "usdOldPrice": 99.99,
    "discount": "99% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "1.4k",
    "brandClass": "tile-adobe",
    "iconType": "adobe",
    "description": "Special annual Adobe Express promo license with full design suite access.",
    "currPrice": 750,
    "oldPrice": 149985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FA0F00\"><path d=\"M13.96 22H18.9L12.04 4.5h-.08L5.1 22h4.94l2-5.4h3.92l-2-5.4zM24 2h-7.6L24 22V2zM0 2h7.6L0 22V2z\"/></svg>",
    "plans": [
      {
        "duration": "12 Months",
        "usdPrice": 0.5,
        "usdOldPrice": 99.99,
        "price": 750,
        "oldPrice": 149985,
        "discount": "99% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "ilovepdf-premium-1y",
    "name": "iLovePDF Premium 1 Year",
    "rawName": "iLovePDF Premium 1 Year · $1.50",
    "category": "productivity",
    "brand": "iLovePDF",
    "duration": "1 Year",
    "usdPrice": 1.5,
    "usdOldPrice": 48,
    "discount": "96% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "890",
    "brandClass": "tile-ilovepdf",
    "iconType": "ilovepdf",
    "description": "iLovePDF Desktop & Web Premium with unlimited file size, batch processing, and OCR text recognition.",
    "currPrice": 2250,
    "oldPrice": 72000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z\" fill=\"#E5322D\"/><path d=\"M14 2v6h6l-6-6z\" fill=\"#B3201C\"/><path d=\"M12 11.5c-1.5-1.5-3-1-3.5 0-.5 1 .5 2.5 3.5 4.5 3-2 4-3.5 3.5-4.5-.5-1-2-1.5-3.5 0z\" fill=\"#FFF\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 1.5,
        "usdOldPrice": 48,
        "price": 2250,
        "oldPrice": 72000,
        "discount": "96% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "expressvpn-1m",
    "name": "ExpressVPN 1M",
    "rawName": "ExpressVPN 1M · $5.98",
    "category": "security",
    "brand": "ExpressVPN",
    "duration": "1 Month",
    "usdPrice": 5.98,
    "usdOldPrice": 12.95,
    "discount": "54% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "2.1k",
    "brandClass": "tile-expressvpn",
    "iconType": "expressvpn",
    "description": "Ultra-fast global VPN servers across 105 countries with Lightway protocol and zero logging.",
    "currPrice": 8970,
    "oldPrice": 19425,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"30\" height=\"30\"><rect width=\"24\" height=\"24\" rx=\"6\" fill=\"#DA3A35\"/><path fill=\"#FFF\" d=\"M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 4.5h2v7h-2v-7zm0 8.5h2v2h-2v-2z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 5.98,
        "usdOldPrice": 12.95,
        "price": 8970,
        "oldPrice": 19425,
        "discount": "54% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "youtube-premium-3m",
    "name": "YouTube Premium 3M ROW",
    "rawName": "YouTube Premium 3M ROW · $4.60",
    "category": "streaming",
    "brand": "YouTube",
    "duration": "3 Months",
    "usdPrice": 4.6,
    "usdOldPrice": 38.99,
    "discount": "88% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "3.6k",
    "brandClass": "tile-youtube",
    "iconType": "youtube",
    "description": "Ad-free YouTube and YouTube Music with background playback and video downloads.",
    "currPrice": 6900,
    "oldPrice": 58485,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"32\" height=\"32\"><path fill=\"#FF0000\" d=\"M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z\"/><path fill=\"#FFF\" d=\"m9.6 15.6 6.3-3.6-6.3-3.6v7.2z\"/></svg>",
    "plans": [
      {
        "duration": "3 Months",
        "usdPrice": 4.6,
        "usdOldPrice": 38.99,
        "price": 6900,
        "oldPrice": 58485,
        "discount": "88% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "wordwall-pro-1m",
    "name": "Wordwall Pro 1 Month",
    "rawName": "Wordwall Pro 1 Month · $3.80",
    "category": "learning",
    "brand": "Wordwall",
    "duration": "1 Month",
    "usdPrice": 3.8,
    "usdOldPrice": 12,
    "discount": "68% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "240",
    "brandClass": "tile-wordwall",
    "iconType": "wordwall",
    "description": "Interactive classroom learning activity creator with unlimited resources and printable worksheets.",
    "currPrice": 5700,
    "oldPrice": 18000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><rect x=\"3\" y=\"4\" width=\"8\" height=\"7\" rx=\"2\" fill=\"#3B82F6\"/><rect x=\"13\" y=\"4\" width=\"8\" height=\"7\" rx=\"2\" fill=\"#10B981\"/><rect x=\"3\" y=\"13\" width=\"8\" height=\"7\" rx=\"2\" fill=\"#F59E0B\"/><rect x=\"13\" y=\"13\" width=\"8\" height=\"7\" rx=\"2\" fill=\"#EF4444\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 3.8,
        "usdOldPrice": 12,
        "price": 5700,
        "oldPrice": 18000,
        "discount": "68% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "jetbrains-edu-1y",
    "name": "JetBrains EDU 1 Year",
    "rawName": "JetBrains EDU 1 Year · $4.50",
    "category": "productivity",
    "brand": "JetBrains",
    "duration": "1 Year",
    "usdPrice": 4.5,
    "usdOldPrice": 249,
    "discount": "98% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.7k",
    "brandClass": "tile-jetbrains",
    "iconType": "jetbrains",
    "description": "JetBrains All Products Pack: IntelliJ IDEA Ultimate, PyCharm Pro, WebStorm, Rider, CLion, and more.",
    "currPrice": 6750,
    "oldPrice": 373500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"30\" height=\"30\"><rect width=\"24\" height=\"24\" rx=\"5\" fill=\"#000\"/><path fill=\"#FF318C\" d=\"M3 3h9v9H3z\"/><path fill=\"#00CD70\" d=\"M12 12h9v9h-9z\"/><path fill=\"#FFF\" d=\"M5 18h14v2H5zM5 8h4v2H5z\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 4.5,
        "usdOldPrice": 249,
        "price": 6750,
        "oldPrice": 373500,
        "discount": "98% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "figma-pro-edu-2y",
    "name": "Figma Pro EDU 2 Years",
    "rawName": "Figma Pro EDU 2 Years · $6.00",
    "category": "design",
    "brand": "Figma",
    "duration": "2 Years",
    "usdPrice": 6,
    "usdOldPrice": 288,
    "discount": "97% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "2.5k",
    "brandClass": "tile-figma",
    "iconType": "figma",
    "description": "Figma Professional & FigJam with unlimited version history, team libraries, and dev mode.",
    "currPrice": 9000,
    "oldPrice": 432000,
    "brandSymbol": "<svg viewBox=\"0 0 38 57\" width=\"24\" height=\"36\"><path fill=\"#1abcfe\" d=\"M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z\"/><path fill=\"#0acf83\" d=\"M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z\"/><path fill=\"#ff7262\" d=\"M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z\"/><path fill=\"#f24e1e\" d=\"M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z\"/><path fill=\"#a259ff\" d=\"M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z\"/></svg>",
    "plans": [
      {
        "duration": "2 Years",
        "usdPrice": 6,
        "usdOldPrice": 288,
        "price": 9000,
        "oldPrice": 432000,
        "discount": "97% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "pocket-fm-3m",
    "name": "Pocket FM Premium 3M",
    "rawName": "Pocket FM Premium 3M · $0.50",
    "category": "streaming",
    "brand": "Pocket FM",
    "duration": "3 Months",
    "usdPrice": 0.5,
    "usdOldPrice": 9.99,
    "discount": "95% OFF",
    "inStock": true,
    "rating": 4.5,
    "reviews": "180",
    "brandClass": "tile-pocketfm",
    "iconType": "audio",
    "description": "Audio series and audiobooks with ad-free binge listening and offline downloads.",
    "currPrice": 750,
    "oldPrice": 14985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><rect width=\"24\" height=\"24\" rx=\"6\" fill=\"#EF4444\"/><path d=\"M8 7v10l4-2.5 4 2.5V7H8z\" fill=\"#FFF\"/><circle cx=\"12\" cy=\"10\" r=\"1.5\" fill=\"#EF4444\"/></svg>",
    "plans": [
      {
        "duration": "3 Months",
        "usdPrice": 0.5,
        "usdOldPrice": 9.99,
        "price": 750,
        "oldPrice": 14985,
        "discount": "95% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "apple-tv-1m-canada",
    "name": "Apple TV+ 1M Canada",
    "rawName": "Apple TV+ 1M Canada · $1.00",
    "category": "streaming",
    "brand": "Apple TV+",
    "duration": "1 Month",
    "usdPrice": 1,
    "usdOldPrice": 9.99,
    "discount": "90% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "620",
    "brandClass": "tile-appletv",
    "iconType": "appletv",
    "description": "Stream award-winning Apple Originals, blockbuster films, and live sports in 4K HDR.",
    "currPrice": 1500,
    "oldPrice": 14985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"30\" height=\"30\"><rect width=\"24\" height=\"24\" rx=\"6\" fill=\"#000\"/><path fill=\"#FFF\" d=\"M12.5 7.5c.6-.8 1-1.8.9-2.8-1 .1-2.1.7-2.7 1.4-.5.6-.9 1.6-.8 2.5 1.1.1 2-.5 2.6-1.1zm3.7 5.6c0-2.4 2-3.6 2.1-3.6-1.1-1.6-2.9-1.9-3.5-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.3 2.5 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.5 1-1.5 1.4-2.9 1.5-3-.1 0-2.9-1.1-2.9-4.2z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 1,
        "usdOldPrice": 9.99,
        "price": 1500,
        "oldPrice": 14985,
        "discount": "90% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "microsoft-office-365-plus-1y",
    "name": "Microsoft Office 365 Plus 1 Year",
    "rawName": "Microsoft Office 365 Plus 1 Year · $1.60",
    "category": "productivity",
    "brand": "Microsoft 365",
    "duration": "1 Year",
    "usdPrice": 1.6,
    "usdOldPrice": 69.99,
    "discount": "97% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "1.9k",
    "brandClass": "tile-microsoft",
    "iconType": "microsoft",
    "description": "Office 365 Plus genuine activation with 1TB cloud storage and full desktop productivity apps.",
    "currPrice": 2400,
    "oldPrice": 104985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\"><path fill=\"#F25022\" d=\"M1 1h10v10H1z\"/><path fill=\"#7FBA00\" d=\"M13 1h10v10H13z\"/><path fill=\"#00A4EF\" d=\"M1 13h10v10H1z\"/><path fill=\"#FFB900\" d=\"M13 13h10v10H13z\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 1.6,
        "usdOldPrice": 69.99,
        "price": 2400,
        "oldPrice": 104985,
        "discount": "97% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "capcut-pro-1m",
    "name": "CapCut Pro 1 Month",
    "rawName": "CapCut Pro 1 Month · $2.50",
    "category": "design",
    "brand": "CapCut",
    "duration": "1 Month",
    "usdPrice": 2.5,
    "usdOldPrice": 9.99,
    "discount": "75% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "2.8k",
    "brandClass": "tile-capcut",
    "iconType": "capcut",
    "description": "Full CapCut Pro subscription for mobile and desktop video editing with VIP features.",
    "currPrice": 3750,
    "oldPrice": 14985,
    "brandSymbol": "<svg viewBox=\"0 0 192 192\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"#FFFFFF\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"16\"><path d=\"M170 42 22 124v14a12 12 0 0 0 12 12h78a12 12 0 0 0 12-12v-9.5\"/><path d=\"M170 150 22 68V54a12 12 0 0 1 12-12h78a12 12 0 0 1 12 12v9.5\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 2.5,
        "usdOldPrice": 9.99,
        "price": 3750,
        "oldPrice": 14985,
        "discount": "75% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "fallout-76-ms-store",
    "name": "Fallout 76 MS Store",
    "rawName": "Fallout 76 MS Store · $2.52",
    "category": "gaming",
    "brand": "Bethesda / Xbox",
    "duration": "Full Game License",
    "usdPrice": 2.52,
    "usdOldPrice": 39.99,
    "discount": "93% OFF",
    "inStock": true,
    "rating": 4.6,
    "reviews": "410",
    "brandClass": "tile-gaming",
    "iconType": "game",
    "description": "Fallout 76 PC game digital key redeemable on Microsoft Store / Xbox PC app.",
    "currPrice": 3780,
    "oldPrice": 59985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFF\"><path d=\"M3 3h18v18H3V3zm4 4v10h10V7H7zm2 2h6v6H9V9z\"/></svg>",
    "plans": [
      {
        "duration": "Full Game License",
        "usdPrice": 2.52,
        "usdOldPrice": 39.99,
        "price": 3780,
        "oldPrice": 59985,
        "discount": "93% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "xbox-pc-game-pass-1m",
    "name": "Xbox PC Game Pass 1M",
    "rawName": "Xbox PC Game Pass 1M · $7.75",
    "category": "gaming",
    "brand": "Xbox",
    "duration": "1 Month",
    "usdPrice": 7.75,
    "usdOldPrice": 11.99,
    "discount": "35% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "1.3k",
    "brandClass": "tile-xbox",
    "iconType": "xbox",
    "description": "Play hundreds of high-quality PC games with friends, including new day-one releases.",
    "currPrice": 11625,
    "oldPrice": 17985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#107C10\"><path d=\"M3.663 20.183A11.96 11.96 0 0 0 12 24c3.21 0 6.13-1.263 8.337-3.317a11.97 11.97 0 0 0 2.946-4.636c-1.34 1.49-3.792 2.657-6.574 3.033 1.942-.98 3.513-2.392 4.417-3.923-1.637 1.13-4.045 1.96-6.792 2.146 1.542-.924 2.766-2.188 3.407-3.515-2.257.94-5.06 1.464-7.741 1.464-2.68 0-5.484-.524-7.74-1.464.64 1.327 1.864 2.59 3.406 3.515-2.747-.186-5.155-1.016-6.792-2.146.904 1.53 2.475 2.943 4.417 3.923-2.782-.376-5.234-1.543-6.574-3.033.722 1.74 1.764 3.328 2.946 4.636zM12 0C6.545 0 1.922 3.655.438 8.643c1.554-.86 4.093-1.472 7.027-1.642-1.047 1.04-1.89 2.37-2.38 3.784 2.05-1.272 4.542-2.03 7.242-2.03 2.7 0 5.192.758 7.242 2.03-.49-1.414-1.333-2.744-2.38-3.784 2.934.17 5.473.782 7.027 1.642C22.078 3.655 17.455 0 12 0z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 7.75,
        "usdOldPrice": 11.99,
        "price": 11625,
        "oldPrice": 17985,
        "discount": "35% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "quillbot-premium-1m",
    "name": "QuillBot Premium 1M",
    "rawName": "QuillBot Premium 1M · $2.50",
    "category": "productivity",
    "brand": "QuillBot",
    "duration": "1 Month",
    "usdPrice": 2.5,
    "usdOldPrice": 19.95,
    "discount": "87% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "1.2k",
    "brandClass": "tile-quillbot",
    "iconType": "quillbot",
    "description": "AI Paraphrasing tool with unlimited words, 7 writing modes, grammar checker, and plagiarism detector.",
    "currPrice": 3750,
    "oldPrice": 29925,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#48B774\"><path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-5h2v5zm0-7h-2V7h2v2.5z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 2.5,
        "usdOldPrice": 19.95,
        "price": 3750,
        "oldPrice": 29925,
        "discount": "87% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "avast-premium-security-1y",
    "name": "Avast Premium Security 1Y",
    "rawName": "Avast Premium Security 1Y · $5.48",
    "category": "security",
    "brand": "Avast",
    "duration": "1 Year",
    "usdPrice": 5.48,
    "usdOldPrice": 49.99,
    "discount": "89% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "760",
    "brandClass": "tile-avast",
    "iconType": "avast",
    "description": "Complete antivirus and cyber threat defense for PC/Mac with ransomware shielding and webcam guard.",
    "currPrice": 8220,
    "oldPrice": 74985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FF7800\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path fill=\"#FFF\" d=\"M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm-1 3h2v4h-2V9zm0 5h2v2h-2v-2z\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 5.48,
        "usdOldPrice": 49.99,
        "price": 8220,
        "oldPrice": 74985,
        "discount": "89% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "mcafee-total-protection-1y",
    "name": "McAfee Total Protection 1Y",
    "rawName": "McAfee Total Protection 1Y · $7.46",
    "category": "security",
    "brand": "McAfee",
    "duration": "1 Year",
    "usdPrice": 7.46,
    "usdOldPrice": 89.99,
    "discount": "91% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "920",
    "brandClass": "tile-mcafee",
    "iconType": "mcafee",
    "description": "All-in-one protection: award-winning antivirus, secure VPN, identity monitoring, and password manager.",
    "currPrice": 11190,
    "oldPrice": 134985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#C01818\"><path d=\"M12 1.5 2 5.5v7.2C2 18.2 6.3 23.3 12 24.5c5.7-1.2 10-6.3 10-11.8V5.5L12 1.5zm6.5 12.3c0 3.7-2.8 7.3-6.5 8.3-3.7-1-6.5-4.6-6.5-8.3V6.8l6.5-2.6 6.5 2.6v7z\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 7.46,
        "usdOldPrice": 89.99,
        "price": 11190,
        "oldPrice": 134985,
        "discount": "91% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "chatgpt-business-team-1m",
    "name": "ChatGPT Business Team 1 Month",
    "rawName": "ChatGPT Business Team 1 Month · $18.00",
    "category": "ai",
    "brand": "ChatGPT",
    "duration": "1 Month (Team)",
    "usdPrice": 18,
    "usdOldPrice": 30,
    "discount": "40% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.6k",
    "brandClass": "tile-chatgpt",
    "iconType": "chatgpt",
    "description": "OpenAI ChatGPT Team tier with higher messaging limits, workspace management, and no training on team data.",
    "currPrice": 27000,
    "oldPrice": 45000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month (Team)",
        "usdPrice": 18,
        "usdOldPrice": 30,
        "price": 27000,
        "oldPrice": 45000,
        "discount": "40% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "chatgpt-plus-k12-edu-24m",
    "name": "ChatGPT Plus K12 Edu 24 Months",
    "rawName": "ChatGPT Plus K12 Edu 24 Months · $4.95",
    "category": "ai",
    "brand": "ChatGPT",
    "duration": "24 Months",
    "usdPrice": 4.95,
    "usdOldPrice": 480,
    "discount": "98% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "2.9k",
    "brandClass": "tile-chatgpt",
    "iconType": "chatgpt",
    "description": "ChatGPT Plus K12 Edu package with 2-year guaranteed access to GPT-4o, canvas, and advanced reasoning.",
    "currPrice": 7425,
    "oldPrice": 720000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "24 Months",
        "usdPrice": 4.95,
        "usdOldPrice": 480,
        "price": 7425,
        "oldPrice": 720000,
        "discount": "98% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "chatgpt-plus-30d",
    "name": "ChatGPT Plus 30D",
    "rawName": "ChatGPT Plus 30D · $7.80",
    "category": "ai",
    "brand": "ChatGPT",
    "duration": "30 Days",
    "usdPrice": 7.8,
    "usdOldPrice": 20,
    "discount": "61% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "3.8k",
    "brandClass": "tile-chatgpt",
    "iconType": "chatgpt",
    "description": "Official ChatGPT Plus 30-day subscription: GPT-4o, DALL·E 3, Browsing, and Advanced Voice Mode.",
    "currPrice": 11700,
    "oldPrice": 30000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "30 Days",
        "usdPrice": 7.8,
        "usdOldPrice": 20,
        "price": 11700,
        "oldPrice": 30000,
        "discount": "61% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "codex-api-50m-1d",
    "name": "Codex API 50M Tokens 1 Day",
    "rawName": "Codex API 50M Tokens 1 Day · $4.20",
    "category": "ai",
    "brand": "OpenAI Codex",
    "duration": "1 Day (50M Tokens)",
    "usdPrice": 4.2,
    "usdOldPrice": 15,
    "discount": "72% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "640",
    "brandClass": "tile-codex",
    "iconType": "codex",
    "description": "High-speed OpenAI Codex coding API access with 50M token allowance for code synthesis and autocomplete.",
    "currPrice": 6300,
    "oldPrice": 22500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "1 Day (50M Tokens)",
        "usdPrice": 4.2,
        "usdOldPrice": 15,
        "price": 6300,
        "oldPrice": 22500,
        "discount": "72% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "codex-api-10m-1d",
    "name": "Codex API 10M Tokens 1 Day",
    "rawName": "Codex API 10M Tokens 1 Day · $3.60",
    "category": "ai",
    "brand": "OpenAI Codex",
    "duration": "1 Day (10M Tokens)",
    "usdPrice": 3.6,
    "usdOldPrice": 8,
    "discount": "55% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "430",
    "brandClass": "tile-codex",
    "iconType": "codex",
    "description": "OpenAI Codex API token pack for automated code generation, refactoring, and test writing.",
    "currPrice": 5400,
    "oldPrice": 12000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "1 Day (10M Tokens)",
        "usdPrice": 3.6,
        "usdOldPrice": 8,
        "price": 5400,
        "oldPrice": 12000,
        "discount": "55% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "claude-api-100m-1d",
    "name": "Claude API 100M Tokens 1 Day",
    "rawName": "Claude API 100M Tokens 1 Day · $6.00",
    "category": "ai",
    "brand": "Claude",
    "duration": "1 Day (100M Tokens)",
    "usdPrice": 6,
    "usdOldPrice": 25,
    "discount": "76% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.5k",
    "brandClass": "tile-claude",
    "iconType": "claude",
    "description": "Anthropic Claude 3.5 Sonnet direct API key with massive 100M token ceiling for high-throughput pipelines.",
    "currPrice": 9000,
    "oldPrice": 37500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#D97706\"><path d=\"M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z\"/></svg>",
    "plans": [
      {
        "duration": "1 Day (100M Tokens)",
        "usdPrice": 6,
        "usdOldPrice": 25,
        "price": 9000,
        "oldPrice": 37500,
        "discount": "76% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "claude-api-50m-1d",
    "name": "Claude API 50M Tokens 1 Day",
    "rawName": "Claude API 50M Tokens 1 Day · $5.00",
    "category": "ai",
    "brand": "Claude",
    "duration": "1 Day (50M Tokens)",
    "usdPrice": 5,
    "usdOldPrice": 18,
    "discount": "72% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.2k",
    "brandClass": "tile-claude",
    "iconType": "claude",
    "description": "Anthropic Claude API key with 50M tokens allowance and top-tier speed.",
    "currPrice": 7500,
    "oldPrice": 27000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#D97706\"><path d=\"M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z\"/></svg>",
    "plans": [
      {
        "duration": "1 Day (50M Tokens)",
        "usdPrice": 5,
        "usdOldPrice": 18,
        "price": 7500,
        "oldPrice": 27000,
        "discount": "72% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "claude-api-10m-1d",
    "name": "Claude API 10M Tokens 1 Day",
    "rawName": "Claude API 10M Tokens 1 Day · $3.00",
    "category": "ai",
    "brand": "Claude",
    "duration": "1 Day (10M Tokens)",
    "usdPrice": 3,
    "usdOldPrice": 10,
    "discount": "70% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "890",
    "brandClass": "tile-claude",
    "iconType": "claude",
    "description": "Anthropic Claude 3.5 API access with 10M tokens for daily development and research.",
    "currPrice": 4500,
    "oldPrice": 15000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#D97706\"><path d=\"M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z\"/></svg>",
    "plans": [
      {
        "duration": "1 Day (10M Tokens)",
        "usdPrice": 3,
        "usdOldPrice": 10,
        "price": 4500,
        "oldPrice": 15000,
        "discount": "70% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "claude-api-100usd-30d",
    "name": "100$ API Claude 30D",
    "rawName": "100$ API Claude 30D · $2.50",
    "category": "ai",
    "brand": "Claude",
    "duration": "30 Days ($100 Balance)",
    "usdPrice": 2.5,
    "usdOldPrice": 100,
    "discount": "97% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "2.1k",
    "brandClass": "tile-claude",
    "iconType": "claude",
    "description": "Claude Anthropic developer account pre-loaded with $100 API balance valid for 30 days.",
    "currPrice": 3750,
    "oldPrice": 150000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#D97706\"><path d=\"M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z\"/></svg>",
    "plans": [
      {
        "duration": "30 Days ($100 Balance)",
        "usdPrice": 2.5,
        "usdOldPrice": 100,
        "price": 3750,
        "oldPrice": 150000,
        "discount": "97% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "gemini-pro-18m",
    "name": "Gemini Pro 18 Months",
    "rawName": "Gemini Pro 18 Months · $1.00",
    "category": "ai",
    "brand": "Google Gemini",
    "duration": "18 Months",
    "usdPrice": 1,
    "usdOldPrice": 360,
    "discount": "99% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "4.8k",
    "brandClass": "tile-gemini",
    "iconType": "gemini",
    "description": "Google Gemini Pro 18-Month activation: Advanced AI model, 2TB Google One cloud storage, and Docs/Gmail AI tools.",
    "currPrice": 1500,
    "oldPrice": 540000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"30\" height=\"30\" fill=\"none\"><path d=\"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z\" fill=\"#3186FF\"/><path d=\"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z\" fill=\"url(#gemGrad1)\"/><path d=\"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z\" fill=\"url(#gemGrad2)\"/><path d=\"M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z\" fill=\"url(#gemGrad3)\"/><defs><linearGradient gradientUnits=\"userSpaceOnUse\" id=\"gemGrad1\" x1=\"7\" x2=\"11\" y1=\"15.5\" y2=\"12\"><stop stop-color=\"#08B962\"/><stop offset=\"1\" stop-color=\"#08B962\" stop-opacity=\"0\"/></linearGradient><linearGradient gradientUnits=\"userSpaceOnUse\" id=\"gemGrad2\" x1=\"8\" x2=\"11.5\" y1=\"5.5\" y2=\"11\"><stop stop-color=\"#F94543\"/><stop offset=\"1\" stop-color=\"#F94543\" stop-opacity=\"0\"/></linearGradient><linearGradient gradientUnits=\"userSpaceOnUse\" id=\"gemGrad3\" x1=\"3.5\" x2=\"17.5\" y1=\"13.5\" y2=\"12\"><stop stop-color=\"#FABC12\"/><stop offset=\".46\" stop-color=\"#FABC12\" stop-opacity=\"0\"/></linearGradient></defs></svg>",
    "plans": [
      {
        "duration": "18 Months",
        "usdPrice": 1,
        "usdOldPrice": 360,
        "price": 1500,
        "oldPrice": 540000,
        "discount": "99% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "grok-api-15m-1d",
    "name": "Grok API 4.5 HIGH/XHIGH 15M Tokens 1 Day",
    "rawName": "Grok API 4.5 HIGH/XHIGH 15M Tokens 1 Day · $2.50",
    "category": "ai",
    "brand": "xAI Grok",
    "duration": "1 Day (15M Tokens)",
    "usdPrice": 2.5,
    "usdOldPrice": 12,
    "discount": "79% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "720",
    "brandClass": "tile-grok",
    "iconType": "grok",
    "description": "xAI Grok 4.5 high-performance reasoning model API access with 15M tokens.",
    "currPrice": 3750,
    "oldPrice": 18000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFF\"><path d=\"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z\"/></svg>",
    "plans": [
      {
        "duration": "1 Day (15M Tokens)",
        "usdPrice": 2.5,
        "usdOldPrice": 12,
        "price": 3750,
        "oldPrice": 18000,
        "discount": "79% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "kling-66-credits",
    "name": "Kling 66 Credits",
    "rawName": "Kling 66 Credits · $0.55",
    "category": "ai",
    "brand": "Kling AI",
    "duration": "66 Credits Pack",
    "usdPrice": 0.55,
    "usdOldPrice": 5,
    "discount": "89% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "340",
    "brandClass": "tile-kling",
    "iconType": "kling",
    "description": "Kling AI video generation credits for realistic cinematic text-to-video and image animation.",
    "currPrice": 825,
    "oldPrice": 7500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FF5000\"><path clip-rule=\"evenodd\" fill-rule=\"evenodd\" d=\"M5.493 21.234c-1.112-1.451-1.109-4.263-.081-7.459l-4.557-2.63a1.683 1.683 0 01-.85-1.304 1.505 1.505 0 01.08-.622 13.18 13.18 0 011.037-2.255c3.476-6.02 10.916-8.23 16.619-4.938.46.266.82.67 1.081 1.184.785 1.545.685 4.096-.234 6.954l4.557 2.631c.339.196.596.492.736.832a1.53 1.53 0 01.034 1.093 13.146 13.146 0 01-1.037 2.255c-3.476 6.02-10.916 8.23-16.619 4.938a2.6 2.6 0 01-.766-.68zm11.096-6.615c-2.073 3.591-5.808 5.316-8.343 3.852-1.267-.731-1.994-2.122-2.145-3.778-.095-1.035.036-2.173.4-3.32.217-.684.517-1.37.902-2.039l.008-.014c2.073-3.59 5.808-5.315 8.343-3.852.633.366 1.13.895 1.49 1.54.986 1.772.922 4.415-.285 6.914-.111.23-.232.457-.362.683l-.008.014z\"/></svg>",
    "plans": [
      {
        "duration": "66 Credits Pack",
        "usdPrice": 0.55,
        "usdOldPrice": 5,
        "price": 825,
        "oldPrice": 7500,
        "discount": "89% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "zoom-pro-1m-account",
    "name": "Zoom Pro 1M Ready-made Account",
    "rawName": "Zoom Pro 1M Ready-made Account · $4.00",
    "category": "productivity",
    "brand": "Zoom",
    "duration": "1 Month",
    "usdPrice": 4,
    "usdOldPrice": 15.99,
    "discount": "75% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "850",
    "brandClass": "tile-zoom",
    "iconType": "zoom",
    "description": "Ready-made Zoom Pro account: host up to 100 participants, unlimited meeting duration, and cloud recordings.",
    "currPrice": 6000,
    "oldPrice": 23985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#2D8CFF\"><path d=\"M5.033 14.649H.743a.74.74 0 0 1-.686-.458.74.74 0 0 1 .16-.808L3.19 10.41H1.06A1.06 1.06 0 0 1 0 9.35V4.717a1.06 1.06 0 0 1 1.06-1.06h9.544a1.06 1.06 0 0 1 1.06 1.06v4.633a1.06 1.06 0 0 1-1.06 1.06H7.477l2.973 2.973a.74.74 0 0 1 .16.808.74.74 0 0 1-.686.458H5.033zM13.2 6.36v11.28c0 .354.288.64.64.64h9.52a.64.64 0 0 0 .64-.64V6.36a.64.64 0 0 0-.64-.64h-9.52a.64.64 0 0 0-.64.64z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 4,
        "usdOldPrice": 15.99,
        "price": 6000,
        "oldPrice": 23985,
        "discount": "75% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "grok-api-100m-7d",
    "name": "Grok API 4.5 HIGH/XHIGH 100M Tokens 7 Days",
    "rawName": "Grok API 4.5 HIGH/XHIGH 100M Tokens 7 Days · $5.50",
    "category": "ai",
    "brand": "xAI Grok",
    "duration": "7 Days (100M Tokens)",
    "usdPrice": 5.5,
    "usdOldPrice": 35,
    "discount": "84% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "910",
    "brandClass": "tile-grok",
    "iconType": "grok",
    "description": "xAI Grok 4.5 high/extra-high reasoning API tokens pack valid for 7 days.",
    "currPrice": 8250,
    "oldPrice": 52500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFF\"><path d=\"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z\"/></svg>",
    "plans": [
      {
        "duration": "7 Days (100M Tokens)",
        "usdPrice": 5.5,
        "usdOldPrice": 35,
        "price": 8250,
        "oldPrice": 52500,
        "discount": "84% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "super-grok-10d",
    "name": "Super Grok 9-10 Days",
    "rawName": "Super Grok 9-10 Days · $3.82",
    "category": "ai",
    "brand": "xAI Grok",
    "duration": "9-10 Days",
    "usdPrice": 3.82,
    "usdOldPrice": 16,
    "discount": "76% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "610",
    "brandClass": "tile-grok",
    "iconType": "grok",
    "description": "Super Grok full access account with uncensored queries, deep search, and image analysis.",
    "currPrice": 5730,
    "oldPrice": 24000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFF\"><path d=\"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z\"/></svg>",
    "plans": [
      {
        "duration": "9-10 Days",
        "usdPrice": 3.82,
        "usdOldPrice": 16,
        "price": 5730,
        "oldPrice": 24000,
        "discount": "76% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "mcafee-antivirus-1device-1y",
    "name": "McAfee AntiVirus 1 Device 1Y",
    "rawName": "McAfee AntiVirus 1 Device 1Y · $7.48",
    "category": "security",
    "brand": "McAfee",
    "duration": "1 Year (1 Device)",
    "usdPrice": 7.48,
    "usdOldPrice": 39.99,
    "discount": "81% OFF",
    "inStock": true,
    "rating": 4.6,
    "reviews": "520",
    "brandClass": "tile-mcafee",
    "iconType": "mcafee",
    "description": "Genuine McAfee AntiVirus license key protecting 1 Windows/Mac/Android device for a full year.",
    "currPrice": 11220,
    "oldPrice": 59985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#C01818\"><path d=\"M12 1.5 2 5.5v7.2C2 18.2 6.3 23.3 12 24.5c5.7-1.2 10-6.3 10-11.8V5.5L12 1.5zm6.5 12.3c0 3.7-2.8 7.3-6.5 8.3-3.7-1-6.5-4.6-6.5-8.3V6.8l6.5-2.6 6.5 2.6v7z\"/></svg>",
    "plans": [
      {
        "duration": "1 Year (1 Device)",
        "usdPrice": 7.48,
        "usdOldPrice": 39.99,
        "price": 11220,
        "oldPrice": 59985,
        "discount": "81% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "capcut-pro-6m-personal",
    "name": "CapCut Pro 6M Personal",
    "rawName": "CapCut Pro 6M Personal · $14.00",
    "category": "design",
    "brand": "CapCut",
    "duration": "6 Months (Personal)",
    "usdPrice": 14,
    "usdOldPrice": 59.99,
    "discount": "76% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.8k",
    "brandClass": "tile-capcut",
    "iconType": "capcut",
    "description": "CapCut Pro 6 Months private account with dedicated cloud space and unrestricted VIP effects.",
    "currPrice": 21000,
    "oldPrice": 89985,
    "brandSymbol": "<svg viewBox=\"0 0 192 192\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"#FFFFFF\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"16\"><path d=\"M170 42 22 124v14a12 12 0 0 0 12 12h78a12 12 0 0 0 12-12v-9.5\"/><path d=\"M170 150 22 68V54a12 12 0 0 1 12-12h78a12 12 0 0 1 12 12v9.5\"/></svg>",
    "plans": [
      {
        "duration": "6 Months (Personal)",
        "usdPrice": 14,
        "usdOldPrice": 59.99,
        "price": 21000,
        "oldPrice": 89985,
        "discount": "76% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "capcut-pro-6m",
    "name": "CapCut Pro 6 Months",
    "rawName": "CapCut Pro 6 Months · $13.00",
    "category": "design",
    "brand": "CapCut",
    "duration": "6 Months",
    "usdPrice": 13,
    "usdOldPrice": 59.99,
    "discount": "78% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "2.2k",
    "brandClass": "tile-capcut",
    "iconType": "capcut",
    "description": "CapCut Pro semi-annual subscription with all pro templates, auto-captions, and AI background tools.",
    "currPrice": 19500,
    "oldPrice": 89985,
    "brandSymbol": "<svg viewBox=\"0 0 192 192\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"#FFFFFF\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"16\"><path d=\"M170 42 22 124v14a12 12 0 0 0 12 12h78a12 12 0 0 0 12-12v-9.5\"/><path d=\"M170 150 22 68V54a12 12 0 0 1 12-12h78a12 12 0 0 1 12 12v9.5\"/></svg>",
    "plans": [
      {
        "duration": "6 Months",
        "usdPrice": 13,
        "usdOldPrice": 59.99,
        "price": 19500,
        "oldPrice": 89985,
        "discount": "78% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "snapchat-plus-3m",
    "name": "Snapchat Plus+ 3 Months",
    "rawName": "Snapchat Plus+ 3 Months · $5.00",
    "category": "social",
    "brand": "Snapchat",
    "duration": "3 Months",
    "usdPrice": 5,
    "usdOldPrice": 14.99,
    "discount": "66% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "1.4k",
    "brandClass": "tile-snapchat",
    "iconType": "snapchat",
    "description": "Snapchat+ exclusive features: #1 BFF pin, story rewatch count, custom app icons, and AI Bitmoji pets.",
    "currPrice": 7500,
    "oldPrice": 22485,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFFC00\"><circle cx=\"12\" cy=\"12\" r=\"11\"/><path fill=\"#000\" d=\"M12 5.5c-2.3 0-3.8 1.6-3.8 3.5 0 .5.1 1.2.3 1.6-.6.2-1.2.6-1.2 1.2 0 .5.3.8.7.9-.1.3-.2.7-.2 1 0 1.2.9 2.1 2.3 2.3-.2.3-.6.6-1.2.8-.4.1-.7.4-.7.8 0 .6.7.9 1.6.9 1.1 0 1.9-.3 2.2-.8.3.5 1.1.8 2.2.8.9 0 1.6-.3 1.6-.9 0-.4-.3-.7-.7-.8-.6-.2-1-.5-1.2-.8 1.4-.2 2.3-1.1 2.3-2.3 0-.3-.1-.7-.2-1 .4-.1.7-.4.7-.9 0-.6-.6-1-1.2-1.2.2-.4.3-1.1.3-1.6 0-1.9-1.5-3.5-3.8-3.5z\"/></svg>",
    "plans": [
      {
        "duration": "3 Months",
        "usdPrice": 5,
        "usdOldPrice": 14.99,
        "price": 7500,
        "oldPrice": 22485,
        "discount": "66% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "peacock-1y",
    "name": "Peacock Official Subscription 1 Year",
    "rawName": "Peacock Official Subscription 1 Year · $6.00",
    "category": "streaming",
    "brand": "Peacock",
    "duration": "1 Year",
    "usdPrice": 6,
    "usdOldPrice": 79.99,
    "discount": "92% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "810",
    "brandClass": "tile-peacock",
    "iconType": "peacock",
    "description": "Peacock streaming: Premier League live, WWE network, live sports, and blockbuster films for 1 year.",
    "currPrice": 9000,
    "oldPrice": 119985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\"><circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"#000\"/><circle cx=\"7\" cy=\"10\" r=\"2.5\" fill=\"#00A3E0\"/><circle cx=\"12\" cy=\"7\" r=\"2.5\" fill=\"#78BE20\"/><circle cx=\"17\" cy=\"10\" r=\"2.5\" fill=\"#FFB81C\"/><circle cx=\"15\" cy=\"15\" r=\"2.5\" fill=\"#E4002B\"/><circle cx=\"9\" cy=\"15\" r=\"2.5\" fill=\"#7F25FB\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 6,
        "usdOldPrice": 79.99,
        "price": 9000,
        "oldPrice": 119985,
        "discount": "92% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "elevenlabs-10k-credits",
    "name": "ElevenLabs Free 10k Credits",
    "rawName": "ElevenLabs Free 10k Credits · $1.50",
    "category": "ai",
    "brand": "ElevenLabs",
    "duration": "10k Credits",
    "usdPrice": 1.5,
    "usdOldPrice": 5,
    "discount": "70% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "1.1k",
    "brandClass": "tile-elevenlabs",
    "iconType": "elevenlabs",
    "description": "Industry-leading AI voice cloning and lifelike text-to-speech with ElevenLabs 10k character tokens.",
    "currPrice": 2250,
    "oldPrice": 7500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFF\"><path d=\"M4.6035 0v24h4.9317V0zm9.8613 0v24h4.9317V0z\"/></svg>",
    "plans": [
      {
        "duration": "10k Credits",
        "usdPrice": 1.5,
        "usdOldPrice": 5,
        "price": 2250,
        "oldPrice": 7500,
        "discount": "70% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "gamma-ai-plus-1m",
    "name": "Gamma AI Plus 1 Month",
    "rawName": "Gamma AI Plus 1 Month · $11.00",
    "category": "ai",
    "brand": "Gamma AI",
    "duration": "1 Month",
    "usdPrice": 11,
    "usdOldPrice": 20,
    "discount": "45% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "780",
    "brandClass": "tile-gamma",
    "iconType": "gamma",
    "description": "Generate stunning presentations, web pages, and documents in seconds with Gamma AI Plus.",
    "currPrice": 16500,
    "oldPrice": 30000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><path d=\"M12 2L3 7v10l9 5 9-5V7l-9-5z\" fill=\"url(#gammaGrad)\"/><path d=\"M12 2v20M3 7l18 10M3 17L21 7\" stroke=\"#FFF\" stroke-width=\"0.75\" stroke-opacity=\"0.4\"/><defs><linearGradient id=\"gammaGrad\" x1=\"3\" y1=\"2\" x2=\"21\" y2=\"22\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#8B5CF6\"/><stop offset=\"1\" stop-color=\"#EC4899\"/></linearGradient></defs></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 11,
        "usdOldPrice": 20,
        "price": 16500,
        "oldPrice": 30000,
        "discount": "45% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "magic-patterns-12m",
    "name": "Magic Patterns Starter 12M",
    "rawName": "Magic Patterns Starter 12M · $3.50",
    "category": "design",
    "brand": "Magic Patterns",
    "duration": "12 Months",
    "usdPrice": 3.5,
    "usdOldPrice": 36,
    "discount": "90% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "260",
    "brandClass": "tile-design",
    "iconType": "design",
    "description": "AI prototyping canvas for React, Tailwind, and Figma UI design components.",
    "currPrice": 5250,
    "oldPrice": 54000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><rect width=\"24\" height=\"24\" rx=\"6\" fill=\"#8B5CF6\"/><path d=\"M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8L12 4z\" fill=\"#FFF\"/></svg>",
    "plans": [
      {
        "duration": "12 Months",
        "usdPrice": 3.5,
        "usdOldPrice": 36,
        "price": 5250,
        "oldPrice": 54000,
        "discount": "90% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "mobbin-10x-12m",
    "name": "Mobbin 10x Seat 12M",
    "rawName": "Mobbin 10x Seat 12M · $9.00",
    "category": "design",
    "brand": "Mobbin",
    "duration": "12 Months (10x Seat)",
    "usdPrice": 9,
    "usdOldPrice": 96,
    "discount": "90% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "920",
    "brandClass": "tile-mobbin",
    "iconType": "mobbin",
    "description": "Discover the latest iOS, Android, and web design patterns with Mobbin Pro 10x seats.",
    "currPrice": 13500,
    "oldPrice": 144000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><rect width=\"24\" height=\"24\" rx=\"6\" fill=\"#18181B\"/><path d=\"M6 17V7l6 6 6-6v10\" stroke=\"#FFF\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    "plans": [
      {
        "duration": "12 Months (10x Seat)",
        "usdPrice": 9,
        "usdOldPrice": 96,
        "price": 13500,
        "oldPrice": 144000,
        "discount": "90% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "brain-fm-1y",
    "name": "Brain.fm 1 Year",
    "rawName": "Brain.fm 1 Year · $6.70",
    "category": "productivity",
    "brand": "Brain.fm",
    "duration": "1 Year",
    "usdPrice": 6.7,
    "usdOldPrice": 69.99,
    "discount": "90% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "570",
    "brandClass": "tile-brainfm",
    "iconType": "audio",
    "description": "Functional music designed to improve focus, flow state, relaxation, and deep sleep.",
    "currPrice": 10050,
    "oldPrice": 104985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"#0EA5E9\"/><path d=\"M6 12c0-3.3 2.7-6 6-6s6 2.7 6 6M8.5 12c0-1.9 1.6-3.5 3.5-3.5s3.5 1.6 3.5 3.5M11 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z\" stroke=\"#FFF\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 6.7,
        "usdOldPrice": 69.99,
        "price": 10050,
        "oldPrice": 104985,
        "discount": "90% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "customer-io-1y",
    "name": "Customer.io Essentials 1Y",
    "rawName": "Customer.io Essentials 1Y · $7.00",
    "category": "productivity",
    "brand": "Customer.io",
    "duration": "1 Year",
    "usdPrice": 7,
    "usdOldPrice": 100,
    "discount": "93% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "310",
    "brandClass": "tile-customerio",
    "iconType": "mail",
    "description": "Automated email messaging, newsletters, and user behavioral triggers on Customer.io.",
    "currPrice": 10500,
    "oldPrice": 150000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><rect width=\"24\" height=\"24\" rx=\"6\" fill=\"#FBBF24\"/><path d=\"M5 8l7 5 7-5v8H5V8zm0-2h14a1 1 0 0 1 1 1v1.5l-8 5.7-8-5.7V7a1 1 0 0 1 1-1z\" fill=\"#1E293B\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 7,
        "usdOldPrice": 100,
        "price": 10500,
        "oldPrice": 150000,
        "discount": "93% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "fin-ai-advanced",
    "name": "Fin AI + Advanced",
    "rawName": "Fin AI + Advanced · $7.00",
    "category": "ai",
    "brand": "Fin AI",
    "duration": "Advanced Plan",
    "usdPrice": 7,
    "usdOldPrice": 35,
    "discount": "80% OFF",
    "inStock": true,
    "rating": 4.6,
    "reviews": "280",
    "brandClass": "tile-finai",
    "iconType": "ai",
    "description": "Autonomous AI customer service and support agent with advanced resolution engine.",
    "currPrice": 10500,
    "oldPrice": 52500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"#000\"/><path d=\"M7 8h10M7 12h7M7 16h4\" stroke=\"#00D4FF\" stroke-width=\"2.5\" stroke-linecap=\"round\"/></svg>",
    "plans": [
      {
        "duration": "Advanced Plan",
        "usdPrice": 7,
        "usdOldPrice": 35,
        "price": 10500,
        "oldPrice": 52500,
        "discount": "80% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "snapchat-plus-6m",
    "name": "Snapchat Plus+ 6 Months",
    "rawName": "Snapchat Plus+ 6 Months · $8.00",
    "category": "social",
    "brand": "Snapchat",
    "duration": "6 Months",
    "usdPrice": 8,
    "usdOldPrice": 24.99,
    "discount": "68% OFF",
    "inStock": true,
    "rating": 4.8,
    "reviews": "1.9k",
    "brandClass": "tile-snapchat",
    "iconType": "snapchat",
    "description": "Snapchat+ semi-annual subscription with premium story boosts and custom themes.",
    "currPrice": 12000,
    "oldPrice": 37485,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFFC00\"><circle cx=\"12\" cy=\"12\" r=\"11\"/><path fill=\"#000\" d=\"M12 5.5c-2.3 0-3.8 1.6-3.8 3.5 0 .5.1 1.2.3 1.6-.6.2-1.2.6-1.2 1.2 0 .5.3.8.7.9-.1.3-.2.7-.2 1 0 1.2.9 2.1 2.3 2.3-.2.3-.6.6-1.2.8-.4.1-.7.4-.7.8 0 .6.7.9 1.6.9 1.1 0 1.9-.3 2.2-.8.3.5 1.1.8 2.2.8.9 0 1.6-.3 1.6-.9 0-.4-.3-.7-.7-.8-.6-.2-1-.5-1.2-.8 1.4-.2 2.3-1.1 2.3-2.3 0-.3-.1-.7-.2-1 .4-.1.7-.4.7-.9 0-.6-.6-1-1.2-1.2.2-.4.3-1.1.3-1.6 0-1.9-1.5-3.5-3.8-3.5z\"/></svg>",
    "plans": [
      {
        "duration": "6 Months",
        "usdPrice": 8,
        "usdOldPrice": 24.99,
        "price": 12000,
        "oldPrice": 37485,
        "discount": "68% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "warp-build-1y",
    "name": "Warp Build 1 Year",
    "rawName": "Warp Build 1 Year · $6.00",
    "category": "productivity",
    "brand": "Warp",
    "duration": "1 Year",
    "usdPrice": 6,
    "usdOldPrice": 60,
    "discount": "90% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "830",
    "brandClass": "tile-warp",
    "iconType": "terminal",
    "description": "Warp modern 21st-century terminal with AI command search, workflow sharing, and fast cloud builds.",
    "currPrice": 9000,
    "oldPrice": 90000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#01B0FF\"><path d=\"M12.035 2.723h9.253A2.712 2.712 0 0 1 24 5.435v10.529a2.712 2.712 0 0 1-2.712 2.712H9.254a2.712 2.712 0 0 1-2.712-2.712V5.435a2.712 2.712 0 0 1 2.712-2.712h2.781zm-9.323 2.712A2.712 2.712 0 0 0 0 8.147v10.418a2.712 2.712 0 0 0 2.712 2.712h12.035a2.712 2.712 0 0 0 2.712-2.712V16.89H5.424A2.712 2.712 0 0 1 2.712 14.178V5.435z\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 6,
        "usdOldPrice": 60,
        "price": 9000,
        "oldPrice": 90000,
        "discount": "90% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "wink-smile-7d",
    "name": "Wink Smile+ 7 Days",
    "rawName": "Wink Smile+ 7 Days · $2.30",
    "category": "design",
    "brand": "Wink Smile",
    "duration": "7 Days",
    "usdPrice": 2.3,
    "usdOldPrice": 7.99,
    "discount": "71% OFF",
    "inStock": true,
    "rating": 4.5,
    "reviews": "210",
    "brandClass": "tile-design",
    "iconType": "video",
    "description": "AI video portrait retouching, HD quality restoration, and facial enhancement for 7 days.",
    "currPrice": 3450,
    "oldPrice": 11985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"#EC4899\"/><path d=\"M8 10h.01M16 10h.01M8 14c1.5 2 6.5 2 8 0\" stroke=\"#FFF\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>",
    "plans": [
      {
        "duration": "7 Days",
        "usdPrice": 2.3,
        "usdOldPrice": 7.99,
        "price": 3450,
        "oldPrice": 11985,
        "discount": "71% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "readwise-1y",
    "name": "Readwise 1 Year",
    "rawName": "Readwise 1 Year · $5.50",
    "category": "learning",
    "brand": "Readwise",
    "duration": "1 Year",
    "usdPrice": 5.5,
    "usdOldPrice": 96,
    "discount": "94% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.3k",
    "brandClass": "tile-readwise",
    "iconType": "book",
    "description": "Sync your Kindle highlights, articles, tweets, and notes into Notion/Obsidian with Readwise Reader.",
    "currPrice": 8250,
    "oldPrice": 144000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"#FACC15\"/><path d=\"M7 9h10M7 12h10M7 15h6\" stroke=\"#1F2937\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>",
    "plans": [
      {
        "duration": "1 Year",
        "usdPrice": 5.5,
        "usdOldPrice": 96,
        "price": 8250,
        "oldPrice": 144000,
        "discount": "94% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "supercut-pro-10seats-12m",
    "name": "Supercut Pro 10 Seats 12M",
    "rawName": "Supercut Pro 10 Seats 12M · $7.00",
    "category": "design",
    "brand": "Supercut",
    "duration": "12 Months (10 Seats)",
    "usdPrice": 7,
    "usdOldPrice": 120,
    "discount": "94% OFF",
    "inStock": true,
    "rating": 4.7,
    "reviews": "340",
    "brandClass": "tile-supercut",
    "iconType": "video",
    "description": "Video podcast silence and filler word remover with 10 collaborative team member seats.",
    "currPrice": 10500,
    "oldPrice": 180000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><rect width=\"24\" height=\"24\" rx=\"6\" fill=\"#6366F1\"/><path d=\"M4 8h16v11H4V8zm0-3h16l-2 3H2l2-3zm5 0l2 3M14 5l2 3\" stroke=\"#FFF\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
    "plans": [
      {
        "duration": "12 Months (10 Seats)",
        "usdPrice": 7,
        "usdOldPrice": 120,
        "price": 10500,
        "oldPrice": 180000,
        "discount": "94% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "autodesk-admin-access",
    "name": "Autodesk Admin Access",
    "rawName": "Autodesk Admin Access · $14.00",
    "category": "design",
    "brand": "Autodesk",
    "duration": "Annual Admin Access",
    "usdPrice": 14,
    "usdOldPrice": 250,
    "discount": "94% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "870",
    "brandClass": "tile-autodesk",
    "iconType": "autodesk",
    "description": "Autodesk Admin portal access granting AutoCAD, Revit, Maya, 3ds Max, and Inventor licenses.",
    "currPrice": 21000,
    "oldPrice": 375000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#0696D7\"><path d=\"m.129 20.202 14.7-9.136h7.625c.235 0 .445.188.445.445 0 .21-.092.305-.21.375l-7.79 4.79h8.496c.21 0 .445.188.445.445 0 .211-.117.375-.258.469L11.4 24H.74A.61.61 0 0 1 .13 23.39c0-.281.164-.539.398-.656l11.41-7.149H4.379c-.234 0-.445-.188-.445-.445 0-.211.094-.328.21-.399l7.84-4.812H3.535A.61.61 0 0 1 2.925 9.32c0-.281.164-.539.399-.656L15.348 0h8.047c.21 0 .445.188.445.445 0 .211-.117.375-.258.469L.129 20.202z\"/></svg>",
    "plans": [
      {
        "duration": "Annual Admin Access",
        "usdPrice": 14,
        "usdOldPrice": 250,
        "price": 21000,
        "oldPrice": 375000,
        "discount": "94% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "adobe-cc-pro-1m",
    "name": "Adobe CC Pro 1M",
    "rawName": "Adobe CC Pro 1M · $23.41",
    "category": "design",
    "brand": "Adobe",
    "duration": "1 Month",
    "usdPrice": 23.41,
    "usdOldPrice": 59.99,
    "discount": "61% OFF",
    "inStock": true,
    "rating": 4.9,
    "reviews": "3.1k",
    "brandClass": "tile-adobe",
    "iconType": "adobe",
    "description": "Complete Adobe Creative Cloud All Apps: Photoshop, Illustrator, Premiere Pro, After Effects, and 100GB Cloud.",
    "currPrice": 35115,
    "oldPrice": 89985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FA0F00\"><path d=\"M13.96 22H18.9L12.04 4.5h-.08L5.1 22h4.94l2-5.4h3.92l-2-5.4zM24 2h-7.6L24 22V2zM0 2h7.6L0 22V2z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 23.41,
        "usdOldPrice": 59.99,
        "price": 35115,
        "oldPrice": 89985,
        "discount": "61% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "chatgpt-plus-w12h",
    "name": "ChatGPT Plus 1M [W12H]",
    "rawName": "ChatGPT Plus 1M [W12H] · $8.20",
    "category": "ai",
    "brand": "ChatGPT",
    "duration": "1 Month [W12H]",
    "usdPrice": 8.2,
    "usdOldPrice": 20,
    "discount": "59% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "920",
    "brandClass": "tile-chatgpt",
    "iconType": "chatgpt",
    "description": "ChatGPT Plus 1 Month guaranteed with 12h warranty replacement window. Currently sold out.",
    "currPrice": 12300,
    "oldPrice": 30000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month [W12H]",
        "usdPrice": 8.2,
        "usdOldPrice": 20,
        "price": 12300,
        "oldPrice": 30000,
        "discount": "59% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "chatgpt-plus-applepay",
    "name": "ChatGPT Plus 1 Month Apple Pay",
    "rawName": "ChatGPT Plus 1 Month Apple Pay · $8.30",
    "category": "ai",
    "brand": "ChatGPT",
    "duration": "1 Month",
    "usdPrice": 8.3,
    "usdOldPrice": 20,
    "discount": "58% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "640",
    "brandClass": "tile-chatgpt",
    "iconType": "chatgpt",
    "description": "ChatGPT Plus activated through Apple Pay billing. Currently sold out.",
    "currPrice": 12450,
    "oldPrice": 30000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 8.3,
        "usdOldPrice": 20,
        "price": 12450,
        "oldPrice": 30000,
        "discount": "58% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "chatgpt-plus-momopay",
    "name": "ChatGPT Plus Momo Pay 1 Month",
    "rawName": "ChatGPT Plus Momo Pay 1 Month · $6.00",
    "category": "ai",
    "brand": "ChatGPT",
    "duration": "1 Month",
    "usdPrice": 6,
    "usdOldPrice": 20,
    "discount": "70% OFF",
    "inStock": false,
    "rating": 4.7,
    "reviews": "410",
    "brandClass": "tile-chatgpt",
    "iconType": "chatgpt",
    "description": "ChatGPT Plus via Momo wallet payment channel. Currently sold out.",
    "currPrice": 9000,
    "oldPrice": 30000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 6,
        "usdOldPrice": 20,
        "price": 9000,
        "oldPrice": 30000,
        "discount": "70% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "codex-api-100m-1d",
    "name": "Codex API 100M Tokens 1 Day",
    "rawName": "Codex API 100M Tokens 1 Day · $5.00",
    "category": "ai",
    "brand": "OpenAI Codex",
    "duration": "1 Day (100M Tokens)",
    "usdPrice": 5,
    "usdOldPrice": 25,
    "discount": "80% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "530",
    "brandClass": "tile-codex",
    "iconType": "codex",
    "description": "Codex API high-volume 100M tokens daily key. Currently sold out.",
    "currPrice": 7500,
    "oldPrice": 37500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "1 Day (100M Tokens)",
        "usdPrice": 5,
        "usdOldPrice": 25,
        "price": 7500,
        "oldPrice": 37500,
        "discount": "80% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "capcut-pro-7d-soldout",
    "name": "CapCut Pro 7D",
    "rawName": "CapCut Pro 7D · $0.50",
    "category": "design",
    "brand": "CapCut",
    "duration": "7 Days",
    "usdPrice": 0.5,
    "usdOldPrice": 2.99,
    "discount": "83% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "1.2k",
    "brandClass": "tile-capcut",
    "iconType": "capcut",
    "description": "CapCut Pro 7-day single activation key. Currently sold out.",
    "currPrice": 750,
    "oldPrice": 4485,
    "brandSymbol": "<svg viewBox=\"0 0 192 192\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"#FFFFFF\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"16\"><path d=\"M170 42 22 124v14a12 12 0 0 0 12 12h78a12 12 0 0 0 12-12v-9.5\"/><path d=\"M170 150 22 68V54a12 12 0 0 1 12-12h78a12 12 0 0 1 12 12v9.5\"/></svg>",
    "plans": [
      {
        "duration": "7 Days",
        "usdPrice": 0.5,
        "usdOldPrice": 2.99,
        "price": 750,
        "oldPrice": 4485,
        "discount": "83% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "chatgpt-plus-ggpay",
    "name": "ChatGPT Plus GGPay 1 Month",
    "rawName": "ChatGPT Plus GGPay 1 Month · $8.88",
    "category": "ai",
    "brand": "ChatGPT",
    "duration": "1 Month",
    "usdPrice": 8.88,
    "usdOldPrice": 20,
    "discount": "55% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "310",
    "brandClass": "tile-chatgpt",
    "iconType": "chatgpt",
    "description": "ChatGPT Plus 1-month via GGPay. Currently sold out.",
    "currPrice": 13320,
    "oldPrice": 30000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 8.88,
        "usdOldPrice": 20,
        "price": 13320,
        "oldPrice": 30000,
        "discount": "55% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "chatgpt-plus-googlepay",
    "name": "ChatGPT Plus Google Pay 1 Month",
    "rawName": "ChatGPT Plus Google Pay 1 Month · $8.00",
    "category": "ai",
    "brand": "ChatGPT",
    "duration": "1 Month",
    "usdPrice": 8,
    "usdOldPrice": 20,
    "discount": "60% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "820",
    "brandClass": "tile-chatgpt",
    "iconType": "chatgpt",
    "description": "ChatGPT Plus 1-month subscription charged to Google Play. Currently sold out.",
    "currPrice": 12000,
    "oldPrice": 30000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#10A37F\"><path d=\"M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 8,
        "usdOldPrice": 20,
        "price": 12000,
        "oldPrice": 30000,
        "discount": "60% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "surfshark-vpn-2m-code",
    "name": "Surfshark VPN 2M Code",
    "rawName": "Surfshark VPN 2M Code · $1.00",
    "category": "security",
    "brand": "Surfshark",
    "duration": "2 Months",
    "usdPrice": 1,
    "usdOldPrice": 25,
    "discount": "96% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "1.5k",
    "brandClass": "tile-surfshark",
    "iconType": "surfshark",
    "description": "Surfshark VPN 2 Months voucher code with unlimited simultaneous device connections. Currently sold out.",
    "currPrice": 1500,
    "oldPrice": 37500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#17B794\"><path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07c-2.83-.48-5-2.94-5-5.93 0-3.31 2.69-6 6-6s6 2.69 6 6c0 2.99-2.17 5.45-5 5.93z\"/></svg>",
    "plans": [
      {
        "duration": "2 Months",
        "usdPrice": 1,
        "usdOldPrice": 25,
        "price": 1500,
        "oldPrice": 37500,
        "discount": "96% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "admin-netflix-4k-1m-5profiles",
    "name": "Admin Netflix 4K Premium 1M 5 Profiles",
    "rawName": "Admin Netflix 4K Premium 1M 5 Profiles · $2.50",
    "category": "streaming",
    "brand": "Netflix",
    "duration": "1 Month (5 Profiles Admin)",
    "usdPrice": 2.5,
    "usdOldPrice": 19.99,
    "discount": "87% OFF",
    "inStock": false,
    "rating": 4.9,
    "reviews": "4.1k",
    "brandClass": "tile-netflix",
    "iconType": "netflix",
    "description": "Netflix 4K Ultra HD full admin access with 5 private customizable PIN profiles. Currently sold out.",
    "currPrice": 3750,
    "oldPrice": 29985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#E50914\"><path d=\"m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.355V0h-4.715zM5.398 14.828V24h4.715V1.473L5.398 14.828z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month (5 Profiles Admin)",
        "usdPrice": 2.5,
        "usdOldPrice": 19.99,
        "price": 3750,
        "oldPrice": 29985,
        "discount": "87% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "claude-api-50m-3d",
    "name": "Claude API 50M Tokens 3 Days",
    "rawName": "Claude API 50M Tokens 3 Days · $6.00",
    "category": "ai",
    "brand": "Claude",
    "duration": "3 Days (50M Tokens)",
    "usdPrice": 6,
    "usdOldPrice": 22,
    "discount": "72% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "970",
    "brandClass": "tile-claude",
    "iconType": "claude",
    "description": "Anthropic Claude API 50M token quota spread across 3 calendar days. Currently sold out.",
    "currPrice": 9000,
    "oldPrice": 33000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#D97706\"><path d=\"M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z\"/></svg>",
    "plans": [
      {
        "duration": "3 Days (50M Tokens)",
        "usdPrice": 6,
        "usdOldPrice": 22,
        "price": 9000,
        "oldPrice": 33000,
        "discount": "72% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "proton-vpn-plus-1m",
    "name": "Proton VPN Plus 1 Month",
    "rawName": "Proton VPN Plus 1 Month · $3.00",
    "category": "security",
    "brand": "Proton VPN",
    "duration": "1 Month",
    "usdPrice": 3,
    "usdOldPrice": 9.99,
    "discount": "70% OFF",
    "inStock": false,
    "rating": 4.9,
    "reviews": "1.8k",
    "brandClass": "tile-proton",
    "iconType": "proton",
    "description": "Swiss-based high security Proton VPN Plus with NetShield adblocker and Secure Core architecture. Currently sold out.",
    "currPrice": 4500,
    "oldPrice": 14985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#6D4AFF\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path fill=\"#FFF\" d=\"M12 6a6 6 0 0 0-6 6c0 2.2 1.2 4.1 3 5.2V14a3 3 0 0 1 3-3h3.8A5.98 5.98 0 0 0 12 6z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 3,
        "usdOldPrice": 9.99,
        "price": 4500,
        "oldPrice": 14985,
        "discount": "70% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "capcut-pro-3m",
    "name": "CapCut Pro 3 Months",
    "rawName": "CapCut Pro 3 Months · $6.00",
    "category": "design",
    "brand": "CapCut",
    "duration": "3 Months",
    "usdPrice": 6,
    "usdOldPrice": 29.99,
    "discount": "80% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "890",
    "brandClass": "tile-capcut",
    "iconType": "capcut",
    "description": "CapCut Pro 3 Months quarter subscription. Currently sold out.",
    "currPrice": 9000,
    "oldPrice": 44985,
    "brandSymbol": "<svg viewBox=\"0 0 192 192\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"#FFFFFF\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"16\"><path d=\"M170 42 22 124v14a12 12 0 0 0 12 12h78a12 12 0 0 0 12-12v-9.5\"/><path d=\"M170 150 22 68V54a12 12 0 0 1 12-12h78a12 12 0 0 1 12 12v9.5\"/></svg>",
    "plans": [
      {
        "duration": "3 Months",
        "usdPrice": 6,
        "usdOldPrice": 29.99,
        "price": 9000,
        "oldPrice": 44985,
        "discount": "80% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "xbox-account",
    "name": "Xbox Account",
    "rawName": "Xbox Account · $1.00",
    "category": "gaming",
    "brand": "Xbox",
    "duration": "Account Access",
    "usdPrice": 1,
    "usdOldPrice": 14.99,
    "discount": "93% OFF",
    "inStock": false,
    "rating": 4.7,
    "reviews": "620",
    "brandClass": "tile-xbox",
    "iconType": "xbox",
    "description": "Pre-activated Xbox player account. Currently sold out.",
    "currPrice": 1500,
    "oldPrice": 22485,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#107C10\"><path d=\"M3.663 20.183A11.96 11.96 0 0 0 12 24c3.21 0 6.13-1.263 8.337-3.317a11.97 11.97 0 0 0 2.946-4.636c-1.34 1.49-3.792 2.657-6.574 3.033 1.942-.98 3.513-2.392 4.417-3.923-1.637 1.13-4.045 1.96-6.792 2.146 1.542-.924 2.766-2.188 3.407-3.515-2.257.94-5.06 1.464-7.741 1.464-2.68 0-5.484-.524-7.74-1.464.64 1.327 1.864 2.59 3.406 3.515-2.747-.186-5.155-1.016-6.792-2.146.904 1.53 2.475 2.943 4.417 3.923-2.782-.376-5.234-1.543-6.574-3.033.722 1.74 1.764 3.328 2.946 4.636zM12 0C6.545 0 1.922 3.655.438 8.643c1.554-.86 4.093-1.472 7.027-1.642-1.047 1.04-1.89 2.37-2.38 3.784 2.05-1.272 4.542-2.03 7.242-2.03 2.7 0 5.192.758 7.242 2.03-.49-1.414-1.333-2.744-2.38-3.784 2.934.17 5.473.782 7.027 1.642C22.078 3.655 17.455 0 12 0z\"/></svg>",
    "plans": [
      {
        "duration": "Account Access",
        "usdPrice": 1,
        "usdOldPrice": 14.99,
        "price": 1500,
        "oldPrice": 22485,
        "discount": "93% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "klingai-750-1100-credits-1m",
    "name": "KlingAI 750-1100 Credits 1M",
    "rawName": "KlingAI 750-1100 Credits 1M · $11.38",
    "category": "ai",
    "brand": "Kling AI",
    "duration": "1 Month (750-1100 Credits)",
    "usdPrice": 11.38,
    "usdOldPrice": 35,
    "discount": "67% OFF",
    "inStock": false,
    "rating": 4.9,
    "reviews": "410",
    "brandClass": "tile-kling",
    "iconType": "kling",
    "description": "High tier Kling AI video generation credits package for studio production. Currently sold out.",
    "currPrice": 17070,
    "oldPrice": 52500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FF5000\"><path clip-rule=\"evenodd\" fill-rule=\"evenodd\" d=\"M5.493 21.234c-1.112-1.451-1.109-4.263-.081-7.459l-4.557-2.63a1.683 1.683 0 01-.85-1.304 1.505 1.505 0 01.08-.622 13.18 13.18 0 011.037-2.255c3.476-6.02 10.916-8.23 16.619-4.938.46.266.82.67 1.081 1.184.785 1.545.685 4.096-.234 6.954l4.557 2.631c.339.196.596.492.736.832a1.53 1.53 0 01.034 1.093 13.146 13.146 0 01-1.037 2.255c-3.476 6.02-10.916 8.23-16.619 4.938a2.6 2.6 0 01-.766-.68zm11.096-6.615c-2.073 3.591-5.808 5.316-8.343 3.852-1.267-.731-1.994-2.122-2.145-3.778-.095-1.035.036-2.173.4-3.32.217-.684.517-1.37.902-2.039l.008-.014c2.073-3.59 5.808-5.315 8.343-3.852.633.366 1.13.895 1.49 1.54.986 1.772.922 4.415-.285 6.914-.111.23-.232.457-.362.683l-.008.014z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month (750-1100 Credits)",
        "usdPrice": 11.38,
        "usdOldPrice": 35,
        "price": 17070,
        "oldPrice": 52500,
        "discount": "67% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "outlook-hotmail-account",
    "name": "Outlook / Hotmail Email Account",
    "rawName": "Outlook / Hotmail Email Account · $0.10",
    "category": "productivity",
    "brand": "Microsoft",
    "duration": "Instant Account",
    "usdPrice": 0.1,
    "usdOldPrice": 1,
    "discount": "90% OFF",
    "inStock": false,
    "rating": 4.6,
    "reviews": "3.1k",
    "brandClass": "tile-microsoft",
    "iconType": "microsoft",
    "description": "Fresh POP3/IMAP enabled Outlook / Hotmail email account. Currently sold out.",
    "currPrice": 150,
    "oldPrice": 1500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\"><path fill=\"#F25022\" d=\"M1 1h10v10H1z\"/><path fill=\"#7FBA00\" d=\"M13 1h10v10H13z\"/><path fill=\"#00A4EF\" d=\"M1 13h10v10H1z\"/><path fill=\"#FFB900\" d=\"M13 13h10v10H13z\"/></svg>",
    "plans": [
      {
        "duration": "Instant Account",
        "usdPrice": 0.1,
        "usdOldPrice": 1,
        "price": 150,
        "oldPrice": 1500,
        "discount": "90% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "windows-10-pro-retail-key",
    "name": "Windows 10 Pro Retail Key",
    "rawName": "Windows 10 Pro Retail Key · $3.00",
    "category": "productivity",
    "brand": "Microsoft",
    "duration": "Lifetime Retail License",
    "usdPrice": 3,
    "usdOldPrice": 199.99,
    "discount": "98% OFF",
    "inStock": false,
    "rating": 4.9,
    "reviews": "5.2k",
    "brandClass": "tile-microsoft",
    "iconType": "microsoft",
    "description": "Genuine digital retail license key for Windows 10/11 Pro with lifetime activation. Currently sold out.",
    "currPrice": 4500,
    "oldPrice": 299985,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\"><path fill=\"#F25022\" d=\"M1 1h10v10H1z\"/><path fill=\"#7FBA00\" d=\"M13 1h10v10H13z\"/><path fill=\"#00A4EF\" d=\"M1 13h10v10H1z\"/><path fill=\"#FFB900\" d=\"M13 13h10v10H13z\"/></svg>",
    "plans": [
      {
        "duration": "Lifetime Retail License",
        "usdPrice": 3,
        "usdOldPrice": 199.99,
        "price": 4500,
        "oldPrice": 299985,
        "discount": "98% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "nordvpn-3m-code",
    "name": "NordVPN 3 Months Code",
    "rawName": "NordVPN 3 Months Code · $3.75",
    "category": "security",
    "brand": "NordVPN",
    "duration": "3 Months Voucher Code",
    "usdPrice": 3.75,
    "usdOldPrice": 39,
    "discount": "90% OFF",
    "inStock": false,
    "rating": 4.9,
    "reviews": "2.4k",
    "brandClass": "tile-vpn",
    "iconType": "vpn",
    "description": "NordVPN 3 months activation code with Threat Protection and Double VPN. Currently sold out.",
    "currPrice": 5625,
    "oldPrice": 58500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#0084FF\"><path d=\"M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z\"/></svg>",
    "plans": [
      {
        "duration": "3 Months Voucher Code",
        "usdPrice": 3.75,
        "usdOldPrice": 39,
        "price": 5625,
        "oldPrice": 58500,
        "discount": "90% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "nordvpn-1m",
    "name": "NordVPN 1 Month",
    "rawName": "NordVPN 1 Month · $2.70",
    "category": "security",
    "brand": "NordVPN",
    "duration": "1 Month",
    "usdPrice": 2.7,
    "usdOldPrice": 12.99,
    "discount": "79% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "1.9k",
    "brandClass": "tile-vpn",
    "iconType": "vpn",
    "description": "NordVPN 1 month high speed secure private connection. Currently sold out.",
    "currPrice": 4050,
    "oldPrice": 19485,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#0084FF\"><path d=\"M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z\"/></svg>",
    "plans": [
      {
        "duration": "1 Month",
        "usdPrice": 2.7,
        "usdOldPrice": 12.99,
        "price": 4050,
        "oldPrice": 19485,
        "discount": "79% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "notion-plus-12m",
    "name": "Notion Plus 12 Months",
    "rawName": "Notion Plus 12 Months · $2.50",
    "category": "productivity",
    "brand": "Notion",
    "duration": "12 Months",
    "usdPrice": 2.5,
    "usdOldPrice": 96,
    "discount": "97% OFF",
    "inStock": false,
    "rating": 4.9,
    "reviews": "1.4k",
    "brandClass": "tile-notion",
    "iconType": "notion",
    "description": "Notion Plus annual workspace subscription with unlimited blocks and file uploads. Currently sold out.",
    "currPrice": 3750,
    "oldPrice": 144000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFF\"><path d=\"M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.768c-.42-.326-.981-.7-2.055-.607L3.01 2.235c-.466.046-.56.326-.374.513l1.823 1.46zm.793 3.824v12.78c0 .793.42 1.073 1.26 1.026l14.288-.84c.84-.046.933-.56.933-1.166V6.96c0-.606-.373-.886-.98-.84l-14.52.84c-.653.047-.98.373-.98.84v.232zm13.12 1.352c.048.467 0 .934-.465.98l-.794.14v7.742c-.56.374-1.26.56-1.868.56-.98 0-1.447-.326-2.286-1.353l-4.106-6.436v6.297l1.493.326c.046.513-.374.933-.934.933l-3.36.187c-.046-.467.14-.933.607-.98l1.027-.234V9.81l-1.213-.093c-.047-.514.28-.934.84-.934l3.593-.233 4.293 6.576V9.436l-1.213-.14c-.047-.467.28-.933.84-.933l3.548-.233z\"/></svg>",
    "plans": [
      {
        "duration": "12 Months",
        "usdPrice": 2.5,
        "usdOldPrice": 96,
        "price": 3750,
        "oldPrice": 144000,
        "discount": "97% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "autodesk-edu-1y",
    "name": "Autodesk Education Plan 1 Year",
    "rawName": "Autodesk Education Plan 1 Year · $2.00",
    "category": "design",
    "brand": "Autodesk",
    "duration": "1 Year (Edu)",
    "usdPrice": 2,
    "usdOldPrice": 200,
    "discount": "99% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "950",
    "brandClass": "tile-autodesk",
    "iconType": "autodesk",
    "description": "Autodesk Education license for AutoCAD, Fusion 360, 3ds Max and Revit. Currently sold out.",
    "currPrice": 3000,
    "oldPrice": 300000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#0696D7\"><path d=\"m.129 20.202 14.7-9.136h7.625c.235 0 .445.188.445.445 0 .21-.092.305-.21.375l-7.79 4.79h8.496c.21 0 .445.188.445.445 0 .211-.117.375-.258.469L11.4 24H.74A.61.61 0 0 1 .13 23.39c0-.281.164-.539.398-.656l11.41-7.149H4.379c-.234 0-.445-.188-.445-.445 0-.211.094-.328.21-.399l7.84-4.812H3.535A.61.61 0 0 1 2.925 9.32c0-.281.164-.539.399-.656L15.348 0h8.047c.21 0 .445.188.445.445 0 .211-.117.375-.258.469L.129 20.202z\"/></svg>",
    "plans": [
      {
        "duration": "1 Year (Edu)",
        "usdPrice": 2,
        "usdOldPrice": 200,
        "price": 3000,
        "oldPrice": 300000,
        "discount": "99% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "autodesk-all-apps-3y",
    "name": "Autodesk All Apps 3-Year License",
    "rawName": "Autodesk All Apps 3-Year License · $2.50",
    "category": "design",
    "brand": "Autodesk",
    "duration": "3 Years (All Apps)",
    "usdPrice": 2.5,
    "usdOldPrice": 600,
    "discount": "99% OFF",
    "inStock": false,
    "rating": 4.9,
    "reviews": "1.1k",
    "brandClass": "tile-autodesk",
    "iconType": "autodesk",
    "description": "Comprehensive 3-year Autodesk suite access for design and architecture. Currently sold out.",
    "currPrice": 3750,
    "oldPrice": 900000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#0696D7\"><path d=\"m.129 20.202 14.7-9.136h7.625c.235 0 .445.188.445.445 0 .21-.092.305-.21.375l-7.79 4.79h8.496c.21 0 .445.188.445.445 0 .211-.117.375-.258.469L11.4 24H.74A.61.61 0 0 1 .13 23.39c0-.281.164-.539.398-.656l11.41-7.149H4.379c-.234 0-.445-.188-.445-.445 0-.211.094-.328.21-.399l7.84-4.812H3.535A.61.61 0 0 1 2.925 9.32c0-.281.164-.539.399-.656L15.348 0h8.047c.21 0 .445.188.445.445 0 .211-.117.375-.258.469L.129 20.202z\"/></svg>",
    "plans": [
      {
        "duration": "3 Years (All Apps)",
        "usdPrice": 2.5,
        "usdOldPrice": 600,
        "price": 3750,
        "oldPrice": 900000,
        "discount": "99% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "spotify-premium-3m-soldout",
    "name": "Spotify Premium 3M",
    "rawName": "Spotify Premium 3M · $1.50",
    "category": "streaming",
    "brand": "Spotify",
    "duration": "3 Months Promo",
    "usdPrice": 1.5,
    "usdOldPrice": 10.99,
    "discount": "86% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "3.1k",
    "brandClass": "tile-spotify",
    "iconType": "spotify",
    "description": "Spotify Premium 3-month code. Currently sold out.",
    "currPrice": 2250,
    "oldPrice": 16485,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#1ED760\"><path d=\"M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z\"/></svg>",
    "plans": [
      {
        "duration": "3 Months Promo",
        "usdPrice": 1.5,
        "usdOldPrice": 10.99,
        "price": 2250,
        "oldPrice": 16485,
        "discount": "86% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "steam-account",
    "name": "Steam Account",
    "rawName": "Steam Account · $1.00",
    "category": "gaming",
    "brand": "Steam",
    "duration": "Account Access",
    "usdPrice": 1,
    "usdOldPrice": 15,
    "discount": "93% OFF",
    "inStock": false,
    "rating": 4.7,
    "reviews": "820",
    "brandClass": "tile-gaming",
    "iconType": "game",
    "description": "Valve Steam gaming account pre-configured and region unlocked. Currently sold out.",
    "currPrice": 1500,
    "oldPrice": 22500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FFF\"><path d=\"M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.707L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z\"/></svg>",
    "plans": [
      {
        "duration": "Account Access",
        "usdPrice": 1,
        "usdOldPrice": 15,
        "price": 1500,
        "oldPrice": 22500,
        "discount": "93% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "deezer-account",
    "name": "Deezer Account",
    "rawName": "Deezer Account · $0.50",
    "category": "streaming",
    "brand": "Deezer",
    "duration": "Premium Access",
    "usdPrice": 0.5,
    "usdOldPrice": 10.99,
    "discount": "95% OFF",
    "inStock": false,
    "rating": 4.6,
    "reviews": "430",
    "brandClass": "tile-audio",
    "iconType": "audio",
    "description": "Deezer HiFi lossless FLAC audio streaming account. Currently sold out.",
    "currPrice": 750,
    "oldPrice": 16485,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#A238FF\"><path d=\"M.693 10.024c.381 0 .693-1.256.693-2.807 0-1.55-.312-2.807-.693-2.807C.312 4.41 0 5.666 0 7.217c0 1.551.312 2.807.693 2.807zm2.44 2.807c.383 0 .693-1.256.693-2.807 0-1.55-.31-2.807-.693-2.807-.381 0-.693 1.256-.693 2.807 0 1.551.312 2.807.693 2.807zm2.44 2.807c.383 0 .694-1.256.694-2.807 0-1.55-.311-2.807-.694-2.807-.381 0-.693 1.256-.693 2.807 0 1.551.312 2.807.693 2.807zm2.44 2.807c.383 0 .694-1.256.694-2.807 0-1.55-.311-2.807-.694-2.807-.381 0-.693 1.256-.693 2.807 0 1.551.312 2.807.693 2.807zm2.44 2.807c.383 0 .694-1.256.694-2.807 0-1.55-.311-2.807-.694-2.807-.381 0-.693 1.256-.693 2.807 0 1.551.312 2.807.693 2.807zm2.44-2.807c.383 0 .694-1.256.694-2.807 0-1.55-.311-2.807-.694-2.807-.381 0-.693 1.256-.693 2.807 0 1.551.312 2.807.693 2.807zm2.44-2.807c.383 0 .694-1.256.694-2.807 0-1.55-.311-2.807-.694-2.807-.381 0-.693 1.256-.693 2.807 0 1.551.312 2.807.693 2.807zm2.44-2.807c.383 0 .694-1.256.694-2.807 0-1.55-.311-2.807-.694-2.807-.381 0-.693 1.256-.693 2.807 0 1.551.312 2.807.693 2.807zm2.44-2.807c.383 0 .694-1.256.694-2.807 0-1.55-.311-2.807-.694-2.807-.381 0-.693 1.256-.693 2.807 0 1.551.312 2.807.693 2.807z\"/></svg>",
    "plans": [
      {
        "duration": "Premium Access",
        "usdPrice": 0.5,
        "usdOldPrice": 10.99,
        "price": 750,
        "oldPrice": 16485,
        "discount": "95% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "spotify-premium-2m-soldout",
    "name": "Spotify Premium 2M",
    "rawName": "Spotify Premium 2M · $4.00",
    "category": "streaming",
    "brand": "Spotify",
    "duration": "2 Months Individual",
    "usdPrice": 4,
    "usdOldPrice": 20,
    "discount": "80% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "1.2k",
    "brandClass": "tile-spotify",
    "iconType": "spotify",
    "description": "Spotify Premium 2-month upgrade. Currently sold out.",
    "currPrice": 6000,
    "oldPrice": 30000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#1ED760\"><path d=\"M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z\"/></svg>",
    "plans": [
      {
        "duration": "2 Months Individual",
        "usdPrice": 4,
        "usdOldPrice": 20,
        "price": 6000,
        "oldPrice": 30000,
        "discount": "80% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "prime-video-6m",
    "name": "Prime Video 6 Months",
    "rawName": "Prime Video 6 Months · $3.00",
    "category": "streaming",
    "brand": "Amazon Prime",
    "duration": "6 Months",
    "usdPrice": 3,
    "usdOldPrice": 53.94,
    "discount": "94% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "1.7k",
    "brandClass": "tile-streaming",
    "iconType": "video",
    "description": "Amazon Prime Video 6 months access to movies, series, and Amazon Originals in 4K. Currently sold out.",
    "currPrice": 4500,
    "oldPrice": 80910,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><path d=\"M2.5 16.5c3.2 2.2 7.1 3.5 11.2 3.5 3.1 0 6.2-.8 8.8-2.3.4-.2.4-.7.1-.9-.3-.2-.7-.1-.9.1-2.4 1.4-5.3 2.1-8 2.1-3.8 0-7.4-1.2-10.4-3.2-.4-.3-.9.1-.8.4z\" fill=\"#FF9900\"/><path d=\"M22.8 16.8c-.4-.5-2.5-.2-3.8.3-.3.1-.4.4-.1.6 1.4.9 2.5 1 2.8.7.4-.3.9-1.2 1.1-1.6z\" fill=\"#FF9900\"/><path d=\"M12 4.5c-3.5 0-6 2.5-6 6.5s2.5 6.5 6 6.5 6-2.5 6-6.5-2.5-6.5-6-6.5zm0 10.5c-2.2 0-3.5-1.8-3.5-4s1.3-4 3.5-4 3.5 1.8 3.5 4-1.3 4-3.5 4z\" fill=\"#00A8E1\"/></svg>",
    "plans": [
      {
        "duration": "6 Months",
        "usdPrice": 3,
        "usdOldPrice": 53.94,
        "price": 4500,
        "oldPrice": 80910,
        "discount": "94% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "apple-tv-6m",
    "name": "Apple TV+ 6 Months",
    "rawName": "Apple TV+ 6 Months · $4.50",
    "category": "streaming",
    "brand": "Apple TV+",
    "duration": "6 Months",
    "usdPrice": 4.5,
    "usdOldPrice": 59.94,
    "discount": "92% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "810",
    "brandClass": "tile-appletv",
    "iconType": "appletv",
    "description": "Apple TV+ 6 months streaming pass in 4K HDR. Currently sold out.",
    "currPrice": 6750,
    "oldPrice": 89910,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"30\" height=\"30\"><rect width=\"24\" height=\"24\" rx=\"6\" fill=\"#000\"/><path fill=\"#FFF\" d=\"M12.5 7.5c.6-.8 1-1.8.9-2.8-1 .1-2.1.7-2.7 1.4-.5.6-.9 1.6-.8 2.5 1.1.1 2-.5 2.6-1.1zm3.7 5.6c0-2.4 2-3.6 2.1-3.6-1.1-1.6-2.9-1.9-3.5-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.3 2.5 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.5 1-1.5 1.4-2.9 1.5-3-.1 0-2.9-1.1-2.9-4.2z\"/></svg>",
    "plans": [
      {
        "duration": "6 Months",
        "usdPrice": 4.5,
        "usdOldPrice": 59.94,
        "price": 6750,
        "oldPrice": 89910,
        "discount": "92% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "apple-tv-12m",
    "name": "Apple TV+ 12 Months",
    "rawName": "Apple TV+ 12 Months · $6.00",
    "category": "streaming",
    "brand": "Apple TV+",
    "duration": "12 Months",
    "usdPrice": 6,
    "usdOldPrice": 99,
    "discount": "94% OFF",
    "inStock": false,
    "rating": 4.9,
    "reviews": "1.4k",
    "brandClass": "tile-appletv",
    "iconType": "appletv",
    "description": "Apple TV+ full 1-year pass with Ted Lasso, Morning Show, and live sports. Currently sold out.",
    "currPrice": 9000,
    "oldPrice": 148500,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"30\" height=\"30\"><rect width=\"24\" height=\"24\" rx=\"6\" fill=\"#000\"/><path fill=\"#FFF\" d=\"M12.5 7.5c.6-.8 1-1.8.9-2.8-1 .1-2.1.7-2.7 1.4-.5.6-.9 1.6-.8 2.5 1.1.1 2-.5 2.6-1.1zm3.7 5.6c0-2.4 2-3.6 2.1-3.6-1.1-1.6-2.9-1.9-3.5-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.3 2.5 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.5 1-1.5 1.4-2.9 1.5-3-.1 0-2.9-1.1-2.9-4.2z\"/></svg>",
    "plans": [
      {
        "duration": "12 Months",
        "usdPrice": 6,
        "usdOldPrice": 99,
        "price": 9000,
        "oldPrice": 148500,
        "discount": "94% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "canva-pro-admin-panel",
    "name": "Canva Pro Admin Panel Without Leonardo AI",
    "rawName": "Canva Pro Admin Panel Without Leonardo AI · $3.00",
    "category": "design",
    "brand": "Canva",
    "duration": "Admin Panel Access",
    "usdPrice": 3,
    "usdOldPrice": 120,
    "discount": "97% OFF",
    "inStock": false,
    "rating": 4.8,
    "reviews": "960",
    "brandClass": "tile-canva",
    "iconType": "canva",
    "description": "Canva Pro team owner administrator panel for managing multiple seats. Currently sold out.",
    "currPrice": 4500,
    "oldPrice": 180000,
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"url(#canvaGrad)\"/><path d=\"M14.6 7.8c-.8-.5-1.8-.7-2.9-.5-2.5.5-4.4 2.8-4.4 5.3 0 2.2 1.6 3.9 3.8 3.9 1.4 0 2.6-.7 3.3-1.8.3-.4.2-1-.2-1.3-.4-.3-1-.2-1.3.2-.5.7-1.1 1.1-1.8 1.1-1.2 0-2.1-.9-2.1-2.1 0-1.8 1.4-3.4 3.1-3.7.7-.1 1.3 0 1.8.3.4.3 1 .1 1.3-.3.3-.4.2-1-.2-1.3z\" fill=\"#FFF\"/><defs><linearGradient id=\"canvaGrad\" x1=\"2\" y1=\"2\" x2=\"22\" y2=\"22\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#00C4CC\"/><stop offset=\"1\" stop-color=\"#7D2AE8\"/></linearGradient></defs></svg>",
    "plans": [
      {
        "duration": "Admin Panel Access",
        "usdPrice": 3,
        "usdOldPrice": 120,
        "price": 4500,
        "oldPrice": 180000,
        "discount": "97% OFF",
        "inStock": false
      }
    ]
  }
];

// --- CORE FLAGSHIP PRODUCTS (Grouped Brand Suites for Product Detail Views) ---
const CORE_PRODUCTS = [
  {
    "id": "google-gemini-pro",
    "name": "Google Gemini Pro",
    "category": "ai",
    "discount": "99% OFF",
    "discountPercent": 99,
    "duration": "18 Months",
    "usdPrice": 1,
    "usdOldPrice": 360,
    "currPrice": 1500,
    "oldPrice": 540000,
    "inStock": true,
    "rating": 4.9,
    "reviews": "4.8k",
    "brandClass": "tile-gemini",
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"32\" height=\"32\" fill=\"none\"><path d=\"M12 2C12 7.523 7.523 12 2 12C7.523 12 12 16.477 12 22C12 16.477 16.477 12 22 12C16.477 12 12 7.523 12 2Z\" fill=\"url(#gemGrad)\"/><defs><linearGradient id=\"gemGrad\" x1=\"2\" y1=\"2\" x2=\"22\" y2=\"22\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#1A73E8\"/><stop offset=\"0.5\" stop-color=\"#EA4335\"/><stop offset=\"1\" stop-color=\"#FBBC04\"/></linearGradient></defs></svg>",
    "description": "Google AI Gemini Advanced model with 2M token context window, 2TB Google One cloud storage, and AI integrated into Docs, Gmail, and Slides.",
    "plans": [
      {
        "duration": "18 Months ($1.00)",
        "usdPrice": 1,
        "usdOldPrice": 360,
        "price": 1500,
        "oldPrice": 540000,
        "discount": "99% OFF",
        "inStock": true
      },
      {
        "duration": "Google AI Pro 3M ($6.97)",
        "usdPrice": 6.97,
        "usdOldPrice": 19.99,
        "price": 10455,
        "oldPrice": 29985,
        "discount": "65% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "chatgpt-plus",
    "name": "ChatGPT Plus & Team",
    "category": "ai",
    "discount": "61% OFF",
    "discountPercent": 61,
    "duration": "30 Days",
    "usdPrice": 7.8,
    "usdOldPrice": 20,
    "currPrice": 11700,
    "oldPrice": 30000,
    "inStock": true,
    "rating": 4.9,
    "reviews": "3.8k",
    "brandClass": "tile-chatgpt",
    "brandSymbol": "<img src=\"assets/chatgpt-logo.jpg\" alt=\"OpenAI\" style=\"width:34px; height:34px; object-fit:contain; border-radius:6px;\">",
    "description": "OpenAI official subscription with GPT-4o, Advanced Voice Mode, DALL·E 3, code interpreter, and custom GPTs.",
    "plans": [
      {
        "duration": "ChatGPT Plus 30D ($7.80)",
        "usdPrice": 7.8,
        "usdOldPrice": 20,
        "price": 11700,
        "oldPrice": 30000,
        "discount": "61% OFF",
        "inStock": true
      },
      {
        "duration": "K12 Edu 24 Months ($4.95)",
        "usdPrice": 4.95,
        "usdOldPrice": 480,
        "price": 7425,
        "oldPrice": 720000,
        "discount": "98% OFF",
        "inStock": true
      },
      {
        "duration": "Business Team 1M ($18.00)",
        "usdPrice": 18,
        "usdOldPrice": 30,
        "price": 27000,
        "oldPrice": 45000,
        "discount": "40% OFF",
        "inStock": true
      },
      {
        "duration": "1M [W12H] ($8.20) [SOLD OUT]",
        "usdPrice": 8.2,
        "usdOldPrice": 20,
        "price": 12300,
        "oldPrice": 30000,
        "discount": "59% OFF",
        "inStock": false
      },
      {
        "duration": "Apple Pay 1M ($8.30) [SOLD OUT]",
        "usdPrice": 8.3,
        "usdOldPrice": 20,
        "price": 12450,
        "oldPrice": 30000,
        "discount": "58% OFF",
        "inStock": false
      },
      {
        "duration": "Google Pay 1M ($8.00) [SOLD OUT]",
        "usdPrice": 8,
        "usdOldPrice": 20,
        "price": 12000,
        "oldPrice": 30000,
        "discount": "60% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "claude-pro",
    "name": "Claude Pro & APIs",
    "category": "ai",
    "discount": "76% OFF",
    "discountPercent": 76,
    "duration": "100M Tokens 1D",
    "usdPrice": 6,
    "usdOldPrice": 25,
    "currPrice": 9000,
    "oldPrice": 37500,
    "inStock": true,
    "rating": 4.9,
    "reviews": "2.1k",
    "brandClass": "tile-claude",
    "brandSymbol": "<img src=\"assets/claude-icon.png\" alt=\"Claude\" style=\"width:34px; height:34px; object-fit:contain; border-radius:8px;\">",
    "description": "Anthropic Claude 3.5 Sonnet direct tokens and Pro access with Artifacts, 200k context window, and priority capacity.",
    "plans": [
      {
        "duration": "API 10M Tokens 1D ($3.00)",
        "usdPrice": 3,
        "usdOldPrice": 10,
        "price": 4500,
        "oldPrice": 15000,
        "discount": "70% OFF",
        "inStock": true
      },
      {
        "duration": "API 50M Tokens 1D ($5.00)",
        "usdPrice": 5,
        "usdOldPrice": 18,
        "price": 7500,
        "oldPrice": 27000,
        "discount": "72% OFF",
        "inStock": true
      },
      {
        "duration": "API 100M Tokens 1D ($6.00)",
        "usdPrice": 6,
        "usdOldPrice": 25,
        "price": 9000,
        "oldPrice": 37500,
        "discount": "76% OFF",
        "inStock": true
      },
      {
        "duration": "$100 API Credit 30D ($2.50)",
        "usdPrice": 2.5,
        "usdOldPrice": 100,
        "price": 3750,
        "oldPrice": 150000,
        "discount": "97% OFF",
        "inStock": true
      },
      {
        "duration": "API 50M Tokens 3D ($6.00) [SOLD OUT]",
        "usdPrice": 6,
        "usdOldPrice": 22,
        "price": 9000,
        "oldPrice": 33000,
        "discount": "72% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "capcut-pro",
    "name": "CapCut Pro Video Editor",
    "category": "design",
    "discount": "83% OFF",
    "discountPercent": 83,
    "duration": "7 Days - 6 Months",
    "usdPrice": 0.5,
    "usdOldPrice": 2.99,
    "currPrice": 750,
    "oldPrice": 4485,
    "inStock": true,
    "rating": 4.9,
    "reviews": "3.4k",
    "brandClass": "tile-capcut",
    "brandSymbol": "<img src=\"assets/capcut-icon.png\" alt=\"CapCut\" style=\"height:26px; max-width:85%; object-fit:contain; filter:brightness(0) invert(1);\">",
    "description": "CapCut Pro VIP Video Suite: Remove background, auto-captions in 90+ languages, 4K 60fps export, and exclusive transitions.",
    "plans": [
      {
        "duration": "CapCut Pro 7 Days ($0.50)",
        "usdPrice": 0.5,
        "usdOldPrice": 2.99,
        "price": 750,
        "oldPrice": 4485,
        "discount": "83% OFF",
        "inStock": true
      },
      {
        "duration": "CapCut Pro 1 Month ($2.50)",
        "usdPrice": 2.5,
        "usdOldPrice": 9.99,
        "price": 3750,
        "oldPrice": 14985,
        "discount": "75% OFF",
        "inStock": true
      },
      {
        "duration": "CapCut Pro Team 1M ($2.60)",
        "usdPrice": 2.6,
        "usdOldPrice": 9.99,
        "price": 3900,
        "oldPrice": 14985,
        "discount": "74% OFF",
        "inStock": true
      },
      {
        "duration": "CapCut Pro 6 Months ($13.00)",
        "usdPrice": 13,
        "usdOldPrice": 59.99,
        "price": 19500,
        "oldPrice": 89985,
        "discount": "78% OFF",
        "inStock": true
      },
      {
        "duration": "CapCut Pro 6M Personal ($14.00)",
        "usdPrice": 14,
        "usdOldPrice": 59.99,
        "price": 21000,
        "oldPrice": 89985,
        "discount": "76% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "duolingo-super",
    "name": "Duolingo Super",
    "category": "learning",
    "discount": "98% OFF",
    "discountPercent": 98,
    "duration": "2 Months - 12 Months",
    "usdPrice": 0.5,
    "usdOldPrice": 14,
    "currPrice": 750,
    "oldPrice": 21000,
    "inStock": true,
    "rating": 4.9,
    "reviews": "2.8k",
    "brandClass": "tile-duolingo",
    "brandSymbol": "<img src=\"assets/duolingo-icon.png\" alt=\"Duolingo\" style=\"width:34px; height:34px; object-fit:contain; border-radius:8px;\">",
    "description": "Master 40+ languages with Duolingo Super: Unlimited hearts, zero ads, unlimited test-outs, and targeted mistake review.",
    "plans": [
      {
        "duration": "Duolingo Super 2M ($0.50)",
        "usdPrice": 0.5,
        "usdOldPrice": 14,
        "price": 750,
        "oldPrice": 21000,
        "discount": "96% OFF",
        "inStock": true
      },
      {
        "duration": "Duolingo Super 12M ($1.00)",
        "usdPrice": 1,
        "usdOldPrice": 83.99,
        "price": 1500,
        "oldPrice": 125985,
        "discount": "98% OFF",
        "inStock": true
      },
      {
        "duration": "Super Duolingo Your Mail 12M ($9.00)",
        "usdPrice": 9,
        "usdOldPrice": 83.99,
        "price": 13500,
        "oldPrice": 125985,
        "discount": "89% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "canva-pro",
    "name": "Canva Pro Team",
    "category": "design",
    "discount": "91% OFF",
    "discountPercent": 91,
    "duration": "12 Months",
    "usdPrice": 4.5,
    "usdOldPrice": 55,
    "currPrice": 6750,
    "oldPrice": 82500,
    "inStock": true,
    "rating": 4.9,
    "reviews": "4.2k",
    "brandClass": "tile-canva",
    "brandSymbol": "<img src=\"assets/canva-icon.png\" alt=\"Canva\" style=\"width:34px; height:34px; object-fit:contain; border-radius:8px;\">",
    "description": "12-month Canva Pro Team seat: Access 100M+ premium stock photos, graphics, brand kits, background remover, and Magic Studio AI tools.",
    "plans": [
      {
        "duration": "12 Months Team ($4.50)",
        "usdPrice": 4.5,
        "usdOldPrice": 55,
        "price": 6750,
        "oldPrice": 82500,
        "discount": "91% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "microsoft-365",
    "name": "Microsoft 365 & Office",
    "category": "productivity",
    "discount": "97% OFF",
    "discountPercent": 97,
    "duration": "1 Year",
    "usdPrice": 1.6,
    "usdOldPrice": 69.99,
    "currPrice": 2400,
    "oldPrice": 104985,
    "inStock": true,
    "rating": 4.9,
    "reviews": "1.9k",
    "brandClass": "tile-microsoft",
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\"><path fill=\"#F25022\" d=\"M1 1h10v10H1z\"/><path fill=\"#7FBA00\" d=\"M13 1h10v10H13z\"/><path fill=\"#00A4EF\" d=\"M1 13h10v10H1z\"/><path fill=\"#FFB900\" d=\"M13 13h10v10H13z\"/></svg>",
    "description": "Full Microsoft 365 cloud productivity suite: Word, Excel, PowerPoint, Outlook, and 1TB OneDrive cloud storage.",
    "plans": [
      {
        "duration": "Office 365 Plus 1 Year ($1.60)",
        "usdPrice": 1.6,
        "usdOldPrice": 69.99,
        "price": 2400,
        "oldPrice": 104985,
        "discount": "97% OFF",
        "inStock": true
      },
      {
        "duration": "O365 Ready Account 6-12M ($4.00)",
        "usdPrice": 4,
        "usdOldPrice": 15,
        "price": 6000,
        "oldPrice": 22500,
        "discount": "73% OFF",
        "inStock": true
      },
      {
        "duration": "Microsoft 365 Family 5U 12M ($12.00)",
        "usdPrice": 12,
        "usdOldPrice": 99.99,
        "price": 18000,
        "oldPrice": 149985,
        "discount": "88% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "adobe-creative-suite",
    "name": "Adobe Creative Suite & Express",
    "category": "design",
    "discount": "99% OFF",
    "discountPercent": 99,
    "duration": "1M - 12M",
    "usdPrice": 0.5,
    "usdOldPrice": 99.99,
    "currPrice": 750,
    "oldPrice": 149985,
    "inStock": true,
    "rating": 4.9,
    "reviews": "3.1k",
    "brandClass": "tile-adobe",
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#FA0F00\"><path d=\"M13.96 22H18.9L12.04 4.5h-.08L5.1 22h4.94l2-5.4h3.92l-2-5.4zM24 2h-7.6L24 22V2zM0 2h7.6L0 22V2z\"/></svg>",
    "description": "Adobe Creative Cloud All Apps & Adobe Express: Photoshop, Illustrator, Premiere Pro, InDesign, and 100GB Cloud Storage.",
    "plans": [
      {
        "duration": "Adobe Express 12M ($0.50)",
        "usdPrice": 0.5,
        "usdOldPrice": 99.99,
        "price": 750,
        "oldPrice": 149985,
        "discount": "99% OFF",
        "inStock": true
      },
      {
        "duration": "Adobe Express 4M ($8.97)",
        "usdPrice": 8.97,
        "usdOldPrice": 39.99,
        "price": 13455,
        "oldPrice": 59985,
        "discount": "77% OFF",
        "inStock": true
      },
      {
        "duration": "Adobe CC Pro 1M ($23.41)",
        "usdPrice": 23.41,
        "usdOldPrice": 59.99,
        "price": 35115,
        "oldPrice": 89985,
        "discount": "61% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "vpn-security-suite",
    "name": "VPN & Antivirus Suite",
    "category": "security",
    "discount": "91% OFF",
    "discountPercent": 91,
    "duration": "1 Month - 1 Year",
    "usdPrice": 2.5,
    "usdOldPrice": 9.99,
    "currPrice": 3750,
    "oldPrice": 14985,
    "inStock": true,
    "rating": 4.8,
    "reviews": "2.1k",
    "brandClass": "tile-vpn",
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"#0084FF\"><path d=\"M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z\"/></svg>",
    "description": "Top-rated encryption and cybersecurity tools: ExpressVPN, HMA VPN, McAfee Total Protection, and Avast Security.",
    "plans": [
      {
        "duration": "HMA VPN 20-30 Days ($2.50)",
        "usdPrice": 2.5,
        "usdOldPrice": 9.99,
        "price": 3750,
        "oldPrice": 14985,
        "discount": "75% OFF",
        "inStock": true
      },
      {
        "duration": "ExpressVPN 1M ($5.98)",
        "usdPrice": 5.98,
        "usdOldPrice": 12.95,
        "price": 8970,
        "oldPrice": 19425,
        "discount": "54% OFF",
        "inStock": true
      },
      {
        "duration": "Avast Premium Security 1Y ($5.48)",
        "usdPrice": 5.48,
        "usdOldPrice": 49.99,
        "price": 8220,
        "oldPrice": 74985,
        "discount": "89% OFF",
        "inStock": true
      },
      {
        "duration": "McAfee Total Protection 1Y ($7.46)",
        "usdPrice": 7.46,
        "usdOldPrice": 89.99,
        "price": 11190,
        "oldPrice": 134985,
        "discount": "91% OFF",
        "inStock": true
      },
      {
        "duration": "Surfshark VPN 2M ($1.00) [SOLD OUT]",
        "usdPrice": 1,
        "usdOldPrice": 25,
        "price": 1500,
        "oldPrice": 37500,
        "discount": "96% OFF",
        "inStock": false
      },
      {
        "duration": "Proton VPN Plus 1M ($3.00) [SOLD OUT]",
        "usdPrice": 3,
        "usdOldPrice": 9.99,
        "price": 4500,
        "oldPrice": 14985,
        "discount": "70% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "netflix-premium",
    "name": "Netflix Premium 4K",
    "category": "streaming",
    "discount": "87% OFF",
    "discountPercent": 87,
    "duration": "1 Month",
    "usdPrice": 2.5,
    "usdOldPrice": 19.99,
    "currPrice": 3750,
    "oldPrice": 29985,
    "inStock": false,
    "rating": 4.9,
    "reviews": "4.1k",
    "brandClass": "tile-netflix",
    "brandSymbol": "<img src=\"assets/netflix-icon.png\" alt=\"Netflix\" style=\"width:34px; height:34px; object-fit:contain;\">",
    "description": "Admin Netflix 4K Ultra HD Premium 1M 5 Profiles. Watch on any screen with HDR and Spatial Audio. Currently out of stock.",
    "plans": [
      {
        "duration": "Admin Netflix 4K 1M 5 Profiles ($2.50) [SOLD OUT]",
        "usdPrice": 2.5,
        "usdOldPrice": 19.99,
        "price": 3750,
        "oldPrice": 29985,
        "discount": "87% OFF",
        "inStock": false
      }
    ]
  },
  {
    "id": "spotify-premium",
    "name": "Spotify Premium",
    "category": "streaming",
    "discount": "55% OFF",
    "discountPercent": 55,
    "duration": "3 Months",
    "usdPrice": 4.8,
    "usdOldPrice": 10.99,
    "currPrice": 7200,
    "oldPrice": 16485,
    "inStock": true,
    "rating": 4.8,
    "reviews": "1.9k",
    "brandClass": "tile-spotify",
    "brandSymbol": "<img src=\"assets/spotify-logo.png\" alt=\"Spotify\" style=\"width:34px; height:34px; object-fit:contain;\">",
    "description": "Ad-free offline music streaming in Ultra High Audio Quality with unlimited song skips on all devices.",
    "plans": [
      {
        "duration": "3 Months ($4.80)",
        "usdPrice": 4.8,
        "usdOldPrice": 10.99,
        "price": 7200,
        "oldPrice": 16485,
        "discount": "55% OFF",
        "inStock": true
      }
    ]
  },
  {
    "id": "youtube-premium",
    "name": "YouTube Premium",
    "category": "streaming",
    "discount": "88% OFF",
    "discountPercent": 88,
    "duration": "3 Months",
    "usdPrice": 4.6,
    "usdOldPrice": 38.99,
    "currPrice": 6900,
    "oldPrice": 58485,
    "inStock": true,
    "rating": 4.9,
    "reviews": "3.6k",
    "brandClass": "tile-youtube",
    "brandSymbol": "<svg viewBox=\"0 0 24 24\" width=\"32\" height=\"32\"><path fill=\"#FF0000\" d=\"M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z\"/><path fill=\"#FFF\" d=\"m9.6 15.6 6.3-3.6-6.3-3.6v7.2z\"/></svg>",
    "description": "YouTube & YouTube Music ad-free streaming, background play with screen locked, and offline downloads.",
    "plans": [
      {
        "duration": "YouTube Premium 3M ROW ($4.60)",
        "usdPrice": 4.6,
        "usdOldPrice": 38.99,
        "price": 6900,
        "oldPrice": 58485,
        "discount": "88% OFF",
        "inStock": true
      }
    ]
  }
];

// Alias for backward compatibility across existing references
const BOT_PRODUCTS = CATALOG_PRODUCTS;

// Combined Catalog: Core Flagships + Unique Individual Catalog Items
const PRODUCTS = [
  ...CORE_PRODUCTS,
  ...CATALOG_PRODUCTS.filter(bp => !CORE_PRODUCTS.some(cp => cp.id === bp.id))
];

function getAllCatalogProducts() {
  if (typeof CATALOG_PRODUCTS !== 'undefined' && Array.isArray(CATALOG_PRODUCTS)) return CATALOG_PRODUCTS;
  if (typeof window !== 'undefined' && window.CATALOG_PRODUCTS) return window.CATALOG_PRODUCTS;
  if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) return PRODUCTS;
  if (typeof window !== 'undefined' && window.PRODUCTS) return window.PRODUCTS;
  return [];
}

if (typeof window !== 'undefined') {
  window.CATALOG_PRODUCTS = CATALOG_PRODUCTS;
  window.BOT_PRODUCTS = BOT_PRODUCTS;
  window.PRODUCTS = PRODUCTS;
  window.getAllCatalogProducts = getAllCatalogProducts;
}

// --- Cart Storage (Persistent across pages via localStorage) ---
function getCart() {
  const stored = localStorage.getItem('creditlog_cart');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  // Default cart with top popular in-stock items
  const defaultCart = [
    {
      id: 'google-gemini-pro',
      name: 'Google Gemini Pro',
      plan: '18 Months ($1.00)',
      usdPrice: 1.00,
      price: 1500,
      oldPrice: 540000,
      qty: 1,
      inStock: true,
      brandClass: 'tile-gemini',
      brandSymbol: BOT_PRODUCTS[39].brandSymbol
    },
    {
      id: 'chatgpt-plus-30d',
      name: 'ChatGPT Plus 30D',
      plan: '30 Days',
      usdPrice: 7.80,
      price: 11700,
      oldPrice: 30000,
      qty: 1,
      inStock: true,
      brandClass: 'tile-chatgpt',
      brandSymbol: BOT_PRODUCTS[32].brandSymbol
    }
  ];
  saveCart(defaultCart);
  return defaultCart;
}

function saveCart(cart) {
  localStorage.setItem('creditlog_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cartCountBadge');
  if (badge) {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    badge.textContent = count;
  }
}

function addToCart(productId, planDuration = '', qty = 1) {
  // Look in both BOT_PRODUCTS and PRODUCTS
  const prod = BOT_PRODUCTS.find(p => p.id === productId) || PRODUCTS.find(p => p.id === productId) || PRODUCTS[0];
  
  // Find selected plan or fallback
  let plan = null;
  if (planDuration && prod.plans) {
    plan = prod.plans.find(pl => pl.duration === planDuration || pl.duration.includes(planDuration));
  }
  if (!plan && prod.plans && prod.plans.length > 0) {
    plan = prod.plans[0];
  }

  const inStock = plan ? (plan.inStock !== false) : (prod.inStock !== false);
  if (!inStock) {
    showToast(`${prod.name} is currently sold out! Please select an available package.`);
    return false;
  }

  const planName = plan ? plan.duration : (prod.duration || 'Standard');
  const usdPrice = plan ? plan.usdPrice : prod.usdPrice;
  const ngnPrice = Math.round(usdPrice * USD_TO_NGN_RATE);
  const oldPrice = plan ? plan.price : prod.currPrice;

  const cart = getCart();
  const existingIdx = cart.findIndex(i => i.id === prod.id && i.plan === planName);
  
  if (existingIdx > -1) {
    cart[existingIdx].qty += qty;
  } else {
    cart.push({
      id: prod.id,
      name: prod.name,
      plan: planName,
      usdPrice: usdPrice,
      price: ngnPrice,
      oldPrice: oldPrice,
      qty: qty,
      inStock: true,
      brandClass: prod.brandClass || 'tile-pro',
      brandSymbol: prod.brandSymbol
    });
  }

  saveCart(cart);
  showToast(`Added ${prod.name} (${planName}) to cart! ${formatPrice(usdPrice)}`);
  return true;
}

// --- Global Toast Notification ---
let toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-notification hidden';
    toast.id = 'toastNotification';
    toast.innerHTML = `<span class="toast-icon"><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg></span><span class="toast-msg" id="toastMsg"></span>`;
    document.body.appendChild(toast);
  }

  const msgElem = document.getElementById('toastMsg');
  if (msgElem) msgElem.innerHTML = msg;

  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}

function toggleUserDropdown() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.toggle('hidden');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const menu = document.querySelector('.user-profile-menu');
  if (menu && !menu.contains(e.target)) {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.add('hidden');
  }
});

// ==========================================================================
// Mobile Navigation Drawer Removed (Using Bottom Navigation Bar)
// ==========================================================================
function toggleMobileNav() {}
function openMobileNav() {}
function closeMobileNav() {
  const drawer = document.getElementById('mobileNavDrawer');
  const backdrop = document.getElementById('mobileNavBackdrop');
  if (drawer) drawer.remove();
  if (backdrop) backdrop.remove();
  document.body.style.overflow = '';
}

function removeMobileNavDrawer() {
  const drawer = document.getElementById('mobileNavDrawer');
  if (drawer) drawer.remove();
  const backdrop = document.getElementById('mobileNavBackdrop');
  if (backdrop) backdrop.remove();
  document.querySelectorAll('.mobile-menu-toggle-btn').forEach(b => b.remove());
}

function updateCartBadge() {
  const cart = (typeof getCart === 'function') ? getCart() : [];
  const total = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  
  document.querySelectorAll('.header-cart-qty, #headerCartCount').forEach(el => {
    el.textContent = total;
  });
}

function removeMobileBottomNav() {
  const existingNav = document.getElementById('mobileBottomNav');
  if (existingNav) existingNav.remove();
}

// ==========================================================================
// Instant Guest Order Tracking Modal System (Zero Login Required)
// ==========================================================================
function ensureTrackOrderModalInDom() {
  if (document.getElementById('guestTrackOrderModal')) return;

  const modalHtml = `
    <div id="guestTrackOrderModal" class="gateway-modal-backdrop hidden" style="z-index: 999999;">
      <div class="gateway-modal-card" style="max-width: 520px; border-radius: 18px;">
        <div class="gateway-modal-header" style="background: #1E293B;">
          <div class="gw-brand-wrap">
            <span class="gw-logo" style="display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <span>Guest Order Tracking</span>
            </span>
          </div>
          <button type="button" class="gw-close-btn" onclick="closeTrackOrderModal()">✕</button>
        </div>
        
        <div style="padding: 20px;">
          <p style="font-size: 13px; color: #475569; margin-top: 0; margin-bottom: 14px; line-height: 1.5;">
            Track your instant digital subscription delivery and retrieve your credentials anytime. No login or password required.
          </p>

          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <input type="text" id="trackOrderSearchInput" placeholder="Enter Order ID (e.g. #CL-41063) or Email" style="flex: 1; padding: 11px 14px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 13.5px; outline: none;">
            <button type="button" onclick="lookupGuestOrder()" class="primary-btn" style="padding: 11px 18px; font-size: 13px; font-weight: 700; white-space: nowrap; border-radius: 10px;">
              Track Order
            </button>
          </div>

          <div id="trackOrderResults" style="max-height: 380px; overflow-y: auto;">
            <div style="text-align: center; padding: 20px; color: #94A3B8; font-size: 12.5px;">
              Enter your Order Number or checkout Email above to view credentials.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openTrackOrderModal() {
  ensureTrackOrderModalInDom();
  const modal = document.getElementById('guestTrackOrderModal');
  modal.classList.remove('hidden');
  const input = document.getElementById('trackOrderSearchInput');
  if (input) {
    input.focus();
    // Auto-fill from recent order if available
    const lastOrder = JSON.parse(localStorage.getItem('creditlog_last_order') || '{}');
    if (lastOrder.id && !input.value) {
      input.value = lastOrder.id;
      lookupGuestOrder();
    }
  }
}

function closeTrackOrderModal() {
  const modal = document.getElementById('guestTrackOrderModal');
  if (modal) modal.classList.add('hidden');
}

async function lookupGuestOrder() {
  const query = (document.getElementById('trackOrderSearchInput').value || '').trim();
  const resultsBox = document.getElementById('trackOrderResults');
  if (!query) {
    showToast('Please enter an Order ID or Email');
    return;
  }

  resultsBox.innerHTML = `
    <div style="text-align:center; padding: 24px; color: #64748B;">
      <svg class="spinner-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; animation: spin 0.8s linear infinite; vertical-align:-3px; margin-right:6px;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
      Looking up order in database...
    </div>
  `;

  let orders = [];

  // Try API first
  try {
    const isId = query.startsWith('#') || query.toUpperCase().startsWith('CL');
    const param = isId ? `id=${encodeURIComponent(query)}` : `email=${encodeURIComponent(query)}`;
    const res = await fetch(`/api/orders/track?${param}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        orders = data.data;
      }
    }
  } catch (err) {
    console.warn('API track offline, falling back to local database:', err);
  }

  // Fallback to localStorage
  if (orders.length === 0) {
    const local = JSON.parse(localStorage.getItem('creditlog_orders') || '[]');
    orders = local.filter(o => 
      (o.id && o.id.toLowerCase() === query.toLowerCase()) || 
      (o.customerEmail && o.customerEmail.toLowerCase() === query.toLowerCase())
    );
  }

  if (orders.length === 0) {
    resultsBox.innerHTML = `
      <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 10px; padding: 16px; text-align: center; color: #991B1B; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span>No orders found matching "<strong>${query}</strong>". Please check your Order ID or email.</span>
      </div>
    `;
    return;
  }

  resultsBox.innerHTML = '';
  orders.forEach(order => {
    const card = document.createElement('div');
    card.style.cssText = 'background: #0F172A; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px; color: #FFF;';
    
    const creds = order.credentials || {
      account: order.customerEmail || 'member@creditlog-access.com',
      password: 'CL-ACTIVE-KEY!',
      profile: 'Profile 1'
    };

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; margin-bottom:10px;">
        <span style="font-weight:800; font-size:14px; color:#38BDF8;">${order.id}</span>
        <span style="font-size:11px; background:#10B981; color:#FFF; font-weight:700; padding:2px 8px; border-radius:10px;">${order.status || 'Delivered'}</span>
      </div>
      <div style="font-size:13.5px; font-weight:700; margin-bottom:4px;">${order.product} · ${order.plan}</div>
      <div style="font-size:11.5px; color:#94A3B8; margin-bottom:10px;">Date: ${order.date || 'Recent'} · Paid: ${order.price} via ${order.gateway || 'Paystack'}</div>
      
      <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:10px; font-size:12px; font-family:monospace; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:#94A3B8;">Login / Account:</span>
          <strong>${creds.account}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:#94A3B8;">Password:</span>
          <strong>${creds.password}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94A3B8;">Profile / PIN:</span>
          <strong>${creds.profile || creds.pin || 'Profile 1'}</strong>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <a href="success.html?id=${encodeURIComponent(order.id)}&product=${encodeURIComponent(order.product)}&plan=${encodeURIComponent(order.plan)}&amount=${encodeURIComponent(order.price)}&method=${encodeURIComponent(order.gateway || 'Paystack')}" class="copy-cred-btn" style="text-decoration:none;">View Full Receipt ↗</a>
      </div>
    `;
    resultsBox.appendChild(card);
  });
}

// ==========================================================================
// Apple-Grade Motion, Sliding Segmented Controls & Spotlight Interaction Engine
// ==========================================================================

function initSegmentedSlidingPill(barElement) {
  const bars = barElement ? [barElement] : document.querySelectorAll('.category-segmented-bar, .keynote-tab-switcher, .apple-segmented-bar');
  bars.forEach(bar => {
    let slider = bar.querySelector('.segmented-sliding-pill, .keynote-tab-slider');
    if (!slider) {
      slider = document.createElement('div');
      slider.className = bar.classList.contains('keynote-tab-switcher') ? 'keynote-tab-slider' : 'segmented-sliding-pill';
      bar.prepend(slider);
    }
    bar.classList.add('has-slider');

    function updateSlider(activeBtn, animate = true) {
      if (!activeBtn) return;
      if (!animate) slider.style.transition = 'none';
      const barRect = bar.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const leftOffset = btnRect.left - barRect.left + bar.scrollLeft;
      const width = btnRect.width;

      slider.style.transform = `translateX(${leftOffset}px)`;
      slider.style.width = `${width}px`;
      slider.style.opacity = '1';

      if (!animate) {
        requestAnimationFrame(() => {
          slider.style.transition = '';
        });
      }
    }

    const activeBtn = bar.querySelector('.active') || bar.querySelector('button');
    if (activeBtn) {
      updateSlider(activeBtn, false);
    }

    // Attach click listener to buttons inside bar
    const buttons = bar.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateSlider(btn, true);
      });
    });

    // ResizeObserver for robust layout updates
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        const curActive = bar.querySelector('.active');
        if (curActive) updateSlider(curActive, false);
      });
      ro.observe(bar);
    }
  });
}

function initCardSpotlights() {
  document.addEventListener('pointermove', (e) => {
    const cards = document.querySelectorAll('.directory-card, .sampler-card, .bento-card');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Only compute if pointer is near or inside card
      if (x >= -50 && x <= rect.width + 50 && y >= -50 && y <= rect.height + 50) {
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      }
    });
  }, { passive: true });
}

// Quick View Modal
function openQuickViewModal(productId) {
  const source = (typeof getAllCatalogProducts === 'function') ? getAllCatalogProducts() : ((typeof CATALOG_PRODUCTS !== 'undefined') ? CATALOG_PRODUCTS : []);
  const prod = source.find(p => p.id === productId);
  if (!prod) return;

  let modal = document.getElementById('appleQuickViewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'appleQuickViewModal';
    modal.className = 'apple-modal-overlay';
    modal.innerHTML = `
      <div class="apple-modal-sheet" id="appleQuickViewSheet">
        <button type="button" class="apple-modal-close" onclick="closeQuickViewModal()" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        </button>
        <div id="quickViewContent"></div>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeQuickViewModal();
    });
    document.body.appendChild(modal);
  }

  const content = document.getElementById('quickViewContent');
  const cat = (prod.category || 'APP').toUpperCase();
  const priceFormatted = formatPrice(prod.usdPrice);
  const dualFormatted = formatDualPrice(prod.usdPrice);

  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
      <div class="directory-icon-box ${prod.brandClass || 'tile-gemini'}" style="width: 56px; height: 56px; border-radius: 14px; font-size: 24px;">
        ${prod.brandSymbol || '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>'}
      </div>
      <div>
        <span class="card-cat-badge" style="margin-bottom: 4px; display: inline-block;">${cat}</span>
        <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em; margin: 0;">${prod.name}</h3>
      </div>
    </div>

    <p style="font-size: 14px; color: #94A3B8; line-height: 1.6; margin-bottom: 24px;">
      ${prod.description || 'Verified private digital subscription with instant credentials dispatch upon payment.'}
    </p>

    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 16px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
        <span style="font-size: 13px; color: #94A3B8;">Selected Option:</span>
        <span style="font-size: 14px; font-weight: 700; color: #38BDF8;">${prod.duration || '1 Month Access'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="font-size: 13px; color: #94A3B8;">Wholesale Price:</span>
        <div style="text-align: right;">
          <div style="font-size: 22px; font-weight: 800; color: #FFFFFF; font-variant-numeric: tabular-nums;">${priceFormatted}</div>
          <div style="font-size: 12px; color: #94A3B8;">≈ ${dualFormatted}</div>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <a href="checkout.html?sku=${encodeURIComponent(prod.id)}" class="hero-btn-primary" style="flex: 1; min-width: 160px; justify-content: center; padding: 12px 20px; font-size: 14px;">
        <span>Direct Checkout</span>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </a>
      <a href="product.html?id=${encodeURIComponent(prod.id)}" class="hero-btn-secondary" style="justify-content: center; padding: 12px 20px; font-size: 14px;">
        <span>Full Details</span>
      </a>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeQuickViewModal() {
  const modal = document.getElementById('appleQuickViewModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Global escape key listener for modal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeQuickViewModal();
});

// Run UI setups on load
document.addEventListener('DOMContentLoaded', () => {
  renderHeaderAuth();
  updateCartBadge();
  updateCurrencyUI();
  removeMobileNavDrawer();
  removeMobileBottomNav();
  initSegmentedSlidingPill();
  initCardSpotlights();
});

