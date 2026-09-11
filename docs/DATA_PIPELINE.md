# Data collection and analysis

The pipeline is intentionally raw-source-first. It does not import transaction rows from a third-party congressional-trading tracker.

## Main entry point

`scripts/build-house-performance.mjs` performs the complete refresh:

1. Downloads each annual House Clerk financial-disclosure ZIP index from 2013 through the current supported year.
2. Selects Periodic Transaction Reports and preserves the filer name, district code, document ID, filing date, and original PDF URL.
3. Downloads each original PTR PDF and extracts its embedded text with `pdftotext`. Extracted text is cached in `work/house-ptrs/`, which is ignored by Git.
4. Parses machine-readable single-name stock and option rows, including owner code, action, transaction date, ticker, instrument, expiration, strike, disclosed amount band when recoverable, and source document.
5. Downloads and caches adjusted daily price histories in `work/house-prices/` for the selected security and SPY.
6. Groups related transactions into approximate holding episodes.
7. Measures holding-period return, matching SPY return, excess return, 90-day comparison, direction, status, and calendar holding days.
8. Writes the application summary, full JSON/CSV snapshot, and on-demand member detail files.

Run the complete refresh with:

```bash
npm run data:refresh
```

For a small parser-development pass, the script accepts a document limit:

```bash
node scripts/build-house-performance.mjs --limit=250
```

Do not publish a limited run as a complete dataset.

## Episode rules

- A disclosed purchase opens an episode.
- Additional purchases in the same security/contract remain in the episode because exact quantities and lot matching are not consistently available.
- A full sale or exchange closes the episode.
- A partial sale leaves a residual episode open.
- An unmatched open episode is marked to the latest price.
- A purchased stock or call is treated as long; a purchased put is treated as short.
- A reported stock sale is an exit or trim, not a new short position.
- Options are grouped by ticker, direction, expiration, and strike where those fields are recoverable.
- When exact historical option quotes are unavailable, the return shown is the directional return of the underlying stock, clearly labeled as a proxy.

Member and House summary metrics are arithmetic, equal-weighted averages across scored episodes. They are not time-weighted or capital-weighted portfolio returns.

## Outputs

- `lib/house-performance.generated.ts` — compact House-level summaries used by the leaderboard.
- `public/data/house-performance.json` — metadata, member summaries, and all reconstructed episodes.
- `public/data/house-performance-episodes.csv` — one portable row per episode.
- `public/data/members/*.json` — transaction and episode detail loaded on demand for tracked/addable members.

Run `npm run data:verify` after a refresh. It checks record counts, member files, and source provenance before the site is built.

## Known limitations

Image-only PTRs require OCR and are not yet fully represented. Exact quantities, cost basis, execution prices, and option premiums are often absent or expressed only as broad bands. Ticker normalization and corporate actions can also require manual review. The dashboard exposes these limits rather than turning missing facts into suspiciously precise arithmetic.

