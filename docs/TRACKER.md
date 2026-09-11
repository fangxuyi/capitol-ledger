# Tracker application

Capitol Ledger is a React/Next-style application built with vinext for Cloudflare Workers and Sites.

## Application structure

- `app/components/TrackerDashboard.tsx` — the interactive House leaderboard and member workspaces.
- `app/globals.css` — the responsive visual system.
- `app/api/sync/route.ts` — checks raw House Clerk indexes for a selected member.
- `app/api/watchlist/route.ts` — stores tracked members.
- `app/api/alert-rules/route.ts` — stores member-specific alert settings.
- `db/schema.ts` — typed D1 tables for watchlists, filings, sync runs, and alert rules.
- `drizzle/` — versioned database migrations.
- `lib/tracker-data.ts` — curated Pelosi detail and default tracked-member configuration.
- `lib/house-performance.generated.ts` — generated House-wide summary data.
- `public/data/members/` — on-demand member-level transaction and performance records.

## Product surfaces

The **House leaderboard** is a separate top-level destination. It ranks eligible filers by average holding-period excess return by default and can also sort by return, positive rate, holding period, or episode count.

Each **tracked member** gets a dedicated workspace with:

- Overview
- Positions
- Performance
- Trades
- Alerts
- Methodology

The Pelosi workspace includes additional manually reviewed annual-position and option-cycle detail. Other member workspaces use the same navigation and episode methodology, while clearly labeling fields that cannot be recovered from the raw filing.

## Local development

```bash
npm install
npm run dev
```

The persistence layer uses a logical D1 binding named `DB`. Static analytical outputs remain downloadable and versionable; watchlists, sync results, and alert preferences live in D1.

