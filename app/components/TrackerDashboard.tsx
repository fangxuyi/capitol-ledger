"use client";

import { useEffect, useMemo, useState } from "react";
import { houseMembersPerformance, housePerformanceMeta } from "../../lib/house-performance.generated";
import {
  closedPickPerformance,
  filingCadence,
  member,
  openPickPerformance,
  officialSources,
  positions,
  reportedIncomeHistory,
  suggestedMembers,
  trackedMembers as initialTrackedMembers,
  trades,
  type TrackedMember,
  type Trade,
} from "../../lib/tracker-data";

type Tab = "House Summary" | "Overview" | "Positions" | "Performance" | "Trades" | "Alerts" | "Methodology";
type MemberTab = Exclude<Tab, "House Summary">;

const memberTabs: MemberTab[] = ["Overview", "Positions", "Performance", "Trades", "Alerts", "Methodology"];

type MemberTransaction = { id: string; memberId: string; ticker: string; assetName: string; instrument: string; direction: string; owner: string; action: string; closeKind: string | null; expirationDate: string | null; strike: string | null; amount: string; transactionDate: string; filingDate: string; filingId: string; sourceUrl: string };
type MemberEpisode = MemberTransaction & { closeDate: string; status: string; periodDays: number | null; returnValue: number | null; benchmarkReturn: number | null; excessReturn: number | null };
type MemberDetails = { transactions: MemberTransaction[]; episodes: MemberEpisode[] };

function severityLabel(severity: Trade["severity"]) {
  return severity === "urgent" ? "Major" : severity === "high" ? "Material" : "Update";
}

function TradeRow({ trade, compact = false }: { trade: Trade; compact?: boolean }) {
  const isBuy = trade.action === "Purchase";
  return (
    <div className={`trade-row ${compact ? "trade-row-compact" : ""}`}>
      <div className={`action-mark ${isBuy ? "buy" : "sell"}`}>{isBuy ? "B" : "S"}</div>
      <div className="trade-asset">
        <div className="trade-title-line">
          <strong>{trade.ticker}</strong>
          <span>{trade.asset}</span>
          <span className="instrument-pill">{trade.instrument}</span>
        </div>
        <p>{trade.detail}</p>
        <div className="trade-meta">
          <span>{trade.owner}</span>
          <span>Traded {trade.transactionDate}</span>
          <span>Filed {trade.filedDate}</span>
          <a href={trade.sourceUrl} target="_blank" rel="noreferrer">Filing {trade.filingId} ↗</a>
        </div>
      </div>
      <div className="trade-amount">
        <strong>{trade.amount}</strong>
        <span className={`severity ${trade.severity}`}>{severityLabel(trade.severity)}</span>
      </div>
    </div>
  );
}

function MetricCard({ eyebrow, value, note, tone = "default" }: { eyebrow: string; value: string; note: string; tone?: "default" | "green" | "amber" }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-top"><span>{eyebrow}</span><span className="metric-dot" /></div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function TrackedMemberDetail({ profile, section }: { profile: TrackedMember; section: Exclude<MemberTab, "Alerts" | "Methodology"> }) {
  const summary = houseMembersPerformance.find((row) => row.id === profile.id);
  const [loadedDetails, setLoadedDetails] = useState<{ memberId: string; data: MemberDetails } | null>(null);
  const details = loadedDetails?.memberId === profile.id ? loadedDetails.data : null;
  const signed = (value: number | null) => value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  useEffect(() => {
    let current = true;
    fetch(`/data/members/${profile.id}.json`).then((response) => response.ok ? response.json() : { transactions: [], episodes: [] }).then((payload) => { if (current) setLoadedDetails({ memberId: profile.id, data: payload }); }).catch(() => { if (current) setLoadedDetails({ memberId: profile.id, data: { transactions: [], episodes: [] } }); });
    return () => { current = false; };
  }, [profile.id]);

  if (!summary) {
    return (
      <div className="tab-content">
        <section className="panel source-gap-panel">
          <span className="kicker">Tracked target · raw-source match pending</span>
          <h2>{profile.name} is saved to your watchlist</h2>
          <p>{profile.name} does not have a matching record in the House Clerk dataset used for the current performance engine. The tracker keeps the name visible, but does not substitute or invent performance while the correct raw-source record is unavailable.</p>
          <a href={officialSources.search} target="_blank" rel="noreferrer">Open raw Clerk search ↗</a>
        </section>
      </div>
    );
  }

  if (!details) return <div className="tab-content"><section className="panel member-detail-loading"><span className="kicker">Loading raw-source detail</span><h2>Preparing {profile.name}’s record…</h2><p>Transactions, reconstructed positions, and holding episodes are loading from the saved member dataset.</p></section></div>;

  const episodes = details.episodes;
  const transactions = details.transactions;
  const openEpisodes = episodes.filter((episode) => episode.status.includes("latest mark"));
  const actionLabel = (action: string, closeKind: string | null) => action === "P" ? "Purchase" : action === "S" ? closeKind === "partial" ? "Partial sale" : "Sale" : "Exchange";

  if (section === "Positions") return (
    <div className="tab-content">
      <section className="section-intro"><div><span className="kicker">Latest-price residuals</span><h2>Reconstructed open positions</h2><p>These are unresolved purchase episodes, not exact brokerage balances. Partial sales retain the remaining episode and every row links to its official PTR.</p></div><span className="readiness-pill">{openEpisodes.length} latest marks</span></section>
      <section className="panel member-detail-panel"><div className="member-detail-head position-detail-grid"><span>Security</span><span>Direction</span><span>Opened</span><span>Holding period</span><span>Return</span><span>Excess</span><span>Status / source</span></div>{openEpisodes.map((episode) => <div className="member-detail-row position-detail-grid" key={episode.id}><div><strong>{episode.ticker}</strong><small>{episode.instrument}{episode.strike ? ` · $${episode.strike} strike` : ""}</small></div><span className={episode.direction === "Long" ? "direction-long" : "direction-short"}>{episode.direction}</span><span>{episode.transactionDate}</span><span>{episode.periodDays ?? "—"}d</span><strong className={episode.returnValue !== null && episode.returnValue >= 0 ? "return-positive" : "return-negative"}>{signed(episode.returnValue)}</strong><strong className={episode.excessReturn !== null && episode.excessReturn >= 0 ? "return-positive" : "return-negative"}>{signed(episode.excessReturn)}</strong><a href={episode.sourceUrl} target="_blank" rel="noreferrer">{episode.status} ↗</a></div>)}{!openEpisodes.length && <div className="empty-state">No unresolved machine-readable purchase episode was found.</div>}</section>
      <div className="inline-note"><strong>Position limit:</strong> official PTRs disclose transaction bands, not complete live share balances. “Open” means no machine-readable full exit was matched; it is explicitly an approximate latest-price mark.</div>
    </div>
  );

  if (section === "Performance") return (
    <div className="tab-content">
      <section className="performance-metrics"><MetricCard eyebrow="Average holding return" value={signed(summary.averageReturn)} note={`${summary.scoredCount} equally weighted scored episodes.`} tone="green" /><MetricCard eyebrow="Average excess vs SPY" value={signed(summary.averageExcess)} note="Benchmark matched to every holding period." /><MetricCard eyebrow="Positive rate" value={summary.hitRate === null ? "—" : `${summary.hitRate.toFixed(1)}%`} note="Share of scored episodes with positive directional return." tone="amber" /><MetricCard eyebrow="Average holding period" value={summary.averageHoldingDays === null ? "—" : `${summary.averageHoldingDays.toLocaleString()}d`} note={`${summary.closedCount} closed · ${summary.openCount} latest-price marks.`} /></section>
      <section className="panel member-detail-panel"><div className="panel-head detail-panel-title"><div><span className="kicker">Every reconstructed episode</span><h2>Holding-period performance</h2></div><span>{episodes.length} episodes</span></div><div className="member-detail-head performance-detail-grid"><span>Security</span><span>Opened</span><span>Closed / marked</span><span>Days</span><span>Return</span><span>SPY</span><span>Excess</span><span>Status / source</span></div>{episodes.map((episode) => <div className="member-detail-row performance-detail-grid" key={episode.id}><div><strong>{episode.ticker}</strong><small>{episode.direction} {episode.instrument}</small></div><span>{episode.transactionDate}</span><span>{episode.closeDate}</span><span>{episode.periodDays ?? "—"}</span><strong className={episode.returnValue !== null && episode.returnValue >= 0 ? "return-positive" : "return-negative"}>{signed(episode.returnValue)}</strong><span>{signed(episode.benchmarkReturn)}</span><strong className={episode.excessReturn !== null && episode.excessReturn >= 0 ? "return-positive" : "return-negative"}>{signed(episode.excessReturn)}</strong><a href={episode.sourceUrl} target="_blank" rel="noreferrer">{episode.status} ↗</a></div>)}</section>
      <div className="inline-note"><strong>Same method for every tracked member:</strong> first disclosed purchase opens an episode; a full sale closes it; partial-sale residuals and unmatched exits use the latest price. Options use underlying-stock direction because exact historical option premiums are not consistently public.</div>
    </div>
  );

  if (section === "Trades") return (
    <div className="tab-content">
      <section className="section-intro"><div><span className="kicker">Official transaction ledger</span><h2>Parsed purchases, sales, and exchanges</h2><p>Every row comes from this member’s machine-readable House PTR and links back to the original document.</p></div><span className="readiness-pill">{transactions.length} parsed rows</span></section>
      <section className="panel member-detail-panel"><div className="member-detail-head trade-detail-grid"><span>Action</span><span>Security</span><span>Instrument</span><span>Owner</span><span>Trade date</span><span>Reported amount</span><span>Filing / source</span></div>{transactions.map((transaction) => <div className="member-detail-row trade-detail-grid" key={transaction.id}><span className={transaction.action === "P" ? "direction-long" : "direction-short"}>{actionLabel(transaction.action, transaction.closeKind)}</span><div><strong>{transaction.ticker}</strong><small>{transaction.assetName}</small></div><span>{transaction.instrument}{transaction.strike ? ` · $${transaction.strike}` : ""}</span><span>{transaction.owner}</span><span>{transaction.transactionDate}</span><strong>{transaction.amount}</strong><a href={transaction.sourceUrl} target="_blank" rel="noreferrer">PTR {transaction.filingId} ↗</a></div>)}</section>
      <div className="inline-note"><strong>Coverage:</strong> this ledger contains extractable single-name stock and option rows. Image-only PDFs, non-ticker assets, and rows that cannot be normalized safely remain outside the parsed table but stay counted in filing coverage.</div>
    </div>
  );

  const latestTransactions = transactions.slice(0, 6);
  return (
    <div className="tab-content">
      <section className="performance-metrics"><MetricCard eyebrow="Official PTRs indexed" value={summary.filingCount.toLocaleString()} note={`${transactions.length} machine-readable stock and option rows.`} /><MetricCard eyebrow="Scored episodes" value={summary.scoredCount.toLocaleString()} note={`${summary.closedCount} closed · ${summary.openCount} latest-price marks.`} /><MetricCard eyebrow="Average excess vs SPY" value={signed(summary.averageExcess)} note="Equal-weighted holding-period estimate." tone="green" /><MetricCard eyebrow="Positive rate" value={summary.hitRate === null ? "—" : `${summary.hitRate.toFixed(1)}%`} note={`${summary.averageHoldingDays?.toLocaleString() ?? "—"} days average holding period.`} tone="amber" /></section>
      <section className="tracked-overview-grid"><article className="panel member-detail-panel"><div className="panel-head"><div><span className="kicker">Latest disclosed activity</span><h2>Transaction timeline</h2></div><span>{latestTransactions.length} latest rows</span></div>{latestTransactions.map((transaction) => <a className="tracked-activity-row" href={transaction.sourceUrl} target="_blank" rel="noreferrer" key={transaction.id}><span className={transaction.action === "P" ? "direction-long" : "direction-short"}>{transaction.action}</span><div><strong>{transaction.ticker} · {actionLabel(transaction.action, transaction.closeKind)}</strong><small>{transaction.transactionDate} · {transaction.amount}</small></div><b>↗</b></a>)}</article><article className="panel member-detail-panel"><div className="panel-head"><div><span className="kicker">Current reconstruction</span><h2>Open/latest-mark episodes</h2></div><span>{openEpisodes.length} total</span></div>{openEpisodes.slice(0, 6).map((episode) => <a className="tracked-activity-row" href={episode.sourceUrl} target="_blank" rel="noreferrer" key={episode.id}><span>{episode.ticker}</span><div><strong>{signed(episode.returnValue)} holding return</strong><small>{episode.periodDays ?? "—"}d · {episode.status}</small></div><b>↗</b></a>)}</article></section>
      <div className="inline-note"><strong>Tracking status:</strong> this profile now uses the same six-section structure as Pelosi. The source depth is identical where the raw filings support it; unavailable quantities, cost basis, and exact option prices remain clearly marked rather than estimated as facts.</div>
    </div>
  );
}

function HouseSummary() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"ranked" | "all">("ranked");
  const [sort, setSort] = useState<"excess" | "return" | "hit" | "holding" | "picks">("excess");
  const eligibleCount = houseMembersPerformance.filter((row) => row.scoredCount >= 12).length;
  const shortCount = houseMembersPerformance.reduce((sum, row) => sum + row.shortCount, 0);
  const readableShare = housePerformanceMeta.textReadablePtrCount / housePerformanceMeta.ptrCount * 100;
  const topEligible = houseMembersPerformance.find((row) => row.scoredCount >= 12);
  const rows = useMemo(() => {
    const score = (row: (typeof houseMembersPerformance)[number]) => {
      if (sort === "picks") return row.scoredCount;
      if (sort === "return") return row.averageReturn ?? -Infinity;
      if (sort === "hit") return row.hitRate ?? -Infinity;
      if (sort === "holding") return row.averageHoldingDays ?? -Infinity;
      return row.averageExcess ?? -Infinity;
    };
    return houseMembersPerformance
      .filter((row) => scope === "all" || row.scoredCount >= 12)
      .filter((row) => `${row.name} ${row.stateDistrict}`.toLowerCase().includes(query.toLowerCase()))
      .toSorted((a, b) => score(b) - score(a));
  }, [query, scope, sort]);
  const signed = (value: number | null) => value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <div className="tab-content house-summary">
      <section className="house-summary-hero">
        <div>
          <span className="kicker">All House Clerk PTR filers · 2013–2026</span>
          <h2>Who selected stocks well over the holding period?</h2>
          <p>Each episode runs from the first disclosed purchase to a reported close. Partial-sale residuals and positions without a reliable close use the latest available price and are labeled approximate. Stock and call purchases are long; purchased puts are short. Options use the underlying stock return as a directional proxy.</p>
        </div>
        <div className="house-summary-actions">
          <a href={officialSources.search} target="_blank" rel="noreferrer">Raw Clerk database ↗</a>
          <a href="/data/house-performance.json" download>Download JSON</a>
          <a href="/data/house-performance-episodes.csv" download>Download CSV</a>
        </div>
      </section>

      <section className="performance-metrics house-metrics">
        <MetricCard eyebrow="Indexed House filers" value={housePerformanceMeta.filerCount.toLocaleString()} note={`${housePerformanceMeta.ptrCount.toLocaleString()} official periodic transaction reports reviewed.`} />
        <MetricCard eyebrow="Scored holding episodes" value={housePerformanceMeta.scoredEpisodeCount.toLocaleString()} note="Closed episodes plus open or partial-sale residuals marked to the latest price." tone="green" />
        <MetricCard eyebrow="Ranking eligible" value={eligibleCount.toLocaleString()} note="Members with at least 12 scored holding episodes; all other filers remain visible." />
        <MetricCard eyebrow="Purchased puts" value={shortCount.toLocaleString()} note="The only selections classified as short. Reported stock sales are not short sales." tone="amber" />
      </section>

      <section className="coverage-banner">
        <div className="coverage-gauge"><span style={{ width: `${readableShare}%` }} /></div>
        <div><strong>{readableShare.toFixed(1)}% machine-readable PTR coverage</strong><p>{housePerformanceMeta.textReadablePtrCount.toLocaleString()} of {housePerformanceMeta.ptrCount.toLocaleString()} official PDFs contain extractable text. Every indexed filer appears below, but older image-only filings await OCR and can make historical selection counts incomplete.</p></div>
        <span className="readiness-pill">Preliminary ranking</span>
      </section>

      {topEligible && <section className="leader-strip">
        <span className="leader-rank">01</span>
        <div><span className="kicker">Highest average holding-period excess · minimum 12 episodes</span><h3>{topEligible.name}</h3><p>{topEligible.stateDistrict} · {topEligible.scoredCount} scored episodes · {topEligible.hitRate?.toFixed(1)}% positive</p></div>
        <strong>{signed(topEligible.averageExcess)}</strong>
        <small>average holding-period excess vs SPY</small>
      </section>}

      <section className="section-intro house-controls">
        <div><span className="kicker">Equal-weighted estimated episodes</span><h2>House performance table</h2><p>The default rank is average holding-period excess return versus SPY, among members with 12+ scored episodes. Average holding period is the equal-weighted mean number of calendar days across those episodes.</p></div>
        <div className="filters">
          <label><span>Find a member</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or district" /></label>
          <label><span>Coverage</span><select value={scope} onChange={(event) => setScope(event.target.value as "ranked" | "all")}><option value="ranked">Ranked · 12+ picks</option><option value="all">All indexed filers</option></select></label>
          <label><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="excess">Average excess · default</option><option value="return">Average return</option><option value="hit">Positive rate</option><option value="holding">Average holding period</option><option value="picks">Scored picks</option></select></label>
        </div>
      </section>

      <section className="panel house-table-panel">
        <div className="house-table">
          <div className="house-head"><span>Rank / member</span><span>Episodes</span><span>Direction</span><span>Avg holding return</span><span>Avg excess</span><span>Positive rate</span><span>Avg hold</span><span>Selected stocks · featured outcomes</span></div>
          {rows.map((row, index) => (
            <div className="house-row" key={row.id}>
              <div className="house-member"><span>{String(index + 1).padStart(2, "0")}</span><p><strong>{row.name}</strong><small>{row.stateDistrict || "District unavailable"} · {row.filingCount} PTRs</small></p></div>
              <div className="coverage-cell"><strong>{row.scoredCount}</strong><span>{row.closedCount} closed · {row.openCount} latest-mark</span></div>
              <div className="direction-cell"><span className="direction-long">L {row.longCount}</span><span className="direction-short">S {row.shortCount}</span></div>
              <strong className={row.averageReturn !== null && row.averageReturn >= 0 ? "return-positive" : "return-negative"}>{signed(row.averageReturn)}</strong>
              <strong className={row.averageExcess !== null && row.averageExcess >= 0 ? "return-positive" : "return-negative"}>{signed(row.averageExcess)}</strong>
              <span>{row.hitRate === null ? "—" : `${row.hitRate.toFixed(1)}%`}</span>
              <span>{row.averageHoldingDays === null ? "—" : `${row.averageHoldingDays.toLocaleString()}d`}</span>
              <div className="featured-picks">
                {row.featuredPicks.length ? row.featuredPicks.map((pick) => (
                  <a href={pick.sourceUrl} target="_blank" rel="noreferrer" key={pick.id} title={`${pick.direction} ${pick.instrument} · ${pick.transactionDate} to ${pick.closeDate} · ${pick.status}`}>
                    <b>{pick.ticker}</b><span className={pick.returnValue !== null && pick.returnValue >= 0 ? "return-positive" : "return-negative"}>{signed(pick.returnValue)}</span><small>{pick.periodDays ?? "—"}d · {signed(pick.excessReturn)} excess</small>
                  </a>
                )) : <span className="no-picks">No machine-readable single-name purchase</span>}
              </div>
            </div>
          ))}
        </div>
        {!rows.length && <div className="empty-state">No House filer matches that search.</div>}
      </section>

      <div className="inline-note"><strong>Saved dataset:</strong> the downloadable JSON preserves the member summaries and episode-level records; the CSV contains one row per episode. Both are versioned with this site so the same snapshot can be referenced and reused later. <strong>Approximation:</strong> this is not exact portfolio performance. Missing quantities and lot matching mean each reconstructed episode is equal-weighted.</div>
    </div>
  );
}

function Overview() {
  const maxCadence = Math.max(...filingCadence.map((item) => item.value));
  return (
    <div className="tab-content">
      <section className="metric-grid" aria-label="Key disclosure metrics">
        <MetricCard eyebrow="2026 reported activity" value="$23.1M–$95.4M" note="Gross disclosed transaction bands; not revenue or profit." tone="green" />
        <MetricCard eyebrow="2025 disclosed capital gains" value="≥ $7.0M" note="Gross floor from annual income bands; not net portfolio P&L." />
        <MetricCard eyebrow="Official PTRs indexed" value="66" note="House Clerk filings since 2013, including historical districts." />
        <MetricCard eyebrow="Latest disclosure lag" value="24 days" note="Last transaction to filing date in the Aug 21 report." tone="amber" />
      </section>

      <section className="overview-grid">
        <article className="panel activity-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">Latest material changes</span>
              <h2>Household activity</h2>
            </div>
            <span className="freshness"><i /> Official through Aug 21, 2026</span>
          </div>
          <div className="trade-list">
            {trades.slice(0, 5).map((trade) => <TradeRow key={trade.id} trade={trade} compact />)}
          </div>
        </article>

        <aside className="panel source-panel">
          <span className="kicker">Source health</span>
          <h2>Raw Clerk pipeline</h2>
          <div className="pipeline-status">
            <div><span className="pipeline-icon">1</span><p><strong>Yearly index</strong><small>TSV + XML · checked daily</small></p><b>Live</b></div>
            <div><span className="pipeline-icon">2</span><p><strong>Official PDFs</strong><small>Hash + filing metadata retained</small></p><b>Live</b></div>
            <div><span className="pipeline-icon muted">3</span><p><strong>Transaction parse</strong><small>Embedded text, OCR fallback</small></p><b className="review">Reviewed</b></div>
          </div>
          <a className="source-link" href={officialSources.index} target="_blank" rel="noreferrer">
            Open 2026 bulk index <span>↗</span>
          </a>
          <p className="source-footnote">Every displayed trade links to the House Clerk PDF it came from.</p>
        </aside>
      </section>

      <section className="lower-grid">
        <article className="panel cadence-panel">
          <div className="panel-head">
            <div><span className="kicker">Historical record</span><h2>Periodic transaction filings</h2></div>
            <span className="chart-total">66 total</span>
          </div>
          <div className="bar-chart" aria-label="Annual PTR filings from 2013 to 2026">
            {filingCadence.map((item) => (
              <div className="bar-column" key={item.year} title={`${item.year}: ${item.value} filings`}>
                <span className="bar-value">{item.value}</span>
                <div className="bar" style={{ height: `${24 + (item.value / maxCadence) * 116}px` }} />
                <small>{item.year.slice(2)}</small>
              </div>
            ))}
          </div>
          <p className="chart-note">Counts come directly from the Clerk’s annual bulk indexes. Filing count is not the same as trade count.</p>
        </article>

        <article className="panel range-panel">
          <div className="panel-head">
            <div><span className="kicker">Position reconstruction</span><h2>Largest confirmed ranges</h2></div>
            <span className="asof">Annual snapshot · 12/31/25</span>
          </div>
          <div className="range-list">
            {positions.slice(0, 6).map((position) => (
              <div className="range-row" key={position.ticker}>
                <div><strong>{position.ticker}</strong><span>{position.type}</span></div>
                <div className="range-track"><span style={{ width: `${Math.max(7, (position.high / 30) * 100)}%` }} /></div>
                <b>{position.annualBand}</b>
              </div>
            ))}
          </div>
          <p className="chart-note">Bars use the upper end of each disclosed band. Later PTR flows are shown in the Positions view.</p>
        </article>
      </section>

      <section className="truth-banner">
        <div className="truth-icon">≈</div>
        <div><strong>Why there is no fake “exact profit” number</strong><p>The official filings omit exact trade values, execution prices, cost basis, and often share counts. Capitol Ledger reports exact facts where disclosed, preserves low/high bands everywhere else, and keeps market-price estimates separate from the official record.</p></div>
        <a href="#methodology">Read the method</a>
      </section>
    </div>
  );
}

function Positions() {
  return (
    <div className="tab-content">
      <section className="section-intro">
        <div><span className="kicker">Annual anchor + later flows</span><h2>Latest reconstructable positions</h2><p>These are household disclosure ranges, not a brokerage statement. “New in 2026” comes from later PTR purchases.</p></div>
        <div className="legend"><span><i className="legend-high" /> Confirmed</span><span><i className="legend-mid" /> Inferred balance</span></div>
      </section>
      <section className="panel table-panel">
        <div className="position-table">
          <div className="position-head"><span>Asset</span><span>Owner</span><span>Last confirmed range</span><span>Later disclosed change</span><span>Confidence</span></div>
          {positions.map((position) => (
            <div className="position-row" key={position.ticker}>
              <div className="asset-cell"><span className="ticker-chip">{position.ticker}</span><p><strong>{position.name}</strong><small>{position.type}</small></p></div>
              <span>{position.owner}</span>
              <strong>{position.annualBand}</strong>
              <span className={`change ${position.direction}`}>{position.lastChange}</span>
              <span className={`confidence confidence-${position.confidence.toLowerCase()}`} title={position.note}>{position.confidence}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="inline-note"><strong>Position rule:</strong> an asset missing from an annual filing is not assumed to be zero. It may be below the reporting threshold, exempt, held in an excepted trust, or omitted.</div>
    </div>
  );
}

function Performance() {
  const maxAnnual = Math.max(...reportedIncomeHistory.map((item) => item.gainTaggedFloor));
  const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  const money = (value: number) => `${value < 0 ? "−" : "+"}$${Math.abs(value).toFixed(3)}M`;
  return (
    <div className="tab-content">
      <section className="performance-metrics" aria-label="Pick performance summary">
        <MetricCard eyebrow="Closed, fully linkable cycles" value="15" note="Option purchases matched to a disclosed exercise, sale, expiry, or official loss." />
        <MetricCard eyebrow="Midpoint-positive rate" value="60.0%" note="9 of 15 premium-band midpoint scenarios finished positive; definite-win floor is 40.0%." tone="green" />
        <MetricCard eyebrow="Underlying beat SPY" value="53.3%" note="8 of 15 underlying securities outperformed SPY over the same holding window." />
        <MetricCard eyebrow="Attributable P&L range" value="−$0.4M to +$7.1M" note="Range across all 15 cycles; premium-band midpoint scenario is about +$3.4M." tone="amber" />
      </section>

      <section className="performance-callout">
        <span>MODELED · NOT AUDITED</span>
        <div><strong>This is the narrowest historical sample the raw filings can support.</strong><p>It includes 15 option purchases with enough terms and a later disclosed close. Four losses come directly from reported gain/loss figures; other rows are filing-band models. Open positions and ambiguous lifecycles are excluded, so this is not a complete portfolio return.</p></div>
      </section>

      <section className="panel pick-panel">
        <div className="panel-head"><div><span className="kicker">Purchase → disclosed close</span><h2>Closed option cycles</h2></div><span className="asof">Official losses + price model · USD</span></div>
        <div className="pick-scroll">
          <div className="pick-table closed-picks">
            <div className="pick-head"><span>Security</span><span>Lifecycle</span><span>Underlying</span><span>SPY</span><span>Excess</span><span>Option ROI / range</span><span>P&amp;L / range</span><span>Outcome</span></div>
            {closedPickPerformance.map((pick) => (
              <div className="pick-row" key={pick.id} title={pick.note}>
                <div className="pick-security"><span className="ticker-chip">{pick.ticker}</span><p><strong>{pick.instrument}</strong><small><a href={pick.purchaseSourceUrl} target="_blank" rel="noreferrer">{pick.filingIds.split(" → ")[0]} ↗</a> → <a href={pick.closeSourceUrl} target="_blank" rel="noreferrer">{pick.filingIds.split(" → ")[1]} ↗</a></small></p></div>
                <div className="pick-life"><strong>{pick.opened}</strong><span>to {pick.closed}</span><small>{pick.days} days</small></div>
                <strong className={pick.underlyingReturn >= 0 ? "return-positive" : "return-negative"}>{signed(pick.underlyingReturn)}</strong>
                <span>{signed(pick.benchmarkReturn)}</span>
                <strong className={pick.excessReturn >= 0 ? "return-positive" : "return-negative"}>{signed(pick.excessReturn)}</strong>
                <div className="roi-range"><strong className={pick.optionReturnMid >= 0 ? "return-positive" : "return-negative"}>{signed(pick.optionReturnMid)} mid</strong><span>{signed(pick.optionReturnLow)} to {signed(pick.optionReturnHigh)}</span></div>
                <div className="roi-range"><strong>{money(pick.pnlMid)} mid</strong><span>{money(pick.pnlLow)} to {money(pick.pnlHigh)}</span></div>
                <span className={`result-badge ${pick.result === "Definite win" ? "win" : pick.result === "Official loss" ? "loss" : "uncertain"}`}>{pick.result}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="chart-note">Where the filing reports gain or loss, that figure is used directly. Otherwise, exercise value = max(split-adjusted actual close − adjusted strike, 0) × shares received; modeled P&amp;L subtracts the disclosed premium band. Total-return comparisons use dividend-adjusted closes. “Definite win” means even the low estimate is positive.</p>
      </section>

      <section className="panel pick-panel open-performance">
        <div className="panel-head"><div><span className="kicker">Right-censored</span><h2>Open picks through Sep 11, 2026</h2></div><span className="asof">Excluded from closed success rate</span></div>
        <div className="pick-scroll">
          <div className="pick-table open-picks">
            <div className="pick-head"><span>Security</span><span>Opened</span><span>Disclosed quantity</span><span>Underlying proxy</span><span>SPY</span><span>Excess</span><span>Status</span></div>
            {openPickPerformance.map((pick) => (
              <div className="pick-row" key={`${pick.ticker}-${pick.instrument}`} title={pick.note}>
                <div className="pick-security"><span className="ticker-chip">{pick.ticker}</span><p><strong>{pick.instrument}</strong><small>{pick.note}</small></p></div>
                <span>{pick.opened}</span>
                <strong>{pick.quantity}</strong>
                <strong className={pick.returnValue >= 0 ? "return-positive" : "return-negative"}>{signed(pick.returnValue)}</strong>
                <span>{signed(pick.benchmark)}</span>
                <strong className={pick.excess >= 0 ? "return-positive" : "return-negative"}>{signed(pick.excess)}</strong>
                <span className="result-badge open">{pick.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="method-strip">
        <div><span>1</span><p><strong>Official terms</strong><small>Contract count, strike, expiry, transaction date, premium band, and exercise come from Clerk PDFs.</small></p></div>
        <div><span>2</span><p><strong>Separate price proxy</strong><small>Actual closes value exercises; dividend-adjusted closes measure total return for the underlying and SPY. They are not official filing data.</small></p></div>
        <div><span>3</span><p><strong>No invented option marks</strong><small>Actual option return is omitted unless a licensed historical quote source is added.</small></p></div>
      </section>

      <section className="performance-grid secondary-performance">
        <article className="panel income-history">
          <div className="panel-head"><div><span className="kicker">Raw-source proxy</span><h2>Capital-gain-tagged income floor</h2></div><span className="asof">Annual reports · USD millions</span></div>
          <div className="income-bars">
            {reportedIncomeHistory.map((item) => (
              <div className="income-year" key={item.year}>
                <div className="income-value">{item.gainTaggedFloor ? `≥$${item.gainTaggedFloor.toFixed(1)}M` : "$0 reported"}</div>
                <div className="income-bar-wrap"><span className="income-bar" style={{ height: `${item.gainTaggedFloor ? 26 + (item.gainTaggedFloor / maxAnnual) * 108 : 3}px` }} /></div>
                <strong>{item.year}</strong>
                <small>{item.lossTaggedFloor ? `loss-tagged ≥$${item.lossTaggedFloor < .1 ? "15K" : `${item.lossTaggedFloor.toFixed(1)}M`}` : "no loss tag"}</small>
              </div>
            ))}
          </div>
          <p className="chart-note">This chart sums the lower bounds of annual income bands on rows tagged “Capital Gains.” When a row also lists dividends, the filing does not allocate the band between them. Loss-tagged lines are shown separately and are not netted.</p>
        </article>

        <aside className="panel pnl-readiness">
          <div className="panel-head"><div><span className="kicker">Evidence boundaries</span><h2>What the score does not claim</h2></div><span className="readiness-pill">Estimated</span></div>
          <div className="readiness-list">
            <div><i className="ready" /><p><strong>Official trade chronology</strong><small>Purchase and exercise dates are directly disclosed</small></p><b>Fact</b></div>
            <div><i className="ready" /><p><strong>Exact exercise quantities</strong><small>Available for these seven selected cycles</small></p><b>Fact</b></div>
            <div><i className="partial" /><p><strong>Premium paid</strong><small>Only a broad dollar band is disclosed</small></p><b>Range</b></div>
            <div><i className="partial" /><p><strong>Daily price at exercise</strong><small>Close is a proxy, not the intraday execution mark</small></p><b>Proxy</b></div>
            <div><i className="missing" /><p><strong>Actual historical option marks</strong><small>Reliable consolidated history requires licensed market data</small></p><b>Omitted</b></div>
          </div>
          <div className="pnl-formula"><span>Closed-cycle estimate</span><code>exercise intrinsic value − disclosed premium band</code></div>
        </aside>
      </section>

      <div className="inline-note"><strong>Two different measures:</strong> the pick tables estimate security-level outcomes for linkable cycles. The income chart is an annual filing floor. Neither is a complete household time-weighted return, and the two should not be added together.</div>
    </div>
  );
}

function Trades() {
  const [action, setAction] = useState("All activity");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => trades.filter((trade) => {
    const actionMatch = action === "All activity" || (action === "Purchases" ? trade.action === "Purchase" : trade.action !== "Purchase");
    const queryMatch = `${trade.ticker} ${trade.asset} ${trade.detail}`.toLowerCase().includes(query.toLowerCase());
    return actionMatch && queryMatch;
  }), [action, query]);
  return (
    <div className="tab-content">
      <section className="section-intro trades-intro">
        <div><span className="kicker">Official transaction ledger</span><h2>Disclosed trades and transfers</h2><p>Dates reflect when the transaction occurred—not when the public learned about it.</p></div>
        <div className="filters">
          <label><span>Filter securities</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticker or company" /></label>
          <label><span>Activity type</span><select value={action} onChange={(event) => setAction(event.target.value)}><option>All activity</option><option>Purchases</option><option>Sales & transfers</option></select></label>
        </div>
      </section>
      <section className="panel trade-ledger">
        <div className="ledger-head"><span>{filtered.length} disclosure rows</span><span>Latest first · all amounts are reported ranges</span></div>
        {filtered.map((trade) => <TradeRow key={trade.id} trade={trade} />)}
        {!filtered.length && <div className="empty-state">No disclosure rows match those filters.</div>}
      </section>
    </div>
  );
}

const defaultRules = [
  { id: "new-filing", name: "New official filing", detail: "Any new DocID or amended document hash", on: true },
  { id: "one-million", name: "Major transaction", detail: "Lower end of reported band is at least $1 million", on: true },
  { id: "new-position", name: "New or closed security", detail: "First disclosed issuer or a full sale", on: true },
  { id: "options", name: "Options activity", detail: "New call/put purchase, sale, exercise, or expiry", on: true },
  { id: "late", name: "Filing lag", detail: "Transaction appears more than 45 days after trade", on: false },
];

function Alerts({ profile }: { profile: TrackedMember }) {
  const [rules, setRules] = useState(defaultRules);
  const [threshold, setThreshold] = useState("$1 million");
  const summary = houseMembersPerformance.find((row) => row.id === profile.id);
  const toggleRule = async (id: string) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, on: !rule.on } : rule));
    const rule = rules.find((item) => item.id === id);
    try {
      await fetch("/api/alert-rules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: profile.id, ruleType: id, enabled: !rule?.on }) });
    } catch { /* UI remains useful if local persistence is unavailable. */ }
  };
  return (
    <div className="tab-content">
      <section className="alert-grid">
        <article className="panel rule-panel">
          <div className="panel-head"><div><span className="kicker">Monitoring rules</span><h2>What should trigger an alert?</h2></div><span className="freshness"><i /> In-app alerts on</span></div>
          <div className="rule-list">
            {rules.map((rule) => (
              <button className="rule-row" key={rule.id} onClick={() => toggleRule(rule.id)} aria-pressed={rule.on}>
                <span><strong>{rule.name}</strong><small>{rule.detail}</small></span>
                <i className={`toggle ${rule.on ? "on" : ""}`}><b /></i>
              </button>
            ))}
          </div>
          <div className="threshold-control">
            <label htmlFor="threshold">Materiality floor</label>
            <select id="threshold" value={threshold} onChange={(event) => setThreshold(event.target.value)}>
              <option>$250 thousand</option><option>$500 thousand</option><option>$1 million</option><option>$5 million</option>
            </select>
          </div>
        </article>

        <article className="panel alert-feed">
          <div className="panel-head"><div><span className="kicker">Tracked record</span><h2>{profile.id === member.id ? "4 major changes" : `${profile.name} monitoring`}</h2></div><button className="quiet-button">Mark read</button></div>
          {profile.id === member.id ? trades.filter((trade) => trade.severity === "urgent").slice(0, 4).map((trade) => (
            <a className="alert-row" href={trade.sourceUrl} target="_blank" rel="noreferrer" key={trade.id}>
              <span className={`alert-symbol ${trade.action === "Purchase" ? "buy" : "sell"}`}>{trade.action === "Purchase" ? "↑" : "↓"}</span>
              <div><strong>{trade.ticker} · {trade.action}</strong><p>{trade.amount} reported for {trade.transactionDate}</p><small>Disclosed {trade.filedDate} · {trade.owner}</small></div>
              <span>↗</span>
            </a>
          )) : summary?.featuredPicks.map((pick) => (
            <a className="alert-row" href={pick.sourceUrl} target="_blank" rel="noreferrer" key={pick.id}>
              <span className={`alert-symbol ${pick.direction === "Long" ? "buy" : "sell"}`}>{pick.direction === "Long" ? "↑" : "↓"}</span>
              <div><strong>{pick.ticker} · {pick.direction} {pick.instrument}</strong><p>{pick.status} · {pick.periodDays ?? "—"} day episode</p><small>Official PTR opened {pick.transactionDate}</small></div>
              <span>↗</span>
            </a>
          ))}
          {profile.id !== member.id && !summary && <div className="empty-state">Senate eFD monitoring will appear here when that source adapter is connected.</div>}
        </article>
      </section>
      <div className="inline-note"><strong>Alert language matters:</strong> a filing alert is evidence of delayed public disclosure, not evidence of a live trade, wrongdoing, or a recommendation to follow it.</div>
    </div>
  );
}

function Methodology() {
  return (
    <div className="tab-content" id="methodology">
      <section className="method-hero">
        <span className="kicker">Transparent by design</span><h2>From official filing to usable signal</h2>
        <p>The tracker begins with the Clerk’s raw annual index and original PDFs. It does not ingest data from commercial congressional-trading aggregators.</p>
      </section>
      <section className="method-grid">
        {[
          ["01", "Discover", "Poll the Clerk’s offered yearly ZIP index using conditional requests. New DocIDs and changed hashes become immutable filing events."],
          ["02", "Extract", "Download the official PDF, retain its source URL and hash, read embedded text, and use OCR only when necessary."],
          ["03", "Normalize", "Keep the original wording while mapping owner, asset, action, dates, amount range, ticker, options terms, and amendments."],
          ["04", "Reconstruct", "Anchor positions to annual year-end value bands, then apply later PTR flows without turning missing data into zero."],
          ["05", "Estimate", "Model low, midpoint-scenario, and high outcomes only when enough terms exist. Explicit exercises can support an intrinsic-value model; actual option returns require licensed quote history."],
          ["06", "Alert", "Trigger on interval-aware thresholds, new/closed issuers, amendments, options activity, position-band changes, and filing lag."],
        ].map(([number, title, copy]) => <article className="method-card" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
      </section>
      <section className="panel caveat-panel">
        <div><span className="kicker">Reliability limits</span><h2>What the raw record cannot tell us</h2></div>
        <div className="caveat-columns">
          <ul><li>Exact execution value or price</li><li>Complete tax lots and cost basis</li><li>Undisclosed activity below $1,000</li><li>Underlying assets in excepted trusts</li></ul>
          <ul><li>Exact ownership when the owner code is blank</li><li>Option fair value without a separate quote history</li><li>Real-time positions before a filing is public</li><li>Intent, advice, or who directed a spouse’s trade</li></ul>
        </div>
        <div className="source-buttons">
          <a href={officialSources.search} target="_blank" rel="noreferrer">Clerk disclosure database ↗</a>
          <a href={officialSources.annual} target="_blank" rel="noreferrer">Pelosi 2025 annual filing ↗</a>
          <a href={officialSources.guidance} target="_blank" rel="noreferrer">Official instruction guide ↗</a>
          <a href="https://datashop.cboe.com/option-eod-summary" target="_blank" rel="noreferrer">Licensed historical option data ↗</a>
        </div>
      </section>
    </div>
  );
}

export default function TrackerDashboard({ viewer }: { viewer: { displayName: string; email: string } }) {
  const [activeTab, setActiveTab] = useState<Tab>("House Summary");
  const [showAdd, setShowAdd] = useState(false);
  const [tracked, setTracked] = useState(initialTrackedMembers);
  const [selectedMemberId, setSelectedMemberId] = useState(member.id);
  const [globalQuery, setGlobalQuery] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const selectedMember = tracked.find((item) => item.id === selectedMemberId) ?? tracked[0];
  const isPelosi = selectedMember.id === member.id;
  const selectedSummary = houseMembersPerformance.find((row) => row.id === selectedMember.id);
  const viewerInitials = viewer.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ME";

  const addMember = async (candidate: (typeof suggestedMembers)[number]) => {
    const slug = `${candidate.firstName}-${candidate.lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!tracked.some((item) => item.id === slug)) {
      setTracked((current) => [...current, { id: slug, firstName: candidate.firstName, lastName: candidate.lastName, initials: `${candidate.firstName[0]}${candidate.lastName[0]}`, name: candidate.displayName, district: `${candidate.district} · House history`, chamber: "U.S. House", party: candidate.party, sourceStatus: "House data ready" }]);
      try {
        await fetch("/api/watchlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...candidate, id: slug }) });
      } catch { /* The member remains visible for this session. */ }
    }
    setShowAdd(false);
  };

  const runSync = async () => {
    if (selectedMember.chamber === "U.S. Senate") {
      setSyncState("error");
      return;
    }
    setSyncState("syncing");
    try {
      const response = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: selectedMember.firstName, lastName: selectedMember.lastName, memberId: selectedMember.id, years: [2025, 2026] }) });
      if (!response.ok) throw new Error("Sync failed");
      setSyncState("done");
    } catch { setSyncState("error"); }
  };

  const jumpFromSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (globalQuery.trim()) setActiveTab("Trades");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Capitol Ledger home"><span className="brand-mark">✦</span><span><strong>CAPITOL</strong><b>LEDGER</b></span></a>
        <form className="global-search" onSubmit={jumpFromSearch}><span>⌕</span><input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Search a member, ticker, or filing…" aria-label="Search tracker" /><kbd>↵</kbd></form>
        <div className="top-actions"><span className="raw-badge"><i /> RAW SOURCE</span><button className="refresh-button" onClick={runSync} disabled={syncState === "syncing" || selectedMember.chamber === "U.S. Senate"}><span className={syncState === "syncing" ? "spin" : ""}>↻</span>{selectedMember.chamber === "U.S. Senate" ? "Senate source pending" : syncState === "syncing" ? "Checking…" : syncState === "done" ? "Up to date" : syncState === "error" ? "Try again" : "Check filings"}</button><a className="avatar" href="/signout-with-chatgpt?return_to=%2F" aria-label={`Signed in as ${viewer.email}. Sign out.`} title={`Signed in as ${viewer.displayName} · Sign out`}>{viewerInitials}</a></div>
      </header>

      <div className="workspace" id="top">
        <aside className="sidebar">
          <button className={`house-leaderboard-link ${activeTab === "House Summary" ? "active" : ""}`} onClick={() => setActiveTab("House Summary")}><span>⌂</span><p><strong>House leaderboard</strong><small>All indexed PTR filers</small></p><b>›</b></button>
          <div className="sidebar-label"><span>Tracked members</span><small>{tracked.length}</small></div>
          <div className="member-list">
            {tracked.map((item) => <button className={`member-button ${item.id === selectedMember.id ? "active" : ""}`} key={item.id} onClick={() => { setSelectedMemberId(item.id); setActiveTab("Overview"); setSyncState("idle"); }}><span>{item.initials}</span><p><strong>{item.name}</strong><small>{item.sourceStatus}</small></p>{item.id === selectedMember.id && <i />}</button>)}
          </div>
          <button className="add-member" onClick={() => setShowAdd(true)}><span>＋</span> Add House member</button>
          <div className="sidebar-source"><span className="seal">H</span><p><strong>House Clerk</strong><small>Primary source</small></p><b>Connected</b></div>
          <p className="sidebar-note">Tracked profiles use the House Clerk’s raw filing index and original PTR documents.</p>
        </aside>

        <section className="main-content">
          {activeTab !== "House Summary" && <header className="member-hero">
            <div className="member-identity"><span className="large-initials">{selectedMember.initials}</span><div><div className="member-tag"><span>{selectedMember.chamber}</span><i />{selectedMember.party}</div><h1>{selectedMember.name}</h1><p>{selectedMember.district} · {selectedMember.sourceStatus}</p></div></div>
            <div className="member-asof"><span>{isPelosi ? "Latest annual anchor" : "Historical performance"}</span><strong>{isPelosi ? member.annualAsOf : selectedSummary ? `${selectedSummary.scoredCount} scored episodes` : "Awaiting Senate adapter"}</strong><small>{isPelosi ? `Filed ${member.annualFiled}` : selectedSummary ? `${selectedSummary.filingCount} official PTRs` : "Raw source kept separate"}</small></div>
          </header>}

          {activeTab !== "House Summary" && <nav className="tabs" aria-label={`${selectedMember.name} tracker sections`}>
            {memberTabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}{tab === "Alerts" && isPelosi && <span>4</span>}</button>)}
          </nav>}

          {activeTab === "House Summary" && <HouseSummary />}
          {activeTab === "Overview" && (isPelosi ? <Overview /> : <TrackedMemberDetail profile={selectedMember} section="Overview" />)}
          {activeTab === "Positions" && (isPelosi ? <Positions /> : <TrackedMemberDetail profile={selectedMember} section="Positions" />)}
          {activeTab === "Performance" && (isPelosi ? <Performance /> : <TrackedMemberDetail profile={selectedMember} section="Performance" />)}
          {activeTab === "Trades" && (isPelosi ? <Trades /> : <TrackedMemberDetail profile={selectedMember} section="Trades" />)}
          {activeTab === "Alerts" && <Alerts key={selectedMember.id} profile={selectedMember} />}
          {activeTab === "Methodology" && <Methodology />}
        </section>
      </div>

      {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowAdd(false)}><section className="member-modal" role="dialog" aria-modal="true" aria-labelledby="add-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowAdd(false)} aria-label="Close">×</button><span className="kicker">Extend the tracker</span><h2 id="add-title">Add a House member</h2><p>The tracker will look for exact-name matches in the Clerk’s official yearly index. Identity is confirmed with district history before analytics are created.</p><div className="candidate-list">{suggestedMembers.map((candidate) => <button onClick={() => addMember(candidate)} key={candidate.displayName}><span>{candidate.firstName[0]}{candidate.lastName[0]}</span><p><strong>{candidate.displayName}</strong><small>{candidate.district}</small></p><b>＋</b></button>)}</div><div className="modal-note">Senators require a separate Senate eFD source and are not included in this House-first version.</div></section></div>}
    </main>
  );
}
