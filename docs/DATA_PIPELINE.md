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

For a daily update, refresh adjusted security prices and SPY as well:

```bash
npm run data:refresh -- --refresh-prices
npm run check
```

This mode preserves cached histories when a provider request fails and stops before
replacing analytical outputs if a previously available history could not be refreshed.
Do not publish that failed run as a current snapshot. Delisted or renamed securities
may need source review before a complete price refresh can succeed.

Member detail files are generated for every House filer in the summary, so adding a
House member to the watchlist no longer requires a separate code whitelist. Verification
checks each member's detail against the shared summary snapshot. Positions remain
reconstructed unresolved PTR purchase episodes, not verified brokerage balances or
a complete inventory of assets from annual disclosures.

Before each daily refresh, retain the previous successful snapshot in ignored `work/`
storage. Compare newly disclosed purchases, sales and amendments for every active
tracked member, their open episodes and equal-weighted performance, and the House
leaderboard. Describe changes since the previous snapshot, not as same-day trades.
Price-driven performance changes must be distinguished from new disclosure activity.
Use official filing links and reported value bands in summaries.

For email summaries, treat a new/amended tracked-member disclosure, a new or closed
tracked position, a tracked member's excess-return change of at least 2 percentage
points, or a move of at least 10 ranks among eligible House members as material.
Report sample sizes and the comparison dates. Do not email unchanged historical data
as news, and record successful delivery to prevent duplicate messages. Email recipient
configuration belongs in private automation state, not this public repository.

Only publish after verification succeeds; preserve the existing Site, authentication,
watchlist membership and alert preferences. Permanent code changes belong in Git.

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
