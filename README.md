# CreditLog — Verified Digital Subscriptions Exchange & Management Platform

CreditLog is an enterprise digital subscriptions marketplace and inventory management portal featuring automated wholesale fulfillment, dynamic price multipliers, real-time multi-currency conversions (USD/NGN), and an editorial, responsive administration suite.

---

## 🌟 Key Architecture & Capabilities

### 1. Admin Portal Suite
- **Analytics & Operations Dashboard (`admin.html`):** Store performance KPIs, interactive SVG revenue curve, recent orders list, and real-time wholesale supplier balance ribbon.
- **Inventory & CMS Dashboard (`inventory.html`):** Real-time stock units, live availability counters, product variant options, dynamic brand logos, price overrides, and instant inventory toggles. Streamlined with a 3-card KPI overview and clean 7-column CMS registry.
- **Customer Directory & Intelligence (`customers.html`):** Customer lifetime value (LTV), repeat buyer retention, order history, and direct WhatsApp/Email dispatch.
- **Settings & Wholesale Multi-Vendor Engine (`settings.html`):** Multi-supplier API configuration, sandbox simulation, real-time FX conversion rate, price tiers, and product/category overrides.
- **System Audit Trail (`activity-logs.html`):** Comprehensive security logs, module filters, and CSV export.

### 2. Multi-Vendor Wholesale API Engine
- **Multiple Supplier Credentials:** Register multiple supplier accounts with unique base URLs and API keys (`X-API-Key`).
- **Live vs. Sandbox Mode:** Toggle individual suppliers between Live production API and sandbox simulation.
- **Automatic Default Routing:** Designate a primary supplier while maintaining secondary vendors for failover.

### 3. Dynamic Multiplier & Pricing Hierarchy
Pricing follows a strict 4-level deterministic priority structure:
1. **Product Multiplier Override (Highest Priority):** Custom multiplier directly tied to a specific catalog product.
2. **Dynamic Price Range Tiers:** Multipliers applied dynamically based on wholesale USD price brackets (e.g. `$0.00 – $2.00` = `2.50x`, `$2.00 – $10.00` = `1.80x`, `$40.00+` = `1.20x`).
3. **Category Fallback Multipliers:** Category-level margins (AI Models, Gaming, Streaming, Productivity, Security).
4. **Global FX Exchange Rate & Markup:** Base USD to NGN conversion rate + default fallback percentage.

### 4. Zero-Regression Responsive Architecture
- **Desktop & Tablets (>= 768px):** Fixed Charcoal Ink sidebar (`#190D08`) pinned on the left (220px on tablets, 240px on desktops) with an independently scrollable main content canvas (`#F4ECD8`), ensuring navigation stays visible when managing thousands of products.
- **Mobile Phones (< 768px):**
  - Collapsible top navbar with an animated hamburger toggle button (`#dashMobileToggle`) that expands into a full-width vertical menu.
  - Collapses cleanly by default so content is not pushed down or obstructed by horizontal scrolling bars.
  - Strict 44px minimum tap targets on all interactive controls.
  - Multi-column grids collapse gracefully into single-column flows.
  - Zero horizontal page overflow (`max-width: 100%; overflow-x: hidden;`).

### 5. Crawler Governance & SEO Architecture
- **Robots Directives (`robots.txt`):** Protects all backoffice portals (`/admin`, `/inventory`, `/customers`, `/settings`, `/activity-logs`), private customer checkouts, receipts, and internal REST API routes. Permits public storefront pages (`/`, `/shop`, `/product`, `/style.css`, `/shared.js`, `/assets/`).
- **Canonical XML Sitemap (`sitemap.xml`):** Fully indexes public storefront entries (`/`, `/shop`, `/product.html`) with proper change frequency and priority weighting.

---

## 🛠️ Technology Stack
- **Frontend:** Vanilla HTML5, Modern CSS3 (CSS Grid, Flexbox, custom properties), Vanilla JavaScript.
- **Backend:** Node.js HTTP & REST API services (`server/index.js`).
- **Data Persistence:** Local JSON data store (`data/inventory.json`, `data/settings.json`, `data/customers.json`).
- **Design System:** Editorial Warm Parchment (`#F4ECD8`), Charcoal Ink (`#190D08`), Terracotta Accent (`#D04515`). Follows `/stitch-design-taste`, `/impeccable`, `/clean-code`, and `/clean-code-safe-cleanup`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/hybeekraft/creditlog.git
cd creditlog

# Install dependencies
npm install

# Start the local development server
npm start
```

The application is served at `http://localhost:3000`.

- Customer Storefront: `http://localhost:3000/index.html`
- Product Details & Checkout: `http://localhost:3000/shop.html`, `http://localhost:3000/product.html`, `http://localhost:3000/checkout.html`
- Admin Analytics: `http://localhost:3000/admin.html`
- Inventory & CMS: `http://localhost:3000/inventory.html`
- Customer Directory: `http://localhost:3000/customers.html`
- Store & Supplier Settings: `http://localhost:3000/settings.html`
- Activity Logs: `http://localhost:3000/activity-logs.html`

---

## 🔒 Security & Standards
- Protected admin routes with token-based authorization.
- Zero client-side API secret leakage; vendor API keys are managed and dispatched strictly server-side.
- Zero-regression engineering, clean code conventions, and safe component deletion protocol.
