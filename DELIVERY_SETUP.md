# Automatic delivery pricing

Ghana uses a private, Ghana-only OSRM car graph adapted from delivery-hub/ops/osrm. Google Places (New) supplies verified addresses and country codes. Other countries use their continent's database fee. Editing an address immediately invalidates the previous quote and blocks checkout until a new quote succeeds.

## Environment variables

Railway backend (fmcg):

| Variable | Value / purpose |
| --- | --- |
| GOOGLE_MAPS_API_KEY | Server-side Google key with billing and **Places API (New)** enabled. Autocomplete and Place Details use the same key. Never put this secret in a Vite variable. |
| OSRM_BASE_URL | http://${{_ORSM.RAILWAY_PRIVATE_DOMAIN}}:5000 (configured on Railway) |
| DELIVERY_ORIGIN_LAT | 5.5486389 (configured; supplied dispatch point) |
| DELIVERY_ORIGIN_LNG | -0.2091944 (configured) |
| DELIVERY_PER_KM_GHS | Required positive GHS charge per road kilometre. Supply the actual business tariff. |
| DELIVERY_MIN_FEE_GHS | Required non-negative minimum Ghana delivery charge. Use 0 for no minimum. |
| USD_GHS_RATE | Optional positive override: GHS per 1 USD. Omit to fetch live USD/GHS from ExchangeRate-API. |

The base fee comes from **admin Settings → Ghana Base Delivery Fee (GHS)** (site_settings.standard_delivery_fee), not an environment variable. Ghana fee is max(minimum, admin base fee + road kilometres × per-km rate), rounded once to two decimals.

Railway _ORSM service: PORT=5000 is configured. OSRM_MAX_TABLE_SIZE is optional, default 200.

Vercel: **no new variables**. Keep VITE_API_URL pointing at Railway and VITE_PAYSTACK_PUBLIC_KEY. Existing backend DATABASE_URL, JWT_SECRET and PAYSTACK_SECRET_KEY remain required.

## Admin and data

The idempotent startup migration creates seven continents and 252 country/territory records. Each country has one billing continent, using countries-list 3.4.1's primary continent mapping, including transcontinental countries. [Source](https://github.com/annexare/Countries); MIT license: server/db/delivery-countries.LICENSE.

Open **Delivery Locations**, enter each continent's USD fee, enable it and save. Groups start unset/disabled so no international price is invented. Ghana bypasses Africa's flat fee and enabled status. Legacy delivery_locations rows remain intact but checkout no longer uses them.

USD/GHS is fetched server-side and cached for one hour. Provider data over 48 hours old is rejected. Conversion failure blocks new international quotes unless a fixed override is configured. Checkout shows the USD fee, GHS equivalent, rate and date, with provider attribution. Paystack receives the stored order total in GHS pesewas.

Quotes expire after 15 minutes and persist in PostgreSQL across restarts/replicas. Orders look up quotes server-side, reject missing/expired quotes and changed totals, validate coupons, and save the verified address and quote snapshot. Pickup is free. Free-shipping coupons still require a deliverable address. Client coordinates, country and delivery fee never determine the quote. Provider failure never becomes free delivery.

The pre-existing merchandise-pricing logic still accepts the merchandise subtotal from the client; that is outside this change. Delivery fees and coupon adjustments are now independently validated server-side.

## Deployment and verification

Deploy the private routing service from the repository root:

    railway up _ORSM --path-as-root --service _ORSM --detach

The image downloads only Ghana's Geofabrik extract and preprocesses it during build. Rebuild/upload to refresh maps; redeploying an existing image does not download newer roads. Backend startup applies migration version 13 before API requests.

Checks:

    node --test server/tests/delivery.test.js
    npx tsgo -p tsconfig.check.json
    npm run build

Before accepting delivery orders, supply the Google key and Ghana tariff variables, and configure international fees in admin. Validate real Ghana and international addresses after supplying the key. Distance Matrix is not needed: OSRM supplies road distance.

References: [Google autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete), [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details), [exchange-rate API](https://www.exchangerate-api.com/docs/free).
