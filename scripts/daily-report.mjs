import assert from 'node:assert/strict';
const ordered = rows => [...rows].sort((a,b) => a.id.localeCompare(b.id));
export function compareSnapshots(before, after, source = { added: [], changed: [] }, audit = []) {
  assert.deepEqual(ordered(after.status.trackedMembers), ordered(before.status.trackedMembers), 'Watchlist changed during refresh');
  assert.deepEqual(ordered(after.status.alertRules), ordered(before.status.alertRules), 'Alert preferences changed during refresh');
  const ranks = data => new Map(data.dashboard.members.filter(m => m.scoredCount >= 12)
    .sort((a,b) => (b.averageExcess ?? -Infinity) - (a.averageExcess ?? -Infinity)).map((m,i) => [m.id,i+1]));
  const previousRank = ranks(before), currentRank = ranks(after);
  const key = e => JSON.stringify([e.memberId,e.ticker,e.instrument,e.direction,e.owner,e.expirationDate,e.strike,e.transactionDate,e.filingId]);
  const tracked = after.dashboard.tracked.map(member => {
    const a = before.dashboard.members.find(m => m.id === member.id), b = after.dashboard.members.find(m => m.id === member.id);
    assert(a && b, `Tracked member lacks a source match: ${member.id}`);
    const old = new Map(before.details[member.id].episodes.map(e => [key(e),e]));
    const next = new Map(after.details[member.id].episodes.map(e => [key(e),e]));
    const opened = [...next].filter(([k,e]) => !old.has(k) && e.status.includes('latest mark')).map(([,e]) => e);
    // Losing a price match is a coverage gap, not a disclosed sale or closure.
    const closed = [...old].filter(([k,e]) => e.status.includes('latest mark') && ['Closed','Expiry inferred'].includes(next.get(k)?.status)).map(([k]) => next.get(k));
    return { id:member.id,name:member.name,excessBefore:a.averageExcess,excessAfter:b.averageExcess,
      excessChange:a.averageExcess === null || b.averageExcess === null ? null : Math.round((b.averageExcess-a.averageExcess)*10)/10,
      rankBefore:previousRank.get(member.id) ?? null,rankAfter:currentRank.get(member.id) ?? null,
      scoredBefore:a.scoredCount,scoredAfter:b.scoredCount,openBefore:a.openCount,openAfter:b.openCount,opened,closed };
  });
  const largeRankMoves = after.dashboard.members.filter(m => previousRank.has(m.id) && currentRank.has(m.id) && Math.abs(previousRank.get(m.id)-currentRank.get(m.id))>=10)
    .map(m => ({id:m.id,name:m.name,before:previousRank.get(m.id),after:currentRank.get(m.id),scored:m.scoredCount}));
  const trackedIds = new Set(tracked.map(m => m.id));
  const disclosures = [...source.added,...source.changed,...audit.filter(r=>r.pdfHashChanged||r.pelosiHashChanged||r.cachedTextChanged)];
  const trackedDisclosures = [...new Map(disclosures.filter(r=>trackedIds.has(r.memberId)).map(r=>[r.sourceUrl,r])).values()];
  const previousExclusions = before.dashboard.meta.priceUnavailableSymbols ?? [], exclusions = after.dashboard.meta.priceUnavailableSymbols ?? [];
  return {from:before.dashboard.meta,to:after.dashboard.meta,tracked,largeRankMoves,trackedDisclosures,newDisclosures:source.added,
    coverageChanges:{added:exclusions.filter(t=>!previousExclusions.includes(t)),removed:previousExclusions.filter(t=>!exclusions.includes(t))},
    methodologyChanged:before.dashboard.meta.methodology!==after.dashboard.meta.methodology,
    emailRequired:trackedDisclosures.length>0 || largeRankMoves.length>0 || tracked.some(m=>m.opened.length||m.closed.length||Math.abs(m.excessChange??0)>=2),
    preferencesUnchanged:true};
}
