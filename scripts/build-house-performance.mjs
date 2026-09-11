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
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

function extractSelections(text, filing) {
  const lines = text.replace(/\f/g, "\n").split(/\r?\n/);
  const starts = [];
  const rowPattern = /^\s*(?:(SP|JT|DC)\s+)?(.+?)\s+([PSE])\s+(\d{2}\/\d{2}\/\d{4})\s+\d{2}\/\d{2}\/\d{4}\s+/;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(rowPattern);
    if (match) starts.push({ index, match });
  }
  return starts.flatMap((start, position) => {
    const end = starts[position + 1]?.index ?? Math.min(lines.length, start.index + 18);
    const block = lines.slice(start.index, end).join(" ").replace(/\s+/g, " ");
    const [, owner = "", assetName, action, rawDate] = start.match;
    if (action !== "P") return [];
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
    return [{
      id: `${filing.docId}-${ticker}-${transactionDate}-${direction}`,
      memberId: filing.memberId,
      member: filing.displayName,
      stateDistrict: filing.stateDistrict,
      ticker,
      assetName: assetName.trim(),
      instrument,
      direction,
      owner: owner || "Not stated",
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
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 Capitol-Ledger/1.0" } });
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
  return { readable: text.trim().length >= 200, selections: extractSelections(text, filing) };
});
const extracted = extractionResults.flatMap((result) => result.selections);
const selectionMap = new Map(extracted.map((selection) => [selection.id, selection]));
const selections = [...selectionMap.values()];
const tickers = [...new Set(selections.map((selection) => selection.ticker))];
const prices = new Map();
await mapConcurrent(["SPY", ...tickers], 5, async (ticker) => prices.set(ticker, await priceSeries(ticker)));
const spy = prices.get("SPY");
const today = new Date().toISOString().slice(0, 10);

const measured = selections.map((selection) => {
  const targetDate = addDays(selection.transactionDate, 90);
  const complete = targetDate <= today;
  const endDate = complete ? targetDate : today;
  const securitySeries = prices.get(selection.ticker);
  const entry = pointOnOrAfter(securitySeries, selection.transactionDate);
  const exit = pointOnOrBefore(securitySeries, endDate);
  const spyEntry = pointOnOrAfter(spy, selection.transactionDate);
  const spyExit = pointOnOrBefore(spy, endDate);
  if (!entry || !exit || !spyEntry || !spyExit || exit.date < entry.date) return { ...selection, status: "No price match", complete, periodDays: null, returnValue: null, excessReturn: null };
  const stockReturn = (exit.close / entry.close - 1) * 100;
  const benchmarkReturn = (spyExit.close / spyEntry.close - 1) * 100;
  const sign = selection.direction === "Short" ? -1 : 1;
  return {
    ...selection,
    status: complete ? "90d complete" : "Interim",
    complete,
    periodDays: Math.round((Date.parse(exit.date) - Date.parse(entry.date)) / 86400000),
    returnValue: round(sign * stockReturn),
    benchmarkReturn: round(sign * benchmarkReturn),
    excessReturn: round(sign * (stockReturn - benchmarkReturn)),
  };
});

const byMember = new Map();
for (const pick of measured) {
  if (!byMember.has(pick.memberId)) byMember.set(pick.memberId, []);
  byMember.get(pick.memberId).push(pick);
}

const summaries = [...members.values()].map((member) => {
  const allPicks = byMember.get(member.id) ?? [];
  const scored = allPicks.filter((pick) => pick.complete && pick.returnValue !== null);
  const avg = (field) => scored.length ? round(scored.reduce((sum, pick) => sum + pick[field], 0) / scored.length) : null;
  const sortedBest = [...scored].sort((a, b) => b.excessReturn - a.excessReturn);
  const featured = [...new Map([...sortedBest.slice(0, 2), ...sortedBest.slice(-1), ...[...allPicks].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)).slice(0, 1)].map((pick) => [pick.id, pick])).values()].slice(0, 4);
  return {
    ...member,
    selectionCount: allPicks.length,
    scoredCount: scored.length,
    longCount: allPicks.filter((pick) => pick.direction === "Long").length,
    shortCount: allPicks.filter((pick) => pick.direction === "Short").length,
    averageReturn: avg("returnValue"),
    averageExcess: avg("excessReturn"),
    hitRate: scored.length ? round(scored.filter((pick) => pick.returnValue > 0).length / scored.length * 100) : null,
    featuredPicks: featured.map(({ id, ticker, instrument, direction, transactionDate, status, periodDays, returnValue, excessReturn, sourceUrl }) => ({ id, ticker, instrument, direction, transactionDate, status, periodDays, returnValue, excessReturn, sourceUrl })),
  };
}).sort((a, b) => (b.averageExcess ?? -Infinity) - (a.averageExcess ?? -Infinity));

const meta = {
  generatedAt: new Date().toISOString(),
  sourceStartYear: startYear,
  sourceEndYear: endYear,
  filerCount: members.size,
  ptrCount: filings.length,
  textReadablePtrCount: extractionResults.filter((result) => result.readable).length,
  selectionCount: selections.length,
  scoredSelectionCount: measured.filter((pick) => pick.complete && pick.returnValue !== null).length,
  methodology: "Equal-weighted 90-calendar-day total return from the disclosed transaction date; calls and stock purchases are long, purchased puts are short; excess is direction-adjusted versus SPY over matching dates.",
};

const source = `// Generated from official House Clerk PTR indexes and PDFs by scripts/build-house-performance.mjs.\nexport const housePerformanceMeta = ${JSON.stringify(meta, null, 2)} as const;\n\nexport const houseMembersPerformance = ${JSON.stringify(summaries, null, 2)} as const;\n`;
await writeFile(outputPath, source);
console.log(JSON.stringify(meta, null, 2));
