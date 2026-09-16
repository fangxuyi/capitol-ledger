# Migration inputs

`bootstrap/` contains the previous site's exported snapshot and per-member raw
transactions. `npm run db:setup` reads these once to initialize a local database.
Only member identities, source coverage, and transaction observations are imported;
saved rankings, episodes, and returns are ignored. Prices come from the existing
`work/house-prices/` cache. These files are not served as public web assets.

`legacy/` preserves the retired hand-maintained Pelosi data and generated ranking
module for comparison. Neither file is imported by the application or seed script.
Annual holding bands and hand-modeled option ROI from these files are not presented
as live data. All member pages now use the database's common PTR calculation path.

The old transaction parser could overwrite multiple rows on the same ticker/date.
The new full refresh uses a row-specific ID; run `npm run data:refresh` to re-extract
cached PDFs and recover distinct rows supported by their source documents.
