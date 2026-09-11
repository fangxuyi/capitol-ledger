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

export const closedPickPerformance = [
  { id: "aapl-2020", ticker: "AAPL", instrument: "Calls", opened: "Dec 22, 2020", closed: "Jan 21, 2022", days: 395, underlyingReturn: 23.9, benchmarkReturn: 20.9, excessReturn: 3.1, optionReturnLow: 24.8, optionReturnMid: 66.4, optionReturnHigh: 149.6, pnlLow: 0.124, pnlMid: 0.249, pnlHigh: 0.374, result: "Definite win", filingIds: "20018011 → 20020515", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2021/20018011.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2022/20020515.pdf", note: "AAPL $100 calls. Exercise-value range reconstructed from the disclosed premium band and closing terms." },
  { id: "tsla-2020", ticker: "TSLA", instrument: "Calls", opened: "Dec 22, 2020", closed: "Mar 17, 2022", days: 450, underlyingReturn: 36.1, benchmarkReturn: 21.7, excessReturn: 14.4, optionReturnLow: -7.1, optionReturnMid: 23.9, optionReturnHigh: 85.8, pnlLow: -0.071, pnlMid: 0.179, pnlHigh: 0.429, result: "Range crosses zero", filingIds: "20018011 → 20020662", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2021/20018011.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2022/20020662.pdf", note: "TSLA $500 calls after split adjustment. The premium disclosure band is wide enough that modeled P&L crosses zero." },
  { id: "nvda-2021", ticker: "NVDA", instrument: "Calls", opened: "Jul 23, 2021", closed: "Sep 16, 2022", days: 420, underlyingReturn: -32.5, benchmarkReturn: -10.8, excessReturn: -21.7, optionReturnLow: -72.9, optionReturnMid: -72.9, optionReturnHigh: -72.9, pnlLow: -0.361, pnlMid: -0.361, pnlHigh: -0.361, result: "Official loss", filingIds: "20019331 → 20021837", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2021/20019331.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2022/20021837.pdf", note: "NVDA $100 calls. The closing PTR reports a $361,476 loss and −72.9% return." },
  { id: "mu-2021", ticker: "MU", instrument: "Calls", opened: "Dec 21, 2021", closed: "Sep 16, 2022", days: 269, underlyingReturn: -41.5, benchmarkReturn: -15.8, excessReturn: -25.7, optionReturnLow: -95.5, optionReturnMid: -95.5, optionReturnHigh: -95.5, pnlLow: -0.393, pnlMid: -0.393, pnlHigh: -0.393, result: "Official loss", filingIds: "20020106 → 20021837", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2021/20020106.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2022/20021837.pdf", note: "MU $50 calls. The closing PTR reports a $392,575 loss and −95.5% return." },
  { id: "dis-2021", ticker: "DIS", instrument: "Calls", opened: "Dec 17, 2021", closed: "Sep 16, 2022", days: 273, underlyingReturn: -27.2, benchmarkReturn: -15.2, excessReturn: -12.0, optionReturnLow: -100.0, optionReturnMid: -100.0, optionReturnHigh: -100.0, pnlLow: -0.133, pnlMid: -0.133, pnlHigh: -0.133, result: "Official loss", filingIds: "20020106 → 20021837", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2021/20020106.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2022/20021837.pdf", note: "DIS $130 calls. The closing PTR reports a $132,824 loss and −100% return." },
  { id: "crm-2021", ticker: "CRM", instrument: "Calls", opened: "Dec 20, 2021", closed: "Dec 20, 2022", days: 365, underlyingReturn: -48.0, benchmarkReturn: -15.0, excessReturn: -33.0, optionReturnLow: -100.0, optionReturnMid: -100.0, optionReturnHigh: -100.0, pnlLow: -0.734, pnlMid: -0.734, pnlHigh: -0.734, result: "Official loss", filingIds: "20020106 → 20022260", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2021/20020106.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2023/20022260.pdf", note: "CRM $210 calls. The closing PTR reports a $733,691 loss, approximately −100%." },
  { id: "aapl-2022", ticker: "AAPL", instrument: "Calls", opened: "May 13, 2022", closed: "Mar 17, 2023", days: 308, underlyingReturn: 5.9, benchmarkReturn: -1.3, excessReturn: 7.1, optionReturnLow: -25.0, optionReturnMid: 0.0, optionReturnHigh: 50.0, pnlLow: -0.250, pnlMid: 0.000, pnlHigh: 0.250, result: "Range crosses zero", filingIds: "20021142 → 20022664", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2022/20021142.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2023/20022664.pdf", note: "AAPL $80 calls. The modeled premium-band midpoint is breakeven, while the full range crosses zero." },
  { id: "msft-2022", ticker: "MSFT", instrument: "Calls", opened: "May 24, 2022", closed: "Jun 15, 2023", days: 387, underlyingReturn: 35.4, benchmarkReturn: 14.3, excessReturn: 21.1, optionReturnLow: 40.1, optionReturnMid: 110.8, optionReturnHigh: 180.2, pnlLow: 0.241, pnlMid: 0.416, pnlHigh: 0.540, result: "Definite win", filingIds: "20021142 → 20023192", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2022/20021142.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2023/20023192.pdf", note: "MSFT $180 calls. Exercise-value range reconstructed from the disclosed premium band and closing terms." },
  { id: "nvda-2023", ticker: "NVDA", instrument: "Calls", opened: "Nov 22, 2023", closed: "Dec 20, 2024", days: 394, underlyingReturn: 176.6, benchmarkReturn: 32.1, excessReturn: 144.5, optionReturnLow: 22.7, optionReturnMid: 104.5, optionReturnHigh: 513.5, pnlLow: 1.135, pnlMid: 3.135, pnlHigh: 5.135, result: "Definite win", filingIds: "20024186 → 20026590", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2023/20024186.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20026590.pdf", note: "50 calls were adjusted by NVIDIA’s 10-for-1 split to 500 calls; exercised into 50,000 shares at a split-adjusted $12 strike. Exercise value uses the $134.70 split-adjusted close." },
  { id: "panw-2024", ticker: "PANW", instrument: "Calls", opened: "Feb 12–21, 2024", closed: "Dec 20, 2024", days: 312, underlyingReturn: 9.7, benchmarkReturn: 19.8, excessReturn: -10.1, optionReturnLow: -2.8, optionReturnMid: 31.3, optionReturnHigh: 102.5, pnlLow: -0.035, pnlMid: 0.290, pnlHigh: 0.615, result: "Range crosses zero", filingIds: "20024542 → 20026590", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2024/20024542.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20026590.pdf", note: "70 calls were adjusted by Palo Alto Networks’ split to 140 calls; exercised into 14,000 shares at a split-adjusted $100 strike." },
  { id: "googl-2025", ticker: "GOOGL", instrument: "Calls", opened: "Jan 14, 2025", closed: "Jan 16, 2026", days: 367, underlyingReturn: 74.7, benchmarkReturn: 20.2, excessReturn: 54.5, optionReturnLow: 80.0, optionReturnMid: 140.0, optionReturnHigh: 260.0, pnlLow: 0.400, pnlMid: 0.525, pnlHigh: 0.650, result: "Definite win", filingIds: "20026590 → 20033725", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20026590.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf", note: "50 calls, $150 strike, exercised into 5,000 shares." },
  { id: "amzn-2025", ticker: "AMZN", instrument: "Calls", opened: "Jan 14, 2025", closed: "Jan 16, 2026", days: 367, underlyingReturn: 9.8, benchmarkReturn: 20.2, excessReturn: -10.4, optionReturnLow: -10.9, optionReturnMid: 18.8, optionReturnHigh: 78.2, pnlLow: -0.054, pnlMid: 0.071, pnlHigh: 0.196, result: "Range crosses zero", filingIds: "20026590 → 20033725", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20026590.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf", note: "50 calls, $150 strike, exercised into 5,000 shares." },
  { id: "nvda-2025", ticker: "NVDA", instrument: "Calls", opened: "Jan 14, 2025", closed: "Jan 16, 2026", days: 367, underlyingReturn: 41.4, benchmarkReturn: 20.2, excessReturn: 21.2, optionReturnLow: 6.2, optionReturnMid: 41.6, optionReturnHigh: 112.5, pnlLow: 0.031, pnlMid: 0.156, pnlHigh: 0.281, result: "Definite win", filingIds: "20026590 → 20033725", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20026590.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf", note: "50 calls, $80 strike, exercised into 5,000 shares." },
  { id: "tem-2025", ticker: "TEM", instrument: "Calls", opened: "Jan 14, 2025", closed: "Jan 16, 2026", days: 367, underlyingReturn: 121.0, benchmarkReturn: 20.2, excessReturn: 100.8, optionReturnLow: 151.7, optionReturnMid: 235.5, optionReturnHigh: 403.3, pnlLow: 0.152, pnlMid: 0.177, pnlHigh: 0.202, result: "Definite win", filingIds: "20026590 → 20033725", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20026590.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf", note: "50 calls, $20 strike, exercised into 5,000 shares." },
  { id: "vst-2025", ticker: "VST", instrument: "Calls", opened: "Jan 14, 2025", closed: "Jan 16, 2026", days: 367, underlyingReturn: -1.8, benchmarkReturn: 20.2, excessReturn: -22.0, optionReturnLow: -41.7, optionReturnMid: -22.3, optionReturnHigh: 16.6, pnlLow: -0.417, pnlMid: -0.167, pnlHigh: 0.083, result: "Range crosses zero", filingIds: "20026590 → 20033725", purchaseSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20026590.pdf", closeSourceUrl: "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf", note: "50 calls, $50 strike, exercised into 5,000 shares." },
];

export const openPickPerformance = [
  { ticker: "BE", instrument: "Stock", opened: "Jul 24–28, 2026", quantity: "15,000 shares", returnValue: 54.2, benchmark: 3.3, excess: 50.9, status: "Open", note: "Quantity-weighted daily-close proxy across two purchases." },
  { ticker: "BE", instrument: "Calls", opened: "Jul 24–28, 2026", quantity: "200 calls · $100 strike", returnValue: 56.8, benchmark: 3.3, excess: 53.5, status: "Underlying proxy", note: "Actual option return omitted; current intrinsic value is only a floor before Jun 2027 expiry." },
  { ticker: "INTC", instrument: "Stock", opened: "Jul 24, 2026", quantity: "10,000 shares", returnValue: 11.5, benchmark: 3.4, excess: 8.1, status: "Open", note: "Daily-close proxy from disclosed transaction date through Sep 11, 2026." },
  { ticker: "INTC", instrument: "Calls", opened: "May 29–Jul 24, 2026", quantity: "250 calls · $50 strike", returnValue: -6.6, benchmark: 1.7, excess: -8.3, status: "Underlying proxy", note: "Contract-weighted underlying return; not the option’s return." },
  { ticker: "UBER", instrument: "Calls", opened: "May 29, 2026", quantity: "200 calls · $50 strike", returnValue: 1.8, benchmark: 1.3, excess: 0.5, status: "Underlying proxy", note: "Actual option mark requires licensed OPRA history or a permitted indicative feed." },
  { ticker: "AB", instrument: "Units", opened: "Jan 16, 2026", quantity: "25,000 units", returnValue: -3.9, benchmark: 11.1, excess: -15.0, status: "Open", note: "Daily adjusted-close proxy through Sep 11, 2026." },
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
