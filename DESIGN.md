# Design System & Architecture: CreditLog

## 1. Visual Theme & Atmosphere
CreditLog embraces an editorial, warm-parchment atmosphere balanced with high-density financial precision. The visual world is inspired by vintage ledger books and premium Swiss typography, reimagined for high-velocity digital subscription commerce and wholesale provisioning.

- **Vibe:** Editorial Warm Ledger with Swiss Modernist discipline
- **Density:** 7/10 (Balanced commercial density; clean whitespace on mobile, high-information telemetry on desktop)
- **Variance:** 6/10 (Asymmetric analytical layouts paired with structured tabular registries)
- **Motion:** 5/10 (Tactile spring physics, subtle -1px push interactions, smooth horizontal swipes)

## 2. Color Palette & Roles
The color system strictly avoids generic AI purple, neon glows, and pure black `#000000`.

- **Parchment Canvas** (`#F4ECD8`) — Warm paper background surface for the entire application.
- **Pure Surface** (`#FFFFFF`) — Cards, tables, modals, and container backgrounds.
- **Charcoal Ink** (`#190D08`) — Deepest brand neutral for primary typography, desktop sidebar fill, and active headers.
- **Muted Earth / Secondary Ink** (`#705E51`) — Supporting text, metadata, table headers, and form hints.
- **Terracotta Accent** (`#D04515`) — Single primary accent for CTAs, active navigation states, primary buttons, and highlight metrics.
- **Forest Green** (`#16A34A` / `#15803D`) — Live stock indicators, verified badges, positive financial margins.
- **Amber Gold** (`#D97706` / `#F1C244`) — Star rating accents, pending status pills, active gateway status badges.
- **Crimson Red** (`#DC2626` / `#EF4444`) — Destructive actions, out of stock alerts, low balance warnings.
- **Whisper Border** (`rgba(25, 13, 8, 0.08)` to `rgba(25, 13, 8, 0.14)`) — Structural dividers and subtle card outlines.

## 3. Typographic Architecture & Anti-Slop Discipline
CreditLog strictly rejects "AI slop" typography—the unconsidered use of a single neutral sans-serif doing every job at default weights and spacing. To ensure every screen reads as decided and human-crafted rather than machine-generated:

### A. Intentional Typographic Pairing (Statement vs. Workhorse)
- **Display & Headlines (`Plus Jakarta Sans`):** Characterful geometric sans with distinctive structural ink traps, assertive weight (`font-weight: 700` to `800`), and personality. Carries the editorial perspective of the application.
- **Body, UI Controls & Descriptions (`Inter`):** Quiet, neutral workhorse. Rendered at relaxed leading (`line-height: 1.6` to `1.65`) and normal tracking for effortless scanning across long sessions.
- **Financial Telemetry & Monospace (`Geist Mono` / `SF Mono`):** Tabular numerals (`font-feature-settings: 'tnum' 1; font-variant-numeric: tabular-nums`) for currency figures (₦), exchange multipliers, transaction hashes, and status tags.

### B. Decisive Type Scale & Spacing Rules
1. **Hero & Display Headlines (`44px` – `56px`):** Tight negative tracking (`letter-spacing: -0.03em` to `-0.035em`), bold leading (`line-height: 1.08` – `1.12`), weight `800`. Prevents floaty, disconnected display titles.
2. **Section Titles (`28px` – `34px`):** Tight tracking (`letter-spacing: -0.025em`), weight `800`, line-height `1.18`.
3. **Card & Panel Headers (`18px` – `22px`):** Slight negative tracking (`letter-spacing: -0.015em`), weight `750`.
4. **Body Copy & Subheads (`14px` – `16px`):** Generous line height (`1.6` – `1.65`), neutral tracking (`0`), color `--text-muted` (`#705E51`) or `--text-dark` (`#190D08`).
5. **Micro-Labels & Tickers (`10.5px` – `12px`):** Uppercase, letter-spaced (`letter-spacing: +0.03em` to `+0.05em`), weight `700`, monospace or sans-serif pills.

### C. The Five Anti-Slop Rules (Mandatory Contract)
1. **Never use one font for everything:** Avoid Inter-on-Inter or scaling up body text to make a headline. Maintain deliberate contrast between headline personality and body neutrality.
2. **Never leave display tracking at default `0`:** Large text looks generic without tightened letter-spacing. Display headings must have negative tracking (`-0.02em` to `-0.035em`).
3. **Never crush body line-height:** Body text must have generous line height (`1.6`+); tight body copy causes eye strain and signals rushed builder defaults.
4. **Never use emojis as icons:** Use precise, single-color SVG vectors with explicit dimensions.
5. **Always enforce tabular numbers in financial data:** Currency amounts (`₦1,043,000`), counts, and multipliers must align vertically with fixed glyph widths (`tnum`).

## 4. Component Stylings & Interaction States
- **Sidebar Navigation:**
  - **Desktop & Tablet (>= 768px):** Fixed vertical sidebar (`position: fixed; width: 220px–240px; height: 100vh;`) with Charcoal Ink background (`#190D08`). The main content canvas scrolls independently with corresponding margin-left, ensuring menu items never disappear when auditing lengthy inventories or order lists.
  - **Mobile (< 768px):** Collapsible top navigation bar with a dedicated hamburger toggle button (`#dashMobileToggle`). Expands smoothly on demand into a full-width vertical menu with 44px tap targets, and collapses by default to preserve maximum vertical screen space for catalog tables and analytics. Auto-closes upon link selection or backdrop click.
- **Buttons & Interactive Elements:**
  - **Touch Targets:** Minimum `44px` tap target across all mobile viewports.
  - **Tactile Feedback:** Subtle `-1px` vertical translation on hover/active states; zero outer blur/glow.
- **Cards & Containers:**
  - Crisp white backgrounds (`#FFFFFF`) framed with 1px whisper borders (`rgba(25, 13, 8, 0.1)`) and soft ambient shadows (`box-shadow: 0 4px 14px rgba(25, 13, 8, 0.04)`).
- **Responsive Tables:**
  - Dedicated `.table-responsive` and `.cms-table-wrap` wrappers with `-webkit-overflow-scrolling: touch` ensuring tables scroll smoothly without causing page-level horizontal overflow.

## 5. Layout & Responsive Principles
- **Zero Horizontal Spillover:** `max-width: 100%; overflow-x: hidden;` on root viewports prevents unwanted horizontal page wobbling on mobile phones.
- **Mobile-First Collapse:**
  - KPI cards: 4 columns on desktop → 2 columns on tablet (<= 900px) → 1 column on mobile (<= 520px).
  - Form grids: 2-column and 3-column layouts collapse to single-column flows on screens <= 768px.
  - Price Tier Rows: Desktop 5-column grid transforms into structured 2-column cards on touchscreens with dedicated removal buttons.
  - Customer Intelligence Cards: Flex layout adapts from horizontal row into stacked customer summary cards with full-width communication actions (WhatsApp, Email, Order History).

## 6. Current Feature Architecture & Backoffice Suite
- **Analytics & Operations Dashboard (`admin.html`):** Real-time revenue curve, orders management, and balance ribbons.
- **Inventory CMS (`inventory.html`):** 3-card overview (`Total Products`, `Total Stock Units`, `Available to Purchase`), clean 7-column registry (`Product & ID`, `Price`, `Total Stock`, `Available`, `Status`, `Enabled`, `Actions`), live steppers, and variant manager.
- **Customer Directory (`customers.html`):** Customer retention telemetry, LTV aggregation, search filter chips, and omnichannel contact actions.
- **Wholesale Reseller & Settings (`settings.html`):** Multi-supplier credentials, sandbox vs. live switching, FX exchange rates, dynamic price tiers, and product overrides.
- **System Audit Trail (`activity-logs.html`):** Live audit logging, module filter badges, and CSV export.
- **Crawler & Indexing Protection (`robots.txt` & `sitemap.xml`):** Comprehensive directives blocking sensitive backoffice portals and checkout sessions while cleanly exposing public storefront routes.

## 7. Anti-Patterns & Banned AI Tells
- No pure black `#000000`.
- No neon outer glow or blur shadows.
- No centered hero sections or cluttered multi-column mobile overflows.
- No emojis as substitute for functional UI icons.
- No generic AI copy ("seamless", "elevate", "next-gen").
- No obsolete, dead, or unverified code left in production paths.
