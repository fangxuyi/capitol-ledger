import { readFile } from 'node:fs/promises';
import { openLocalDatabase } from './local-db.mjs';

const readJSON = async (path) => JSON.parse(await readFile(path, 'utf8'));
const rawPath = process.argv.find((arg) => arg.startsWith('--input='))?.slice(8);
const snapshot = await readJSON(rawPath ?? 'data/bootstrap/house-performance.json');
const { meta, members } = snapshot;
if (!members?.length || !meta?.generatedAt) throw new Error('Invalid import metadata.');
// Legacy files are bootstrap inputs only. No saved returns or episode results are imported.
const transactions = rawPath ? snapshot.transactions : (await Promise.all(members.map(async (member) =>
  (await readJSON(`data/bootstrap/members/${member.id}.json`)).transactions))).flat();
if (!transactions?.length) throw new Error('Refusing an empty import.');
const ids = new Set();
for (const row of transactions) {
  if (ids.has(row.id)) throw new Error(`Duplicate transaction: ${row.id}`);
  ids.add(row.id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.transactionDate)) throw new Error(`Invalid date: ${row.id}`);
}
const tickers = [...new Set(['SPY', ...transactions.map((row) => row.ticker)])];
const series = new Map();
for (const ticker of tickers) {
  if (!/^[A-Z0-9.^=-]+$/.test(ticker)) throw new Error(`Invalid ticker: ${ticker}`);
  try {
    const points = await readJSON(`work/house-prices/${ticker}.json`);
    if (!Array.isArray(points)) throw new Error(`Invalid price series: ${ticker}`);
    series.set(ticker, points);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Missing securities stay unscored. Never synthesize prices from old returns.
  }
}
if (!series.get('SPY')?.length) throw new Error('SPY price history is required. Restore the work cache or run the raw-source refresh.');
const { db, path } = await openLocalDatabase();
let prices = 0;
let skippedPrices = 0;
try {
  const previous=db.prepare('SELECT COUNT(*) AS count FROM transactions').get().count;
  if (rawPath && transactions.length<previous*0.95) throw new Error(`Transaction count fell from ${previous} to ${transactions.length}; refusing a potentially partial refresh.`);
  db.exec('BEGIN IMMEDIATE');
  if(rawPath){db.exec('DELETE FROM price_exclusions');const quality=db.prepare('INSERT INTO price_exclusions VALUES (?,?,?,?)');for(const row of snapshot.priceExclusions??[])quality.run(row.ticker,row.reason,row.checked_at,row.last_good_price_date);}
  const memberInsert = db.prepare(`INSERT INTO research_members VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,state_district=excluded.state_district,indexed_filing_count=excluded.indexed_filing_count`);
  for (const row of members) memberInsert.run(row.id,row.name,row.stateDistrict ?? '',row.filingCount);
  const insert = db.prepare(`INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    member_id=excluded.member_id,ticker=excluded.ticker,instrument=excluded.instrument,direction=excluded.direction,
    action=excluded.action,close_kind=excluded.close_kind,expiration_date=excluded.expiration_date,strike=excluded.strike,
    transaction_date=excluded.transaction_date,filing_id=excluded.filing_id,payload=excluded.payload`);
  if (rawPath) db.exec('DELETE FROM transactions'); // Complete validated raw refresh replaces parsed rows atomically.
  for (const row of transactions) insert.run(row.id,row.memberId,row.ticker,row.instrument,row.direction,row.action,
    row.closeKind,row.expirationDate,row.strike,row.transactionDate,row.filingId,JSON.stringify(row));
  const priceInsert = db.prepare(`INSERT INTO price_history VALUES (?,?,?) ON CONFLICT(ticker,date) DO UPDATE SET adjusted_close=excluded.adjusted_close`);
  for (const [ticker, points] of series) for (const point of points) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(point.date)) throw new Error(`Invalid price date: ${ticker} ${point.date}`);
    if (!Number.isFinite(point.close) || point.close <= 0) { skippedPrices++; continue; }
    priceInsert.run(ticker,point.date,point.close); prices++;
  }
  const filingInsert = db.prepare(`INSERT INTO filings (doc_id,member_id,filing_type,filing_year,filed_at,source_index_url,source_pdf_url)
    VALUES (?,?,'P',?,?,?,?) ON CONFLICT(doc_id) DO NOTHING`);
  for (const row of snapshot.filings ?? transactions) {
    const url = row.sourceUrl;
    const year = Number(url.match(/ptr-pdfs\/(\d{4})\//)?.[1]);
    if (!year) throw new Error(`Invalid filing source: ${url}`);
    filingInsert.run(row.docId ?? row.filingId,row.memberId,year,row.filingDate,`https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`,url);
  }
  db.prepare(`INSERT INTO dataset_imports VALUES (1,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    imported_at=excluded.imported_at,source_generated_at=excluded.source_generated_at,source_start_year=excluded.source_start_year,
    source_end_year=excluded.source_end_year,readable_ptr_count=excluded.readable_ptr_count,methodology=excluded.methodology`)
    .run(new Date().toISOString(),meta.generatedAt,meta.sourceStartYear,meta.sourceEndYear,meta.textReadablePtrCount,"Equal-weighted reconstructed holding episodes, separated by household owner. Partial-sale residuals use the latest stored adjusted close. Options use underlying directional returns. SPY uses the same security entry and exit dates.");
  db.exec('COMMIT; PRAGMA optimize;');
  console.log(JSON.stringify({ database:path,members:members.length,transactions:transactions.length,priceRows:prices,skippedPrices,
    benchmarkPriceAsOf:db.prepare("SELECT MAX(date) AS date FROM price_history WHERE ticker='SPY'").get().date },null,2));
} catch (error) {
  if (db.isTransaction) db.exec('ROLLBACK');
  throw error;
} finally { db.close(); }
