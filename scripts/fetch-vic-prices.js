#!/usr/bin/env node
/**
 * fetch-vic-prices.js
 * ───────────────────
 * Builds `data/prices.json`, the data file consumed by farm-prices.html.
 *
 * Intended source: VIC (Žemės ūkio ir maisto produktų rinkos informacinė
 * sistema) weekly market bulletins, published every Thursday at
 *   https://www.vic.lt/rinkotyra/
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  STATUS: PARSER STUB                                                  │
 * │                                                                       │
 * │  The download + parse steps below are NOT yet implemented against     │
 * │  the real VIC bulletin, because the bulletin's exact URL and document │
 * │  format (PDF vs XLSX) still need to be confirmed against the live     │
 * │  site. Until then, this script regenerates prices.json from           │
 * │  scripts/seed-products.json so the page + pipeline work end-to-end,   │
 * │  and the output is honestly flagged `verified: false`.                │
 * │                                                                       │
 * │  To make it real, implement downloadBulletin() and parseBulletin()    │
 * │  (see the TODOs) and flip `verified` to true. Nothing else needs to   │
 * │  change — the HTML reads whatever this script writes.                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   node scripts/fetch-vic-prices.js          # regenerate from seed (stub)
 *   npm run fetch-prices                       # same, via package.json
 *
 * No external dependencies are required for the stub. The real parser will
 * need a document library — see scripts/README.md for the recommended deps.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const SEED_PATH   = path.join(__dirname, 'seed-products.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'prices.json');

/* VIC source configuration — adjust once the live bulletin is confirmed. */
const VIC = {
  source:    'VIC – Žemės ūkio ir maisto produktų rinkos informacinė sistema',
  sourceUrl: 'https://www.vic.lt/rinkotyra/',
  // TODO: the concrete weekly bulletin URL. VIC posts a fresh document every
  // Thursday; the link pattern needs to be confirmed against the live site.
  // It may be a stable "latest" URL or a dated one that must be discovered by
  // scraping the listing page first.
  bulletinUrl: null,
};

/* ── ISO week helpers ─────────────────────────────────────────────────── */
function isoWeek(date) {
  // Thursday-based ISO 8601 week number.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function weekRange(date) {
  // Monday→Sunday range containing `date`.
  const d = new Date(date);
  const day = d.getDay() || 7;
  const monday = new Date(d); monday.setDate(d.getDate() - day + 1);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const fmt = x => x.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday) };
}

/* ── STEP 1: download the bulletin ────────────────────────────────────── */
/**
 * Download the latest VIC weekly bulletin document.
 *
 * TODO (real implementation):
 *   1. GET the listing page VIC.sourceUrl.
 *   2. Find the most recent bulletin link (PDF or XLSX).
 *   3. Download it to a Buffer and return { buffer, contentType, url }.
 *
 * Note: this MUST run server-side / at build time (here, in Node). A browser
 * cannot do it — vic.lt does not send CORS headers, so a cross-origin fetch
 * from farm-prices.html would be blocked. That is the whole reason this is a
 * build step that writes a same-origin JSON file.
 *
 * @returns {Promise<{buffer: Buffer, contentType: string, url: string} | null>}
 */
async function downloadBulletin() {
  if (!VIC.bulletinUrl) return null; // stub: nothing to download yet

  // Example skeleton (Node 18+ has global fetch):
  //   const listing = await fetch(VIC.sourceUrl).then(r => r.text());
  //   const url = findLatestBulletinUrl(listing);   // TODO: implement
  //   const res = await fetch(url);
  //   if (!res.ok) throw new Error(`Bulletin download failed: HTTP ${res.status}`);
  //   const buffer = Buffer.from(await res.arrayBuffer());
  //   return { buffer, contentType: res.headers.get('content-type') || '', url };
  return null;
}

/* ── STEP 2: parse the bulletin into product records ──────────────────── */
/**
 * Parse the downloaded document into the product schema used by the page.
 *
 * TODO (real implementation):
 *   - PDF: use `pdf-parse` (text) or `pdfjs-dist`, then regex the price tables.
 *   - XLSX: use `xlsx` (SheetJS) to read rows.
 *   Map each line to:
 *     { name, nameEn, cat, catEm, unit, price, change, min, max, catCls }
 *   `change` is week-on-week %. Keep the category mapping in CATEGORY_MAP.
 *
 * @param {{buffer: Buffer, contentType: string, url: string}} _doc
 * @returns {Array<object>}  product records, or [] if not implemented
 */
function parseBulletin(_doc) {
  // TODO: implement document parsing. Returns [] in the stub.
  return [];
}

/* Category → emoji + css-class, for records produced by the real parser. */
const CATEGORY_MAP = {
  'Grūdai':     { catEm: '🌾', catCls: 'grains' },
  'Aliejiniai': { catEm: '🌻', catCls: 'oil' },
  'Daržovės':   { catEm: '🥕', catCls: 'veg' },
  'Vaisiai':    { catEm: '🍎', catCls: 'fruit' },
  'Pienas':     { catEm: '🥛', catCls: 'dairy' },
  'Mėsa':       { catEm: '🥩', catCls: 'meat' },
  'Paukštiena': { catEm: '🍗', catCls: 'poultry' },
  'Kiaušiniai': { catEm: '🥚', catCls: 'eggs' },
};

/* ── STEP 3: validate records ─────────────────────────────────────────── */
function validate(products) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('No products to write');
  }
  const required = ['name', 'nameEn', 'cat', 'unit', 'price'];
  products.forEach((p, i) => {
    for (const key of required) {
      if (p[key] === undefined || p[key] === null) {
        throw new Error(`Product #${i} ("${p.name || '?'}") missing field: ${key}`);
      }
    }
    if (typeof p.price !== 'number' || Number.isNaN(p.price)) {
      throw new Error(`Product "${p.name}" has non-numeric price`);
    }
  });
  return products;
}

/* ── Main ─────────────────────────────────────────────────────────────── */
async function main() {
  const now = new Date();
  const { year, week } = isoWeek(now);
  const range = weekRange(now);

  let products = [];
  let verified = false;
  let notice;

  try {
    const doc = await downloadBulletin();
    if (doc) {
      products = parseBulletin(doc);
    }
  } catch (err) {
    console.warn(`⚠ Bulletin fetch/parse failed: ${err.message}`);
  }

  if (products.length > 0) {
    verified = true;
    notice = null;
    console.log(`✓ Parsed ${products.length} products from the live VIC bulletin.`);
  } else {
    // Stub path: regenerate from the seed so the pipeline stays runnable.
    products = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
    verified = false;
    notice = 'PLACEHOLDER DATA. The VIC bulletin parser is not yet implemented; ' +
             'prices below are indicative seed values, not live market figures. ' +
             'See scripts/fetch-vic-prices.js and scripts/README.md.';
    console.log(`ℹ Parser stub: wrote ${products.length} seed products (verified: false).`);
  }

  validate(products);

  const out = {
    meta: {
      source:      VIC.source,
      sourceUrl:   VIC.sourceUrl,
      bulletin:    'Savaitės biuletenis (weekly bulletin)',
      weekLabel:   `${year} m. ${week} savaitė`,
      periodStart: range.start,
      periodEnd:   range.end,
      currency:    'EUR',
      generatedAt: now.toISOString(),
      verified,
      notice,
      productCount: products.length,
    },
    products,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`→ Wrote ${path.relative(ROOT, OUTPUT_PATH)} (${out.meta.weekLabel}, verified: ${verified}).`);
}

main().catch(err => {
  console.error('✗ fetch-vic-prices failed:', err.message);
  process.exit(1);
});
