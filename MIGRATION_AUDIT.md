# CreditLog website and Telegram bot migration audit

## Architecture decision

Keep the bot's SQLite database on its existing persistent Fly volume as the source of truth. Add authenticated web API routes to the bot's existing aiohttp server, which already runs beside Telegram polling. Keep the website's current HTML, CSS, and JavaScript as the frontend and proxy its `/api` requests to that service. Do not deploy these changes as part of implementation.

The Node website currently has a second catalog and order store in JSON files. The SQLite bridge is a local-file bridge, not a network API; its candidate directory is also named `creditlog_bot`, while the supplied repository is `creditlogbot`. Vercel functions cannot access the Fly volume through that bridge. The bridge must stop being the integration path once API integration is in place.

## Telegram bot feature inventory

### Customer experience

- Guest shopping with persistent Telegram user preferences for language and currency.
- Featured products, categories, catalog browsing, product descriptions, quantity selection, and live supplier availability.
- Automatic supplier delivery, manual fulfillment, and assisted fulfillment paths.
- Bachs checkout with server-side status verification; @CryptoBot invoices; direct bank transfer; Binance Pay; USDT TRC20 and BEP20 transfer.
- Payment reference submission, duplicate-payment checks, underpayment checks for Bachs, order cancellation, recent orders, and order detail/status checks.
- Force-subscribe channel gate, support contact, multi-language text, USD/NGN display, custom emoji branding, and order/delivery notifications.

### Telegram administrator controls

- Catalog: supplier sync, raw supplier products, sync margin, clear cache, link/unlink supplier SKUs, add manual products, enable/disable, set fixed prices, set product margins, clear price overrides, manage categories, choose featured products, and map custom emojis.
- Inventory: supplier stock synchronization, local stock item upload, low-stock checks, and product delivery-type management.
- Orders: inspect statistics, approve/reject pending payments, manually deliver content, refund records, inspect supplier orders, and export/backup the database/catalog.
- Supplier operations: supplier status and balance, catalog fetch, supplier order history, multi-supplier registry from environment, and periodic catalog sync every 10 minutes.
- Payments: set/pause Bachs, configure Bachs currency/base URL/callback, configure bank accounts, exchange rate, CryptoBot token, Binance Pay ID, and USDT wallets.
- Store behavior: auto/manual/instant fulfillment mode, force-subscribe channels and admin-check behavior, featured products, broadcast controls, and support/channel configuration.

### Settings and access model

Runtime settings persisted in SQLite include `profit_margin`, `usd_ngn_rate`, bank account fields, `bachs_api_key`, `bachs_enabled`, `bachs_base_url`, `bachs_currency`, `bachs_callback_url`, `fsub_channels`, `fsub_enabled`, `fsub_check_admin`, `fulfillment_mode`, `featured_products`, `broadcaster_enabled`, and `bot_username`. Initialization markers also exist in the settings table. Other configuration comes from environment variables, including Telegram token and admin IDs, supplier credentials, payment credentials, support/channel URLs, low-stock threshold, and host/port/database path.

Telegram authorization is an `ADMIN_IDS` allowlist. The bot does not currently have web-admin roles or a general administrative activity-log table; those need an explicit web access model and audit records in the shared backend.

## Website feature comparison

| Capability | Website today | Gap to close |
| --- | --- | --- |
| Customer catalog and details | Present; served from website JSON catalog | Read bot catalog through shared API and preserve supplier descriptions verbatim |
| Product options and stock | Variants and reservations in website JSON | Map bot delivery type, supplier stock, and local stock items consistently |
| Guest checkout and tracking | Present in website routes | Persist pending and completed web orders in bot database and authenticate payment before fulfillment |
| Payments | Website Bachs route and webhook exist | Remove the unverified client-triggered verification path; support bot-configured gateway choices and manual payment review |
| Product admin | Website CRUD, price, stock, status, variants | Mutate the shared product model, including supplier SKU and local-stock behavior |
| Order admin | Website listing and analytics | Add inspect, approve/reject, deliver, refund, and supplier-order views/actions |
| Supplier administration | Website vendor API, pricing tiers, sync controls | Use bot supplier registry and pricing rules rather than a separate credential/config store |
| Other settings | Partial supplier/FX/pricing controls | Add bot-backed bank, Bachs, crypto, fulfillment, force-subscribe, featured/category, broadcast, and support controls |
| Customers, reports, logs | Website-derived customer list, analytics, JSON activity log | Combine guest web orders and Telegram orders; add shared audit events and preserve channel identity |
| Admin security | Website has hard-coded fallback login/token values | Replace with server-side credential verification, expiring sessions, roles/permissions, and audited actions |

## Data findings and safeguards

- The bot's local database snapshot has 278 products and no customer, order, or manual-stock rows. Its deployment config points to `/data/store.db` on a Fly volume, so the local file is not proof of production data.
- Website JSON and supplier config files are a second source of truth; on Vercel the app writes its data under `/tmp`.
- The website's `/api/payment/verify` route currently processes a supplied reference and triggers stock/fulfillment without calling the Bachs verification helper. The bot's Bachs callback calls its provider verification function before fulfillment.
- Website admin authentication accepts hard-coded fallback credentials/tokens. A supplier credential is present in tracked website config; treat it as exposed and rotate it outside this migration.
- Keep bot polling, broadcaster, and periodic sync behavior intact. Do not deploy or modify running infrastructure during implementation.

## Implementation sequence

1. Add authenticated, validated web API routes beside the bot's existing `/health` route and use its database and business functions.
2. Add additive schema migrations for guest web identity, web admin roles, and audit history without rewriting existing Telegram rows.
3. Proxy website `/api` traffic to the shared backend and remove local JSON reads/writes from customer/admin flows as each route is migrated.
4. Move customer browsing, quote, checkout, payment verification, fulfillment, and tracking onto the shared service.
5. Complete website product, stock, order, payment, supplier, settings, report, notification, and audit controls.
6. Test bot regressions, web API behavior, payment verification, and cross-interface data visibility with isolated test databases and mocked external providers.

No deployment or live database mutation is part of these steps.
