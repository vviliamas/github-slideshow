# VIC price data pipeline

`farm-prices.html` does **not** scrape anything at runtime. A browser cannot
fetch VIC bulletins directly — `vic.lt` serves no CORS headers, so a
cross-origin request from the page is blocked, and the bulletins are PDFs/Excel
that would need heavy client-side parsing anyway.

Instead, a **build-time Node script** produces a same-origin data file that the
page loads:

```
scripts/seed-products.json   →  scripts/fetch-vic-prices.js  →  data/prices.json  →  farm-prices.html
```

## Refreshing the data (manual)

```bash
npm run fetch-prices      # regenerates data/prices.json
git add data/prices.json
git commit -m "Update prices (week NN)"
```

VIC publishes a fresh weekly bulletin every **Thursday**, so the natural cadence
is to run this once a week.

## ⚠ Current status: parser STUB

The script is wired end-to-end but the **download + parse steps are not yet
implemented** against the real bulletin. Until they are, `fetch-prices`
regenerates `data/prices.json` from `seed-products.json` and honestly flags the
output as `verified: false`. The page shows a matching "unverified / placeholder"
banner so nobody mistakes the seed numbers for live market prices.

## Making it real

Edit `scripts/fetch-vic-prices.js` and implement the two TODO functions:

1. **`downloadBulletin()`** — fetch `https://www.vic.lt/rinkotyra/`, find the
   latest bulletin link, download the document. (Node 18+ has global `fetch`.)

2. **`parseBulletin(doc)`** — turn the document into product records:
   ```js
   { name, nameEn, cat, catEm, unit, price, change, min, max, catCls }
   ```
   - `unit` is one of `EUR/t`, `EUR/kg`, `EUR/L`, `EUR/vnt`
   - `change` is the week-on-week % change
   - use `CATEGORY_MAP` for `catEm` / `catCls`

   Add the parsing dependency that matches the bulletin format:
   ```bash
   npm install pdf-parse     # if the bulletin is a PDF
   #   – or –
   npm install xlsx          # if it's an Excel file
   ```

When `parseBulletin` returns a non-empty array, the script automatically sets
`verified: true`, drops the placeholder notice, and the page switches its banner
to "verified / live" — no HTML changes needed.

## Data contract

`data/prices.json`:

```jsonc
{
  "meta": {
    "source": "VIC – …",
    "sourceUrl": "https://www.vic.lt/rinkotyra/",
    "weekLabel": "2026 m. 22 savaitė",
    "periodStart": "2026-05-25",
    "periodEnd":   "2026-05-31",
    "currency": "EUR",
    "generatedAt": "2026-05-31T…Z",
    "verified": false,           // true once the real parser runs
    "notice": "…",               // null when verified
    "productCount": 39
  },
  "products": [ /* see contract above */ ]
}
```

The page reads `meta.verified`, `meta.weekLabel`, `meta.periodStart/End`,
`meta.source*` and `meta.notice` to render provenance and the trust banner.
