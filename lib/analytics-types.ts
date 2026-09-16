export type TrackedMember = {
  id: string; firstName: string; lastName: string; initials: string; name: string;
  district: string; chamber: 'U.S. House' | 'U.S. Senate'; party: string; sourceStatus: string;
};
export type MemberTransaction = {
  id: string; memberId: string; ticker: string; assetName: string; instrument: string; direction: string;
  owner: string; action: string; closeKind: string | null; expirationDate: string | null; strike: string | null;
  amount: string; transactionDate: string; filingDate: string; filingId: string; sourceUrl: string;
};
export type MemberEpisode = MemberTransaction & {
  closeDate: string; status: string; periodDays: number | null; returnValue: number | null;
  benchmarkReturn: number | null; excessReturn: number | null;
};
export type MemberDetails = { transactions: MemberTransaction[]; episodes: MemberEpisode[] };
export type MemberSummary = {
  id: string; name: string; stateDistrict: string; filingCount: number; selectionCount: number;
  scoredCount: number; closedCount: number; openCount: number; longCount: number; shortCount: number;
  averageReturn: number | null; averageExcess: number | null; averageHoldingDays: number | null; hitRate: number | null;
  featuredPicks: MemberEpisode[];
};
export type DashboardData = {
  members: MemberSummary[]; tracked: TrackedMember[];
  meta: { generatedAt: string; importedAt: string; benchmarkPriceAsOf: string | null; sourceStartYear: number;
    sourceEndYear: number; filerCount: number; ptrCount: number; textReadablePtrCount: number;
    transactionCount: number; episodeCount: number; scoredEpisodeCount: number; methodology: string; priceUnavailableSymbols:string[] };
};
