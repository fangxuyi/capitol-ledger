# Capitol Ledger

A database-backed congressional disclosure tracker. The website reads Cloudflare
D1 (SQLite) through server APIs. Transactions, daily adjusted prices, watchlists,
and alert preferences are persisted. SQL views reconstruct holding episodes and
calculate returns on demand; no build is needed after database updates.

## Run locally — no paid service or cloud account required

Requires Node 22.13+ and the existing price cache in `work/house-prices/`.

```sh
npm ci
npm run db:setup
npm run dev -- --port 3001
```

Open http://localhost:3001. Development on localhost uses a local workspace identity.
Production still requires the existing ChatGPT authentication gateway. The dev-only
identity branch is removed from production builds. Bind local development to loopback;
do not expose the Vite server to the public internet.

`db:setup` applies versioned SQL migrations and imports the previous raw transaction
snapshot plus the cached price histories. It does not import precomputed returns or
rankings. The bootstrap import upserts stable records, preserving saved watchlists
and alert preferences. Repeating it intentionally restores bootstrap observations;
use the full refresh for current source data.

Local state lives under `.wrangler/state/v3/d1/` (ignored by Git). Wrangler and Vite
use the same `wrangler.jsonc` binding and state directory. The importer locates the
SQLite file by its schema and refuses ambiguous matches. It runs one SQLite
transaction: an import failure leaves the previous database intact. Stop the dev
server before bulk imports/migrations. The website itself uses the D1 binding;
only local maintenance scripts open SQLite directly for efficient bulk loading.

## Refresh data

```sh
npm run data:refresh
```

This reads official House Clerk yearly indexes, extracts PTR transaction rows, updates
adjusted daily prices, and commits the validated dataset to the local database.
It requires internet access and `pdftotext` (Poppler). It reuses cached filing text.
Cached price refresh failures abort publication so incomplete prices do not silently
replace the previous dataset. Missing price histories remain unscored. Nonpositive
price observations are excluded and counted in the import output.

The dashboard polls its APIs every minute while visible, and all API reads bypass
HTTP caches. **Live calculations mean calculations from the latest stored inputs;
this is not a streaming market-data feed.** The page displays the benchmark price
date and import time. The existing daily monitor runs at 9 a.m. New York time and
uses the hosted ingestion workflow documented in `docs/DATA_PIPELINE.md`.

“Check filings” only discovers and saves official filing metadata. It does not parse
new PDFs or update prices; use the full refresh command for those steps.

## Storage and calculation model

| Table/view | Purpose |
| --- | --- |
| `research_members` | Member identities and indexed filing coverage |
| `filings` | Discovered filing metadata and official source URLs |
| `transactions` | Parsed observations, owner and contract terms, original row JSON |
| `price_history` | Daily adjusted closes keyed by ticker and date |
| `holding_episodes` | SQL view pairing purchases with full exits; partial sales retain residuals |
| `performance_episodes` | SQL view deriving returns, matched SPY returns, and holding days |
| `dataset_imports` | Source generation time, import time, and extraction coverage |
| `tracked_members`, `alert_rules` | Persistent shared-workspace preferences |
| `sync_runs` | Successful index-check records |

Episodes are separated by member, household owner, security, instrument, and option
terms. Returns use the first available security price on/after purchase and last
price on/before close. SPY is measured on those same price dates. Missing prices yield
unknown returns, not zero. Purchased puts use the negative underlying return proxy;
this is not an actual option valuation. These remain approximate, equally weighted
selection results, not portfolio returns. Image-only PDFs require a future OCR adapter.

The old manually maintained Pelosi panels have been retired. Pelosi uses the same
calculation engine as all other members. Old source snapshots are preserved under
`data/` for migration/audit purposes and are not shipped as public assets. Household
owner separation and matched benchmark dates can change prior published rankings.

## Maintain and verify

```sh
npm run db:migrate       # apply new numbered SQL files under drizzle/
npm run db:types         # regenerate Cloudflare runtime/binding types
npm run data:verify      # SQLite integrity, foreign keys, and calculation coverage
npm run db:backup        # consistent SQLite backup under ignored backups/
npm run check           # calculation tests, TypeScript, build, lint
npm run test:live       # API integration test against localhost:3001
```

Use sequential SQL migrations for schema and view changes. `db/schema.ts` supplies
Drizzle mappings for application writes; `drizzle/*.sql` is the migration authority.
The older Drizzle snapshot metadata is historical; do not regenerate/apply duplicate
migrations from it. Production builds package all SQL migrations for the existing
Sites hosting workflow.

To restore: stop development, locate the database printed by `data:verify`, move its
SQLite file and any matching `-wal`/`-shm` files into a safe archive, then copy a backup
to the original SQLite pathname and restart. Keep backups outside this machine too.
Never delete `.wrangler/state` as a cleanup step without backing it up first.

## Hosted deployment

The existing Site uses its managed D1 binding. Versioned migrations are packaged
with code deployments. The local placeholder in `wrangler.jsonc` is used only by
local development; Sites supplies the existing production binding.

Run `npm run db:publish` after a validated source refresh, then
`npm run db:verify-hosted`. A scoped import credential is stored in macOS Keychain
and as a secret runtime variable in Sites. Uploads are staged; activation atomically
updates observations and timestamps. The website recalculates from that database
without a rebuild. See [the daily workflow](docs/DATA_PIPELINE.md) for recovery.

The initial hosted import includes the full adjusted-price history. Daily uploads
send changed observations against a verified local mirror. Watchlist and alert
preferences are preserved and are shared across the project. Per-rule alert delivery
is not implemented; the daily monitor separately evaluates material changes and
uses the user's existing Gmail authorization for summaries.
