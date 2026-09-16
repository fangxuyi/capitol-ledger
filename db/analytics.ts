import { env } from 'cloudflare:workers';
import type { DashboardData, MemberDetails, MemberEpisode, MemberSummary, TrackedMember } from '../lib/analytics-types';

export function database() {
  if (!env.DB) throw new Error('D1 binding DB is missing.');
  return env.DB;
}

type EpisodeRow = {
  payload: string; close_date: string; status: string; period_days: number | null;
  return_value: number | null; benchmark_return: number | null; excess_return: number | null;
};
function episode(row: EpisodeRow): MemberEpisode {
  return { ...JSON.parse(row.payload), closeDate: row.close_date, status: row.status,
    periodDays: row.period_days, returnValue: row.return_value, benchmarkReturn: row.benchmark_return, excessReturn: row.excess_return };
}
type ImportRow = { source_generated_at:string; imported_at:string; source_start_year:number; source_end_year:number; readable_ptr_count:number; methodology:string };
type MemberRow = {id:string;name:string;stateDistrict:string;filingCount:number};
type TrackedRow = {id:string;first_name:string;last_name:string;display_name:string;state_district:string;chamber:string};
const episodeColumns = 'payload,close_date,status,period_days,return_value,benchmark_return,excess_return';
export async function getMemberDetails(memberId: string): Promise<MemberDetails> {
  const [transactions, episodes] = await database().batch([
    database().prepare('SELECT payload FROM transactions WHERE member_id=? ORDER BY transaction_date DESC,id').bind(memberId),
    database().prepare(`SELECT ${episodeColumns} FROM performance_episodes WHERE member_id=? ORDER BY transaction_date DESC,id`).bind(memberId),
  ]) as [D1Result<{payload:string}>,D1Result<EpisodeRow>];
  return { transactions: transactions.results.map((row: { payload: string }) => JSON.parse(row.payload)), episodes: episodes.results.map(episode) };
}

export async function getDashboardData(): Promise<DashboardData> {
  const db = database();
  // One batch gives all parts of the dashboard the same database snapshot.
  const [imports, membersResult, episodesResult, trackedResult, counts] = await db.batch([
    db.prepare('SELECT * FROM dataset_imports WHERE id=1'),
    db.prepare(`SELECT m.id,m.name,m.state_district AS stateDistrict,MAX(m.indexed_filing_count,
      (SELECT COUNT(*) FROM filings f WHERE f.member_id=m.id AND f.filing_type='P')) AS filingCount FROM research_members m`),
    db.prepare(`SELECT ${episodeColumns} FROM performance_episodes`),
    db.prepare('SELECT * FROM tracked_members WHERE active=1 ORDER BY created_at,id'),
    db.prepare("SELECT COUNT(*) AS transactions,(SELECT MAX(date) FROM price_history WHERE ticker='SPY') AS price_date,(SELECT json_group_array(ticker) FROM price_exclusions) AS exclusions FROM transactions"),
  ]) as [D1Result<ImportRow>,D1Result<MemberRow>,D1Result<EpisodeRow>,D1Result<TrackedRow>,D1Result<{price_date:string|null;transactions:number;exclusions:string}>];
  const source = imports.results[0];
  if (!source) throw new Error('Database is empty. Run npm run db:setup.');
  const episodes: MemberEpisode[] = episodesResult.results.map(episode);
  const byMember = new Map<string, MemberEpisode[]>();
  for (const row of episodes) {
    if (!byMember.has(row.memberId)) byMember.set(row.memberId, []);
    byMember.get(row.memberId)!.push(row);
  }
  const round = (value: number) => Math.round(value * 10) / 10;
  const members: MemberSummary[] = membersResult.results.map((member: { id: string; name: string; stateDistrict: string; filingCount: number }) => {
    const picks = byMember.get(member.id) ?? [];
    const scored = picks.filter((pick) => pick.returnValue !== null);
    const avg = (field: 'returnValue' | 'excessReturn' | 'periodDays') => scored.length ? round(scored.reduce((sum,pick) => sum + (pick[field] ?? 0),0) / scored.length) : null;
    const best = [...scored].sort((a,b) => (b.excessReturn ?? 0) - (a.excessReturn ?? 0));
    const featured = [...new Map([...best.slice(0,2),...best.slice(-1),...[...picks].sort((a,b) => b.transactionDate.localeCompare(a.transactionDate)).slice(0,1)].map((pick) => [pick.id,pick])).values()];
    return { ...member, selectionCount:picks.length,scoredCount:scored.length,
      closedCount:picks.filter((pick) => ['Closed','Expiry inferred'].includes(pick.status)).length,
      openCount:picks.filter((pick) => pick.status.includes('latest mark')).length,
      longCount:picks.filter((pick) => pick.direction==='Long').length,shortCount:picks.filter((pick) => pick.direction==='Short').length,
      averageReturn:avg('returnValue'),averageExcess:avg('excessReturn'),averageHoldingDays:avg('periodDays')===null ? null : Math.round(avg('periodDays')!),
      hitRate:scored.length ? round(scored.filter((pick) => pick.returnValue!>0).length/scored.length*100) : null,featuredPicks:featured };
  }).sort((a: MemberSummary,b: MemberSummary) => (b.averageExcess ?? -Infinity)-(a.averageExcess ?? -Infinity));
  const tracked: TrackedMember[] = trackedResult.results.map((row: { id: string; first_name: string; last_name: string; display_name: string; state_district: string; chamber: string }) => ({
    id:row.id,firstName:row.first_name,lastName:row.last_name,name:row.display_name,
    initials:`${row.first_name[0]}${row.last_name[0]}`,district:row.state_district ?? '',
    chamber:row.chamber==='senate' ? 'U.S. Senate' : 'U.S. House',party:'',
    sourceStatus:members.some((member) => member.id===row.id) ? 'House data ready' : 'Source match pending',
  }));
  return { members,tracked,meta:{generatedAt:source.source_generated_at,importedAt:source.imported_at,
    benchmarkPriceAsOf:counts.results[0].price_date,sourceStartYear:source.source_start_year,sourceEndYear:source.source_end_year,
    filerCount:members.length,ptrCount:members.reduce((sum,row) => sum+row.filingCount,0),textReadablePtrCount:source.readable_ptr_count,
    transactionCount:counts.results[0].transactions,episodeCount:episodes.length,scoredEpisodeCount:episodes.filter((pick) => pick.returnValue!==null).length,
    methodology:source.methodology,priceUnavailableSymbols:JSON.parse(counts.results[0].exclusions)} };
}
