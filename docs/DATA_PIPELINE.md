# Daily database workflow

The existing Capitol Ledger Site reads its hosted Cloudflare D1 database. SQL views
calculate holding episodes and returns from raw transactions and adjusted prices.
The daily monitor runs at 9 a.m. America/New_York in the existing setup thread.
A normal daily update imports database records; it does not rebuild or redeploy.

## Daily sequence

Use Node/npm/Git/pdftotext from `/Users/openclaw/.local/share/capitol-tools/bin`.
Stop the local preview before a bulk import. Keep all run evidence under ignored
`work/daily-runs/YYYY-MM-DD/` and do not edit `sources/`.

1. Run `npm run db:backup`. Preserve the last hosted mirror and successful run state.
2. Run `npm run db:verify-hosted -- --before` to record the previous live calculation,
   watchlist and alert preferences. It compares against `work/hosted-database.sqlite`.
3. Run `npm run data:audit`. It downloads official yearly indexes, all current-year
   PTR originals, existing Pelosi hash baselines, and tracked members' recent annual
   disclosures. Changed readable PTR text replaces only its affected cache, with a
   backup. A failed audit blocks publication. Review index changes against the prior
   successful run; historical baselines are not new trades. Older originals outside
   the baseline/recent audit window are not re-downloaded every day.
4. Run `npm run data:refresh -- --quarantine-unavailable-prices`. It parses the complete House universe without a limit,
   refreshes adjusted prices, and imports raw observations in a local transaction.
   SPY establishes the latest completed session as of refresh start; intraday marks
   are excluded. The default command aborts on any previously available history failure. The explicit
   quarantine mode preserves failed histories but stores an exclusion record so they
   cannot contribute scored returns or ranks. It still aborts for SPY failure, more
   than 50 failures, failures above 2% of tickers, or suspicious record-count drops.
   The website displays the exclusions; report them as pricing limitations. Missing
   securities and entry-price gaps greater than seven calendar days remain unscored.
5. Run `npm run data:verify`. Compare source, transaction and price coverage. When
   code changes, also run `npm run check` and the applicable API integration tests.
6. Run `npm run db:publish`. This uploads to the existing hosted database through the
   authenticated `/api/ingest` endpoint. It reads a scoped credential from macOS
   Keychain, service `capitol-ledger-ingest`, account `openclaw`; never print it.
7. Run `npm run db:verify-hosted`. It compares live database-backed calculations with
   the local database for every member summary and each tracked member's detail.
   Verify that watchlist membership and alert rules match the before snapshot.
8. Record checked, refreshed, imported and verified times separately. Advance the
   successful state only after hosted API verification. Keep source generation time
   distinct from import time and benchmark price date.

## Atomic publication and recovery

The importer stores bounded, hashed, idempotent chunks in staging. It rejects missing
chunks, changed baselines and suspicious count drops. After the initial migration,
all raw transaction and price changes become visible in one D1 batch transaction.
No frontend datasets, totals, returns or rankings are generated or embedded.

Initial price loading is allowed only before the first analytics dataset activates;
the old website remains live during that backfill. Ordinary daily price uploads are
deltas against the exact last successful hosted mirror, including corrections to
historical adjusted closes. They are staged and cannot change the live site early.
A successful import saves a consistent local mirror and a hosted import identifier.
Published staging payloads are then removed; import metadata remains for audit.

If upload is interrupted, rerun with the same unchanged local dataset and baseline.
The deterministic run ID resumes identical chunks. A conflicting or stale mirror
must be investigated, not overwritten or treated as a new seed. Keep the last good
hosted data and report the exact failure. Do not create a replacement database or
Site, weaken authentication, or revert to static frontend data.

Permanent implementation changes must be committed and pushed to the existing GitHub
repository. Publish code changes through Sites with the current authentication and
access settings. Data-only updates need no source commit or website rebuild.

## Daily summary and email

Compare the same calculation method before and after refresh: new/amended disclosures,
open/closed episodes, tracked-member excess return and eligible House rankings
(minimum 12 scored episodes). Separate price changes, new filings, parser corrections
and method changes. A reprocessed historical row is not a newly disclosed trade.

Email the user's authorized connected Gmail account when there is a new/amended
tracked disclosure, an opened/closed tracked episode, an excess-return move of at
least 2 percentage points, or a rank move of at least 10 places. Include source links,
filing/transaction dates, comparison dates and sample sizes. Save the Gmail message
ID and snapshot identifier to prevent duplicate sends. Report failures in the task;
never call a failed run up to date. Preserve a draft if Gmail is unavailable.

## Interpretation limits

Positions are unresolved PTR purchase episodes, not verified brokerage holdings.
Returns are equal-weighted historical selection estimates, not portfolio P&L.
Owners and option terms separate episodes; partial exits retain residuals. Purchased
puts use a negative underlying-return proxy. Security and SPY marks share the same
dates. Missing prices remain unknown. Image-only PDFs, non-ticker assets, exact cost
basis, quantities and option premiums remain outside supported extraction.
