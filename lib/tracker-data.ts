export type Trade = {
  id: string;
  ticker: string;
  asset: string;
  instrument: "Stock" | "Call option" | "Private asset";
  action: "Purchase" | "Sale" | "Partial sale" | "Exchange";
  owner: string;
  transactionDate: string;
  filedDate: string;
  amount: string;
  low: number;
  high: number;
  detail: string;
  filingId: string;
  sourceUrl: string;
  severity: "urgent" | "high" | "medium" | "info";
};

export type Position = {
  ticker: string;
  name: string;
  type: string;
  owner: string;
  annualBand: string;
  low: number;
  high: number;
  lastChange: string;
  direction: "up" | "down" | "flat";
  confidence: "High" | "Medium" | "Low";
  note: string;
};

export const member = {
  id: "nancy-pelosi",
  name: "Nancy Pelosi",
  initials: "NP",
  party: "Democrat",
  district: "California · 11th District",
  chamber: "U.S. House",
  bioguideId: "P000197",
  descriptor: "Household disclosure",
  annualAsOf: "Dec 31, 2025",
  annualFiled: "May 15, 2026",
};

export const trades: Trade[] = [
  {
    id: "20035143-1", ticker: "BE", asset: "Bloom Energy Corp. Class A", instrument: "Stock", action: "Purchase", owner: "Spouse", transactionDate: "Jul 24, 2026", filedDate: "Aug 21, 2026", amount: "$1.0M–$5.0M", low: 1_000_001, high: 5_000_000, detail: "Purchased 10,000 shares.", filingId: "20035143", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035143.pdf", severity: "urgent",
  },
  {
    id: "20035143-2", ticker: "BE", asset: "Bloom Energy Corp. Class A", instrument: "Call option", action: "Purchase", owner: "Spouse", transactionDate: "Jul 24, 2026", filedDate: "Aug 21, 2026", amount: "$1.0M–$5.0M", low: 1_000_001, high: 5_000_000, detail: "100 calls · $100 strike · expires Jun 17, 2027.", filingId: "20035143", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035143.pdf", severity: "urgent",
  },
  {
    id: "20035143-3", ticker: "BE", asset: "Bloom Energy Corp. Class A", instrument: "Stock", action: "Purchase", owner: "Spouse", transactionDate: "Jul 28, 2026", filedDate: "Aug 21, 2026", amount: "$500K–$1.0M", low: 500_001, high: 1_000_000, detail: "Purchased 5,000 shares.", filingId: "20035143", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035143.pdf", severity: "high",
  },
  {
    id: "20035143-4", ticker: "BE", asset: "Bloom Energy Corp. Class A", instrument: "Call option", action: "Purchase", owner: "Spouse", transactionDate: "Jul 28, 2026", filedDate: "Aug 21, 2026", amount: "$500K–$1.0M", low: 500_001, high: 1_000_000, detail: "100 calls · $100 strike · expires Jun 17, 2027.", filingId: "20035143", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035143.pdf", severity: "high",
  },
  {
    id: "20035143-5", ticker: "INTC", asset: "Intel Corp.", instrument: "Stock", action: "Purchase", owner: "Spouse", transactionDate: "Jul 24, 2026", filedDate: "Aug 21, 2026", amount: "$500K–$1.0M", low: 500_001, high: 1_000_000, detail: "Purchased 10,000 shares.", filingId: "20035143", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035143.pdf", severity: "high",
  },
  {
    id: "20035143-6", ticker: "INTC", asset: "Intel Corp.", instrument: "Call option", action: "Purchase", owner: "Spouse", transactionDate: "Jul 24, 2026", filedDate: "Aug 21, 2026", amount: "$250K–$500K", low: 250_001, high: 500_000, detail: "50 calls · $50 strike · expires Jun 17, 2027.", filingId: "20035143", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035143.pdf", severity: "high",
  },
  {
    id: "20035143-7", ticker: "PRIVATE", asset: "REOF XXV, LLC", instrument: "Private asset", action: "Purchase", owner: "Spouse", transactionDate: "Jul 27, 2026", filedDate: "Aug 21, 2026", amount: "$500K–$1.0M", low: 500_001, high: 1_000_000, detail: "Additional investment in a San Francisco hotel property LLC.", filingId: "20035143", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035143.pdf", severity: "high",
  },
  {
    id: "20034836-1", ticker: "INTC", asset: "Intel Corp.", instrument: "Call option", action: "Purchase", owner: "Spouse", transactionDate: "May 29, 2026", filedDate: "Jun 23, 2026", amount: "$1.0M–$5.0M", low: 1_000_001, high: 5_000_000, detail: "200 calls · $50 strike · expires Mar 19, 2027.", filingId: "20034836", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20034836.pdf", severity: "urgent",
  },
  {
    id: "20034836-2", ticker: "UBER", asset: "Uber Technologies, Inc.", instrument: "Call option", action: "Purchase", owner: "Spouse", transactionDate: "May 29, 2026", filedDate: "Jun 23, 2026", amount: "$500K–$1.0M", low: 500_001, high: 1_000_000, detail: "200 calls · $50 strike · expires Mar 19, 2027.", filingId: "20034836", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20034836.pdf", severity: "high",
  },
  {
    id: "20033725-1", ticker: "AB", asset: "AllianceBernstein Holding L.P.", instrument: "Stock", action: "Purchase", owner: "Spouse", transactionDate: "Jan 16, 2026", filedDate: "Jan 23, 2026", amount: "$1.0M–$5.0M", low: 1_000_001, high: 5_000_000, detail: "Purchased 25,000 units.", filingId: "20033725", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf", severity: "urgent",
  },
  {
    id: "20033725-2", ticker: "AAPL", asset: "Apple Inc.", instrument: "Stock", action: "Partial sale", owner: "Spouse", transactionDate: "Dec 24, 2025", filedDate: "Jan 23, 2026", amount: "$5.0M–$25.0M", low: 5_000_001, high: 25_000_000, detail: "Sold 45,000 shares.", filingId: "20033725", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf", severity: "urgent",
  },
  {
    id: "20033725-3", ticker: "NVDA", asset: "NVIDIA Corp.", instrument: "Stock", action: "Partial sale", owner: "Spouse", transactionDate: "Dec 24, 2025", filedDate: "Jan 23, 2026", amount: "$1.0M–$5.0M", low: 1_000_001, high: 5_000_000, detail: "Sold 20,000 shares.", filingId: "20033725", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf", severity: "urgent",
  },
  {
    id: "20030630-1", ticker: "AVGO", asset: "Broadcom Inc.", instrument: "Stock", action: "Purchase", owner: "Spouse", transactionDate: "Jun 20, 2025", filedDate: "Jul 9, 2025", amount: "$1.0M–$5.0M", low: 1_000_001, high: 5_000_000, detail: "Exercised 200 call options into 20,000 shares.", filingId: "20030630", sourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20030630.pdf", severity: "urgent",
  },
];

export const positions: Position[] = [
  { ticker: "AAPL", name: "Apple Inc.", type: "Stock", owner: "Spouse", annualBand: "$5M–$25M", low: 5, high: 25, lastChange: "↓ 73,200 shares sold or donated", direction: "down", confidence: "Medium", note: "Annual band as of Dec 31, 2025; subsequent PTR overlays do not reveal the remaining exact balance." },
  { ticker: "GOOGL", name: "Alphabet Inc. Class A", type: "Stock + calls", owner: "Spouse", annualBand: "$6M–$30M", low: 6, high: 30, lastChange: "↓ net 2,704 shares after exercise + gift", direction: "down", confidence: "Medium", note: "Combines separately disclosed year-end stock and option bands; options are not valued as shares." },
  { ticker: "AMZN", name: "Amazon.com, Inc.", type: "Stock + calls", owner: "Spouse", annualBand: "$5.5M–$26M", low: 5.5, high: 26, lastChange: "↓ net 15,000 shares after sale + exercise", direction: "down", confidence: "Medium", note: "Range combines annual stock and option bands before later disclosed flows." },
  { ticker: "MSFT", name: "Microsoft Corp.", type: "Stock", owner: "Spouse", annualBand: "$5M–$25M", low: 5, high: 25, lastChange: "No later PTR located", direction: "flat", confidence: "High", note: "Last confirmed on the 2025 annual report." },
  { ticker: "NVDA", name: "NVIDIA Corp.", type: "Stock + calls", owner: "Spouse", annualBand: "$5.5M–$26M", low: 5.5, high: 26, lastChange: "↓ net 15,000 shares after sale + exercise", direction: "down", confidence: "Medium", note: "Calls remain separately tracked; exact premium and mark are unavailable." },
  { ticker: "AVGO", name: "Broadcom Inc.", type: "Stock", owner: "Spouse", annualBand: "$5M–$25M", low: 5, high: 25, lastChange: "↑ 20,000 shares from option exercise", direction: "up", confidence: "High", note: "Exact exercise share count appears in the official PTR description." },
  { ticker: "CRM", name: "Salesforce, Inc.", type: "Stock", owner: "Spouse", annualBand: "$5M–$25M", low: 5, high: 25, lastChange: "No later PTR located", direction: "flat", confidence: "High", note: "Last confirmed on the 2025 annual report." },
  { ticker: "BE", name: "Bloom Energy Corp.", type: "Stock + calls", owner: "Spouse", annualBand: "New in 2026", low: 3, high: 12, lastChange: "↑ 15,000 shares + 200 calls", direction: "up", confidence: "High", note: "Purchase activity is exact where the filing description supplies quantities; value remains a band." },
  { ticker: "INTC", name: "Intel Corp.", type: "Stock + calls", owner: "Spouse", annualBand: "New in 2026", low: 1.75, high: 6.5, lastChange: "↑ 10,000 shares + 250 calls", direction: "up", confidence: "High", note: "Two official PTRs disclose the 2026 build." },
  { ticker: "NFLX", name: "Netflix, Inc.", type: "Stock", owner: "Spouse", annualBand: "$1M–$5M", low: 1, high: 5, lastChange: "No later PTR located", direction: "flat", confidence: "High", note: "Last confirmed on the 2025 annual report." },
];

export const filingCadence = [
  { year: "2013", value: 1 }, { year: "2014", value: 2 }, { year: "2015", value: 3 },
  { year: "2016", value: 4 }, { year: "2017", value: 3 }, { year: "2018", value: 6 },
  { year: "2019", value: 5 }, { year: "2020", value: 8 }, { year: "2021", value: 6 },
  { year: "2022", value: 11 }, { year: "2023", value: 6 }, { year: "2024", value: 5 },
  { year: "2025", value: 3 }, { year: "2026", value: 3 },
];

export const reportedIncomeHistory = [
  { year: "2020", gainTaggedFloor: 3.2, lossTaggedFloor: 0.1, cumulativeGainTaggedFloor: 3.2 },
  { year: "2021", gainTaggedFloor: 0.1, lossTaggedFloor: 0, cumulativeGainTaggedFloor: 3.3 },
  { year: "2022", gainTaggedFloor: 5.1, lossTaggedFloor: 1.1, cumulativeGainTaggedFloor: 8.4 },
  { year: "2023", gainTaggedFloor: 0, lossTaggedFloor: 0.1, cumulativeGainTaggedFloor: 8.4 },
  { year: "2024", gainTaggedFloor: 6.2, lossTaggedFloor: 0.1, cumulativeGainTaggedFloor: 14.6 },
  { year: "2025", gainTaggedFloor: 7.0, lossTaggedFloor: 0.015, cumulativeGainTaggedFloor: 21.6 },
];

export const trackedMembers = [
  { id: "nancy-pelosi", initials: "NP", name: "Nancy Pelosi", district: "D · CA-11", active: true },
];

export const suggestedMembers = [
  { firstName: "Josh", lastName: "Gottheimer", displayName: "Josh Gottheimer", district: "NJ-05" },
  { firstName: "Marjorie Taylor", lastName: "Greene", displayName: "Marjorie Taylor Greene", district: "GA-14" },
  { firstName: "Ro", lastName: "Khanna", displayName: "Ro Khanna", district: "CA-17" },
  { firstName: "Michael", lastName: "McCaul", displayName: "Michael McCaul", district: "TX-10" },
];

export const officialSources = {
  index: "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2026FD.zip",
  search: "https://disclosures-clerk.house.gov/FinancialDisclosure/ViewSearch",
  annual: "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10075701.pdf",
  guidance: "https://ethics.house.gov/wp-content/uploads/2026/04/2025-Final-Instruction-Guide.pdf",
};
