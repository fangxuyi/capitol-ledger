import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { strFromU8, unzipSync } from "fflate";

const execFileAsync = promisify(execFile);
const root = new URL("../", import.meta.url).pathname;
const textCache = join(root, "work", "house-ptrs");
const priceCache = join(root, "work", "house-prices");
const outputPath = join(root, "lib", "house-performance.generated.ts");
const currentYear = new Date().getUTCFullYear();
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const docLimit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const startYear = 2013;
const endYear = Math.min(currentYear, 2026);

await mkdir(textCache, { recursive: true });
await mkdir(priceCache, { recursive: true });

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseDate(value) {
  const [month, day, year] = value.split("/").map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function fetchIndexes() {
  const filings = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const indexUrl = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`;
    const response = await fetch(indexUrl, { headers: { "user-agent": "Capitol-Ledger/1.0 research" } });
    if (!response.ok) throw new Error(`House Clerk index ${year} returned ${response.status}`);
    const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const fileName = Object.keys(archive).find((name) => name.endsWith(".txt"));
    if (!fileName) continue;
    const rows = strFromU8(archive[fileName]).split(/\r?\n/).slice(1);
    for (const line of rows) {
      const fields = line.split("\t").map((field) => field.trim());
      if (fields.length < 9 || fields[4] !== "P") continue;
      const [, lastName, firstName, suffix, , stateDistrict, , filingDate, docId] = fields;
      const cleanSuffix = /^(Jr\.?|Sr\.?|II|III|IV)$/i.test(suffix) ? suffix : "";
      const displayName = [firstName, lastName, cleanSuffix].filter(Boolean).join(" ").replace(/\s+/g, " ");
      const firstKey = firstName.split(/\s+/)[0];
      filings.push({
        year,
        docId,
        filingDate,
        firstName,
        lastName,
        displayName,
        stateDistrict,
        memberId: slug(`${firstKey}-${lastName}`),
        sourceUrl: `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${docId}.pdf`,
      });
    }
  }
  return filings;
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
      if ((index + 1) % 250 === 0) process.stdout.write(`\rProcessed ${index + 1}/${items.length} PTRs`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  process.stdout.write("\n");
  return results;
}

async function filingText(filing) {
  const cachePath = join(textCache, `${filing.year}-${filing.docId}.txt`);
  try {
    return await readFile(cachePath, "utf8");
  } catch { /* download and extract */ }
  const response = await fetch(filing.sourceUrl, { headers: { "user-agent": "Capitol-Ledger/1.0 research" } });
  if (!response.ok) return "";
  const pdfPath = join(tmpdir(), `capitol-ledger-${filing.year}-${filing.docId}-${crypto.randomUUID()}.pdf`);
  await writeFile(pdfPath, new Uint8Array(await response.arrayBuffer()));
  try {
    const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], { maxBuffer: 8 * 1024 * 1024 });
    await writeFile(cachePath, stdout);
    return stdout;
  } catch {
    return "";
  } finally {
    await rm(pdfPath, { force: true });
  }
}

function extractTransactions(text, filing) {
  const lines = text.replace(/\f/g, "\n").split(/\r?\n/);
  const starts = [];
  const rowPattern = /^\s*(?:(SP|JT|DC)\s+)?(.+?)\s+([PSEG])(?:\s+\((partial|full)\))?\s+(\d{2}\/\d{2}\/\d{4})\s+\d{2}\/\d{2}\/\d{4}\s+/i;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(rowPattern);
    if (match) starts.push({ index, match });
  }
  return starts.flatMap((start, position) => {
    const end = starts[position + 1]?.index ?? Math.min(lines.length, start.index + 18);
    const block = lines.slice(start.index, end).join(" ").replace(/\s+/g, " ");
    const [, owner = "", assetName, rawAction, closeKind = "", rawDate] = start.match;
    const action = rawAction.toUpperCase();
    if (!/[PSE]/.test(action)) return [];
    const tickerMatch = block.match(/\(([A-Z][A-Z0-9.\-]{0,8})\)/);
    const typeMatch = block.match(/\[(ST|OP)\]/);
    if (!tickerMatch || !typeMatch) return [];
    const rawTicker = tickerMatch[1];
    const assetType = typeMatch[1];
    const ticker = rawTicker.replace(".", "-");
    let direction = "Long";
    let instrument = "Stock";
    if (assetType === "OP") {
      instrument = /put option/i.test(block) ? "Put" : /call option/i.test(block) ? "Call" : "Option";
      if (instrument === "Option") return [];
      direction = instrument === "Put" ? "Short" : "Long";
    }
    const transactionDate = parseDate(rawDate);
    const expiryMatch = block.match(/expiration date of\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    const strikeMatch = block.match(/strike price of\s+\$?([\d,.]+)/i);
    return [{
      id: `${filing.docId}-${ticker}-${transactionDate}-${direction}-${action}`,
      memberId: filing.memberId,
      member: filing.displayName,
      stateDistrict: filing.stateDistrict,
      ticker,
      assetName: assetName.trim(),
      instrument,
      direction,
      owner: owner || "Not stated",
      action,
      closeKind: closeKind.toLowerCase() || null,
      expirationDate: expiryMatch ? parseDate(expiryMatch[1]) : null,
      strike: strikeMatch ? strikeMatch[1].replace(/,/g, "") : null,
      transactionDate,
      filingDate: filing.filingDate,
      filingId: filing.docId,
      sourceUrl: filing.sourceUrl,
    }];
  });
}

async function priceSeries(ticker) {
  const cachePath = join(priceCache, `${ticker}.json`);
  try {
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch { /* fetch below */ }
  const period1 = Math.floor(Date.parse("2012-12-20T00:00:00Z") / 1000);
  const period2 = Math.floor((Date.now() + 86400000) / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  let response;
  try {
    response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 Capitol-Ledger/1.0" } });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  if (!result?.timestamp?.length) return null;
  const adjusted = result.indicators?.adjclose?.[0]?.adjclose ?? result.indicators?.quote?.[0]?.close;
  const rows = result.timestamp.flatMap((timestamp, index) => {
    const close = adjusted?.[index];
    return Number.isFinite(close) ? [{ date: new Date(timestamp * 1000).toISOString().slice(0, 10), close }] : [];
  });
  await writeFile(cachePath, JSON.stringify(rows));
  return rows;
}

function pointOnOrAfter(series, date) {
  return series?.find((point) => point.date >= date) ?? null;
}

function pointOnOrBefore(series, date) {
  if (!series) return null;
  for (let index = series.length - 1; index >= 0; index -= 1) if (series[index].date <= date) return series[index];
  return null;
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

const filings = await fetchIndexes();
const members = new Map();
for (const filing of filings) {
  if (!members.has(filing.memberId)) members.set(filing.memberId, { id: filing.memberId, name: filing.displayName, stateDistrict: filing.stateDistrict, filingCount: 0 });
  members.get(filing.memberId).filingCount += 1;
}

const selectedFilings = filings.slice(0, Number.isFinite(docLimit) ? docLimit : filings.length);
const extractionResults = await mapConcurrent(selectedFilings, 10, async (filing) => {
  const text = await filingText(filing);
  return { readable: text.trim().length >= 200, transactions: extractTransactions(text, filing) };
});
const extracted = extractionResults.flatMap((result) => result.transactions);
const transactionMap = new Map(extracted.map((transaction) => [transaction.id, transaction]));
const transactions = [...transactionMap.values()];
const tickers = [...new Set(transactions.map((transaction) => transaction.ticker))];
const prices = new Map();
await mapConcurrent(["SPY", ...tickers], 5, async (ticker) => prices.set(ticker, await priceSeries(ticker)));
const spy = prices.get("SPY");
const today = new Date().toISOString().slice(0, 10);

const groupedTransactions = new Map();
for (const transaction of transactions.sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))) {
  const contractKey = transaction.instrument === "Stock" ? "stock" : `${transaction.expirationDate ?? "unknown"}|${transaction.strike ?? "unknown"}`;
  const key = `${transaction.memberId}|${transaction.ticker}|${transaction.instrument}|${transaction.direction}|${contractKey}`;
  if (!groupedTransactions.has(key)) groupedTransactions.set(key, []);
  groupedTransactions.get(key).push(transaction);
}

const episodes = [];
for (const group of groupedTransactions.values()) {
  let open = null;
  for (const transaction of group) {
    if (transaction.action === "P") {
      if (!open) open = { ...transaction, purchaseCount: 0, partialSaleSeen: false, expirationDate: transaction.expirationDate };
      open.purchaseCount += 1;
      if (transaction.expirationDate && (!open.expirationDate || transaction.expirationDate > open.expirationDate)) open.expirationDate = transaction.expirationDate;
      continue;
    }
    if (!open) continue;
    if (transaction.action === "S" && transaction.closeKind === "partial") {
      open.partialSaleSeen = true;
      continue;
    }
    episodes.push({ ...open, closeDate: transaction.transactionDate, status: "Closed", closeSourceUrl: transaction.sourceUrl });
    open = null;
  }
  if (open) {
    const expired = open.instrument !== "Stock" && open.expirationDate && open.expirationDate <= today;
    episodes.push({ ...open, closeDate: expired ? open.expirationDate : today, status: expired ? "Expiry inferred" : open.partialSaleSeen ? "Residual · latest mark" : "Open · latest mark", closeSourceUrl: null });
  }
}

const measured = episodes.map((episode) => {
  const endDate = episode.closeDate;
  const securitySeries = prices.get(episode.ticker);
  const entry = pointOnOrAfter(securitySeries, episode.transactionDate);
  const exit = pointOnOrBefore(securitySeries, endDate);
  const spyEntry = pointOnOrAfter(spy, episode.transactionDate);
  const spyExit = pointOnOrBefore(spy, endDate);
  if (!entry || !exit || !spyEntry || !spyExit || exit.date < entry.date) return { ...episode, status: "No price match", periodDays: null, returnValue: null, benchmarkReturn: null, excessReturn: null, return90d: null, excess90d: null };
  const stockReturn = (exit.close / entry.close - 1) * 100;
  const benchmarkReturn = (spyExit.close / spyEntry.close - 1) * 100;
  const sign = episode.direction === "Short" ? -1 : 1;
  const target90d = addDays(episode.transactionDate, 90);
  const exit90d = target90d <= today ? pointOnOrBefore(securitySeries, target90d) : null;
  const spyExit90d = target90d <= today ? pointOnOrBefore(spy, target90d) : null;
  const stock90d = exit90d ? (exit90d.close / entry.close - 1) * 100 : null;
  const spy90d = spyExit90d ? (spyExit90d.close / spyEntry.close - 1) * 100 : null;
  return {
    ...episode,
    periodDays: Math.round((Date.parse(exit.date) - Date.parse(entry.date)) / 86400000),
    returnValue: round(sign * stockReturn),
    benchmarkReturn: round(sign * benchmarkReturn),
    excessReturn: round(sign * (stockReturn - benchmarkReturn)),
    return90d: stock90d === null ? null : round(sign * stock90d),
    excess90d: stock90d === null || spy90d === null ? null : round(sign * (stock90d - spy90d)),
  };
});

const byMember = new Map();
for (const pick of measured) {
  if (!byMember.has(pick.memberId)) byMember.set(pick.memberId, []);
  byMember.get(pick.memberId).push(pick);
}

const summaries = [...members.values()].map((member) => {
  const allPicks = byMember.get(member.id) ?? [];
  const scored = allPicks.filter((pick) => pick.returnValue !== null);
  const standardized = scored.filter((pick) => pick.excess90d !== null);
  const avg = (field) => scored.length ? round(scored.reduce((sum, pick) => sum + pick[field], 0) / scored.length) : null;
  const sortedBest = [...scored].sort((a, b) => b.excessReturn - a.excessReturn);
  const featured = [...new Map([...sortedBest.slice(0, 2), ...sortedBest.slice(-1), ...[...allPicks].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)).slice(0, 1)].map((pick) => [pick.id, pick])).values()].slice(0, 4);
  return {
    ...member,
    selectionCount: allPicks.length,
    scoredCount: scored.length,
    closedCount: allPicks.filter((pick) => pick.status === "Closed" || pick.status === "Expiry inferred").length,
    openCount: allPicks.filter((pick) => pick.status.includes("latest mark")).length,
    longCount: allPicks.filter((pick) => pick.direction === "Long").length,
    shortCount: allPicks.filter((pick) => pick.direction === "Short").length,
    averageReturn: avg("returnValue"),
    averageExcess: avg("excessReturn"),
    average90dExcess: standardized.length ? round(standardized.reduce((sum, pick) => sum + pick.excess90d, 0) / standardized.length) : null,
    hitRate: scored.length ? round(scored.filter((pick) => pick.returnValue > 0).length / scored.length * 100) : null,
    featuredPicks: featured.map(({ id, ticker, instrument, direction, transactionDate, closeDate, status, periodDays, returnValue, excessReturn, sourceUrl }) => ({ id, ticker, instrument, direction, transactionDate, closeDate, status, periodDays, returnValue, excessReturn, sourceUrl })),
  };
}).sort((a, b) => (b.averageExcess ?? -Infinity) - (a.averageExcess ?? -Infinity));

const meta = {
  generatedAt: new Date().toISOString(),
  sourceStartYear: startYear,
  sourceEndYear: endYear,
  filerCount: members.size,
  ptrCount: filings.length,
  textReadablePtrCount: extractionResults.filter((result) => result.readable).length,
  transactionCount: transactions.length,
  episodeCount: episodes.length,
  scoredEpisodeCount: measured.filter((pick) => pick.returnValue !== null).length,
  residualEpisodeCount: measured.filter((pick) => pick.status.includes("latest mark")).length,
  methodology: "Equal-weighted estimated holding-period return from first disclosed purchase to a reported close; partial-sale residuals and other open episodes use the latest available price. Options use the underlying security as a directional proxy. The 90-day excess return is retained as a secondary standardized comparison.",
};

const source = `// Generated from official House Clerk PTR indexes and PDFs by scripts/build-house-performance.mjs.\nexport const housePerformanceMeta = ${JSON.stringify(meta, null, 2)} as const;\n\nexport const houseMembersPerformance = ${JSON.stringify(summaries, null, 2)} as const;\n`;
await writeFile(outputPath, source);
console.log(JSON.stringify(meta, null, 2));
