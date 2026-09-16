"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { DashboardData, MemberDetails, TrackedMember } from "../../lib/analytics-types";
const DataContext = createContext<DashboardData | null>(null);
function useData() { const data = useContext(DataContext); if (!data) throw new Error("Missing dashboard data"); return data; }
const officialSources = { search: "https://disclosures-clerk.house.gov/FinancialDisclosure/ViewSearch" };

type Tab = "House Summary" | "Overview" | "Positions" | "Performance" | "Trades" | "Alerts" | "Methodology";
type MemberTab = Exclude<Tab, "House Summary">;

const memberTabs: MemberTab[] = ["Overview", "Positions", "Performance", "Trades", "Alerts", "Methodology"];

function MetricCard({ eyebrow, value, note, tone = "default" }: { eyebrow: string; value: string; note: string; tone?: "default" | "green" | "amber" }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-top"><span>{eyebrow}</span><span className="metric-dot" /></div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function TrackedMemberDetail({ profile, section, query = "" }: { profile: TrackedMember; section: Exclude<MemberTab, "Alerts" | "Methodology">; query?: string }) {
  const { members: houseMembersPerformance } = useData();
  const summary = houseMembersPerformance.find((row) => row.id === profile.id);
  const [loadedDetails, setLoadedDetails] = useState<{ memberId: string; data: MemberDetails } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const details = loadedDetails?.memberId === profile.id ? loadedDetails.data : null;
  const signed = (value: number | null) => value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/members/${profile.id}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Member data is unavailable. Please retry.");
        const payload = await response.json() as MemberDetails;
        if (current) { setLoadedDetails({ memberId: profile.id, data: payload }); setLoadError(null); }
      } catch (error) { if (current) setLoadError(error instanceof Error ? error.message : "Load failed"); }
    };
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 60_000);
    return () => { current = false; clearInterval(timer); };
  }, [profile.id]);

  if (loadError) return <div role="alert" className="inline-note">{loadError}</div>;

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

  if (!details) return <div className="tab-content"><section className="panel member-detail-loading"><span className="kicker">Loading raw-source detail</span><h2>Preparing {profile.name}’s record…</h2><p>Transactions, reconstructed positions, and holding episodes are loading from the database.</p></section></div>;

  const episodes = details.episodes;
  const transactions = details.transactions.filter((row) => `${row.ticker} ${row.assetName} ${row.filingId}`.toLowerCase().includes(query.toLowerCase()));
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
  const { members: houseMembersPerformance, meta: housePerformanceMeta } = useData();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"ranked" | "all">("ranked");
  const [sort, setSort] = useState<"excess" | "return" | "hit" | "holding" | "picks">("excess");
  const eligibleCount = houseMembersPerformance.filter((row) => row.scoredCount >= 12).length;
  const shortCount = houseMembersPerformance.reduce((sum, row) => sum + row.shortCount, 0);
  const readableShare = housePerformanceMeta.ptrCount ? housePerformanceMeta.textReadablePtrCount / housePerformanceMeta.ptrCount * 100 : 0;
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
  }, [query, scope, sort, houseMembersPerformance]);
  const signed = (value: number | null) => value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <div className="tab-content house-summary">
      <section className="house-summary-hero">
        <div>
          <span className="kicker">All House Clerk PTR filers · {housePerformanceMeta.sourceStartYear}–{housePerformanceMeta.sourceEndYear}</span>
          <h2>Who selected stocks well over the holding period?</h2>
          <p>Each episode runs from the first disclosed purchase to a reported close. Partial-sale residuals and positions without a reliable close use the latest available price and are labeled approximate. Stock and call purchases are long; purchased puts are short. Options use the underlying stock return as a directional proxy.</p>
        </div>
        <div className="house-summary-actions">
          <a href={officialSources.search} target="_blank" rel="noreferrer">Raw Clerk database ↗</a>
          <a href="/api/export?format=json" download>Download JSON</a>
          <a href="/api/export?format=csv" download>Download CSV</a>
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

      <div className="inline-note"><strong>Saved dataset:</strong> the JSON and CSV exports query the same database calculations as this page. Each episode includes the price inputs used to calculate its return. <strong>Approximation:</strong> this is not exact portfolio performance. Missing quantities and lot matching mean each reconstructed episode is equal-weighted.</div>
    </div>
  );
}

const defaultRules = [
  { id: "new-filing", name: "New official filing" },
  { id: "one-million", name: "Major transaction" },
  { id: "new-position", name: "New or closed security" },
  { id: "options", name: "Options activity" },
  { id: "late", name: "Filing lag" },
];
function Alerts({ profile }: { profile: TrackedMember }) {
  const [rules,setRules] = useState<Record<string,{enabled:boolean;thresholdCents:number|null}>>({});
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  useEffect(() => {
    let current = true;
    fetch(`/api/alert-rules?memberId=${profile.id}`,{cache:"no-store"}).then(async (response) => {
      if (!response.ok) throw new Error("Saved rules could not be loaded.");
      const payload = await response.json() as {rules:{ruleType:string;enabled:boolean;thresholdCents:number|null}[]};
      if (current) { setRules(Object.fromEntries(payload.rules.map((rule: {ruleType:string;enabled:boolean;thresholdCents:number|null}) => [rule.ruleType,rule]))); setReady(true); }
    }).catch((error) => { if (current) setError(error.message); });
    return () => { current = false; };
  },[profile.id]);
  async function save(id: string, enabled: boolean, thresholdCents: number | null = rules[id]?.thresholdCents ?? null) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/alert-rules",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({memberId:profile.id,ruleType:id,enabled,thresholdCents})});
      if (!response.ok) throw new Error("Rule was not saved. Please retry.");
      setRules((current) => ({...current,[id]:{enabled,thresholdCents}}));
    } catch (error) { setError(error instanceof Error ? error.message : "Save failed"); }
    finally { setBusy(false); }
  }
  return <div className="tab-content"><section className="panel rule-panel">
    <div className="panel-head"><div><span className="kicker">Saved monitoring preferences</span><h2>{profile.name} alert rules</h2></div></div>
    {error && <p role="alert">{error}</p>}
    {!ready && !error && <p>Loading saved rules…</p>}
    <div className="rule-list">{defaultRules.map((rule) => <button className="rule-row" disabled={!ready || busy} key={rule.id} onClick={() => save(rule.id,!rules[rule.id]?.enabled)} aria-pressed={rules[rule.id]?.enabled ?? false}><span><strong>{rule.name}</strong></span><i className={`toggle ${rules[rule.id]?.enabled ? "on" : ""}`}><b /></i></button>)}</div>
    <label className="threshold-control">Materiality floor <select disabled={!ready || busy} value={rules["one-million"]?.thresholdCents ?? 100000000} onChange={(event) => save("one-million",rules["one-million"]?.enabled ?? false,Number(event.target.value))}><option value={25000000}>$250 thousand</option><option value={50000000}>$500 thousand</option><option value={100000000}>$1 million</option><option value={500000000}>$5 million</option></select></label>
    <p className="chart-note">Preferences are stored in the database. Automated alert delivery is not configured.</p>
  </section></div>;
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
          ["01", "Discover", "Check the Clerk’s yearly ZIP index and store filing IDs and source URLs. The full refresh command imports parsed transactions."],
          ["02", "Extract", "Read embedded text from official PDFs. Image-only filings remain unparsed; OCR is not yet connected."],
          ["03", "Normalize", "Keep the original wording while mapping owner, asset, action, dates, amount range, ticker, options terms, and amendments."],
          ["04", "Reconstruct", "Group purchases by member, owner, security, and option terms. Full sales close episodes; partial sales retain residuals."],
          ["05", "Estimate", "Calculate directional returns from stored adjusted daily closes and compare with SPY over the same price dates. Options use the underlying security as a proxy."],
          ["06", "Alert", "Save per-member monitoring preferences. Automated alert evaluation and delivery are not yet configured."],
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


          <a href="https://datashop.cboe.com/option-eod-summary" target="_blank" rel="noreferrer">Licensed historical option data ↗</a>
        </div>
      </section>
    </div>
  );
}

function Dashboard({ viewer, refresh }: { viewer: { displayName: string; email: string }; refresh: () => Promise<void> }) {
  const { members: houseMembersPerformance, meta, tracked } = useData();
  const [saveError, setSaveError] = useState("");
  const [savingMember,setSavingMember] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("House Summary");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(tracked[0]?.id ?? "");
  const [globalQuery, setGlobalQuery] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const selectedMember = tracked.find((item) => item.id === selectedMemberId) ?? tracked[0];
  const suggestedMembers = houseMembersPerformance.filter((row) => !tracked.some((item) => item.id === row.id) && `${row.name} ${row.stateDistrict}`.toLowerCase().includes(globalQuery.toLowerCase()));
  const selectedSummary = houseMembersPerformance.find((row) => row.id === selectedMember.id);
  const viewerInitials = viewer.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ME";

  const addMember = async (candidate: (typeof suggestedMembers)[number]) => {
    setSaveError(""); setSavingMember(true);
    try {
      const response = await fetch("/api/watchlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({id:candidate.id}) });
      if (!response.ok) throw new Error("Member was not saved. Please retry.");
      await refresh(); setShowAdd(false);
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Save failed"); }
    finally { setSavingMember(false); }
  };

  const runSync = async () => {
    if (selectedMember.chamber === "U.S. Senate") {
      setSyncState("error");
      return;
    }
    setSyncState("syncing");
    try {
      const response = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: selectedMember.firstName, lastName: selectedMember.lastName, memberId: selectedMember.id, years: [new Date().getUTCFullYear() - 1, new Date().getUTCFullYear()] }) });
      if (!response.ok) throw new Error("Sync failed");
      await refresh();
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
        <div className="top-actions"><span className="raw-badge"><i /> RAW SOURCE</span><button className="refresh-button" onClick={runSync} disabled={syncState === "syncing" || selectedMember.chamber === "U.S. Senate"}><span className={syncState === "syncing" ? "spin" : ""}>↻</span>{selectedMember.chamber === "U.S. Senate" ? "Senate source pending" : syncState === "syncing" ? "Checking…" : syncState === "done" ? "Index checked" : syncState === "error" ? "Try again" : "Check filings"}</button><a className="avatar" href="/signout-with-chatgpt?return_to=%2F" aria-label={`Signed in as ${viewer.email}. Sign out.`} title={`Signed in as ${viewer.displayName} · Sign out`}>{viewerInitials}</a></div>
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
          <div className="inline-note"><strong>Database connected</strong> · Prices through {meta.benchmarkPriceAsOf ?? "unavailable"} · Data imported {`${meta.importedAt.slice(0, 16).replace("T", " ")} UTC`} · Calculations refresh every minute.
          {!!meta.priceUnavailableSymbols.length && <p role="status" title={meta.priceUnavailableSymbols.join(", ")}>{meta.priceUnavailableSymbols.length} securities have unavailable price histories and are excluded from performance rankings. Their disclosures remain available.</p>}
          {syncState === "done" && <p>Official filing index saved. Newly discovered documents require a full data refresh before their transactions are included.</p>}
          {syncState === "error" && <p role="alert">The filing check failed. Please retry.</p>}
          {saveError && <p role="alert">{saveError}</p>}</div>
          {activeTab !== "House Summary" && <header className="member-hero">
            <div className="member-identity"><span className="large-initials">{selectedMember.initials}</span><div><div className="member-tag"><span>{selectedMember.chamber}</span><i />{selectedMember.party}</div><h1>{selectedMember.name}</h1><p>{selectedMember.district} · {selectedMember.sourceStatus}</p></div></div>
            <div className="member-asof"><span>Calculated holding performance</span><strong>{selectedSummary ? `${selectedSummary.scoredCount} scored episodes` : "Source match pending"}</strong><small>{selectedSummary ? `${selectedSummary.filingCount} official PTRs` : "No matched House record"}</small></div>
          </header>}

          {activeTab !== "House Summary" && <nav className="tabs" aria-label={`${selectedMember.name} tracker sections`}>
            {memberTabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}
          </nav>}

          {activeTab === "House Summary" && <HouseSummary />}
          {activeTab === "Overview" && <TrackedMemberDetail key={selectedMember.id} profile={selectedMember} section="Overview" query={globalQuery} />}
          {activeTab === "Positions" && <TrackedMemberDetail key={selectedMember.id} profile={selectedMember} section="Positions" query={globalQuery} />}
          {activeTab === "Performance" && <TrackedMemberDetail key={selectedMember.id} profile={selectedMember} section="Performance" query={globalQuery} />}
          {activeTab === "Trades" && <TrackedMemberDetail key={selectedMember.id} profile={selectedMember} section="Trades" query={globalQuery} />}
          {activeTab === "Alerts" && <Alerts key={selectedMember.id} profile={selectedMember} />}
          {activeTab === "Methodology" && <Methodology />}

          <footer className="site-disclaimer" aria-label="Research disclaimer">
            <strong>Informational research only — not investment advice.</strong>
            <span>Disclosure amounts and dates may be reported as ranges, and modeled returns are estimates rather than verified portfolio results. Check the original filings before relying on any result.</span>
          </footer>
        </section>
      </div>

      {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowAdd(false)}><section className="member-modal" role="dialog" aria-modal="true" aria-labelledby="add-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowAdd(false)} aria-label="Close">×</button><span className="kicker">Extend the tracker</span><h2 id="add-title">Add a House member</h2><p>The tracker will look for exact-name matches in the Clerk’s official yearly index. Identity is confirmed with district history before analytics are created.</p><label>Find a member <input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Name or district" /></label>{saveError && <p role="alert">{saveError}</p>}<div className="candidate-list">{suggestedMembers.map((candidate) => <button disabled={savingMember} onClick={() => addMember(candidate)} key={candidate.id}><span>{candidate.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><p><strong>{candidate.name}</strong><small>{candidate.stateDistrict}</small></p><b>＋</b></button>)}</div><div className="modal-note">Senators require a separate Senate eFD source and are not included in this House-first version.</div></section></div>}
    </main>
  );
}

export default function TrackerDashboard({ viewer, initialData }: { viewer: { displayName: string; email: string }; initialData: DashboardData }) {
  const [data,setData] = useState(initialData);
  const [error,setError] = useState("");
  async function refresh() {
    const response = await fetch("/api/dashboard",{cache:"no-store"});
    if (!response.ok) throw new Error("Database refresh failed. Displaying the last successful result.");
    setData(await response.json() as DashboardData); setError("");
  }
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) void refresh().catch((error) => setError(error.message)); },60_000);
    return () => clearInterval(timer);
  },[]);
  return <DataContext.Provider value={data}>{error && <div className="inline-note" role="alert">{error}</div>}<Dashboard viewer={viewer} refresh={refresh} /></DataContext.Provider>;
}
