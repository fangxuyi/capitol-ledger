-- Raw observations, never precomputed returns or member rankings.
CREATE TABLE research_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state_district TEXT NOT NULL DEFAULT '',
  indexed_filing_count INTEGER NOT NULL CHECK (indexed_filing_count >= 0)
);
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES research_members(id),
  ticker TEXT NOT NULL,
  instrument TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('Long','Short')),
  action TEXT NOT NULL CHECK (action IN ('P','S','E')),
  close_kind TEXT,
  expiration_date TEXT,
  strike TEXT,
  transaction_date TEXT NOT NULL,
  filing_id TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX transactions_member_date ON transactions(member_id, transaction_date, id);
CREATE TABLE price_history (
  ticker TEXT NOT NULL,
  date TEXT NOT NULL,
  adjusted_close REAL NOT NULL CHECK (adjusted_close > 0),
  PRIMARY KEY(ticker,date)
) WITHOUT ROWID;
CREATE TABLE dataset_imports (
  id INTEGER PRIMARY KEY CHECK(id=1),
  imported_at TEXT NOT NULL,
  source_generated_at TEXT NOT NULL,
  source_start_year INTEGER NOT NULL,
  source_end_year INTEGER NOT NULL,
  readable_ptr_count INTEGER NOT NULL,
  methodology TEXT NOT NULL
);

-- A full sale or exchange ends a cycle; partial sales retain the residual.
-- Owner is part of the key so different household owners are not merged.
CREATE VIEW holding_episodes AS
WITH keyed AS (
  SELECT *, member_id || '|' || ticker || '|' || instrument || '|' || direction || '|' ||
    COALESCE(json_extract(payload,'$.owner'),'') || '|' ||
    CASE WHEN instrument='Stock' THEN 'stock' ELSE COALESCE(expiration_date,'unknown') || '|' || COALESCE(strike,'unknown') END AS contract_key,
    CASE WHEN action='E' OR (action='S' AND COALESCE(close_kind,'')!='partial') THEN 1 ELSE 0 END AS closes_cycle
  FROM transactions
), cycles AS (
  SELECT *, COALESCE(SUM(closes_cycle) OVER (
    PARTITION BY contract_key ORDER BY transaction_date,id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
  ),0) AS cycle FROM keyed
), grouped AS (
  SELECT contract_key,cycle,
    MIN(CASE WHEN action='P' THEN transaction_date || '|' || id END) AS first_purchase,
    MIN(CASE WHEN closes_cycle=1 THEN transaction_date END) AS sold_at,
    MAX(CASE WHEN action='P' THEN expiration_date END) AS expires_at,
    MAX(CASE WHEN action='S' AND close_kind='partial' THEN 1 ELSE 0 END) AS partial_seen,
    SUM(CASE WHEN action='P' THEN 1 ELSE 0 END) AS purchase_count
  FROM cycles GROUP BY contract_key,cycle HAVING first_purchase IS NOT NULL
)
SELECT t.*, g.purchase_count,
  COALESCE(g.sold_at, CASE WHEN t.instrument!='Stock' AND g.expires_at<=date('now') THEN g.expires_at ELSE date('now') END) AS end_date,
  CASE WHEN g.sold_at IS NOT NULL THEN 'Closed'
    WHEN t.instrument!='Stock' AND g.expires_at<=date('now') THEN 'Expiry inferred'
    WHEN g.partial_seen=1 THEN 'Residual · latest mark' ELSE 'Open · latest mark' END AS episode_status
FROM grouped g JOIN transactions t ON t.id=substr(g.first_purchase,12);

-- Indexed lookups use the last available security mark on/before the end date.
-- The benchmark uses the same entry/exit dates as that security.
CREATE VIEW performance_episodes AS
WITH dates AS MATERIALIZED (
  SELECT e.*,
    (SELECT date FROM price_history p WHERE p.ticker=e.ticker AND p.date>=e.transaction_date ORDER BY p.date LIMIT 1) AS entry_date,
    (SELECT date FROM price_history p WHERE p.ticker=e.ticker AND p.date<=e.end_date ORDER BY p.date DESC LIMIT 1) AS exit_date
  FROM holding_episodes e
), marks AS MATERIALIZED (
  SELECT d.*, p1.adjusted_close AS entry_price,p2.adjusted_close AS exit_price,
    (SELECT adjusted_close FROM price_history WHERE ticker='SPY' AND date<=d.entry_date ORDER BY date DESC LIMIT 1) AS benchmark_entry,
    (SELECT adjusted_close FROM price_history WHERE ticker='SPY' AND date<=d.exit_date ORDER BY date DESC LIMIT 1) AS benchmark_exit
  FROM dates d LEFT JOIN price_history p1 ON p1.ticker=d.ticker AND p1.date=d.entry_date
  LEFT JOIN price_history p2 ON p2.ticker=d.ticker AND p2.date=d.exit_date
), calculated AS (
  SELECT *, CASE WHEN exit_date>=entry_date AND entry_price>0 AND benchmark_entry>0 AND benchmark_exit>0 THEN 1 ELSE 0 END AS scored,
    CASE WHEN direction='Short' THEN -1 ELSE 1 END AS sign FROM marks
)
SELECT id,member_id,ticker,instrument,direction,transaction_date,payload,
  CASE WHEN episode_status LIKE '%latest mark' AND scored=1 THEN exit_date ELSE end_date END AS close_date,
  CASE WHEN scored=1 THEN episode_status ELSE 'No price match' END AS status,
  CASE WHEN scored=1 THEN CAST(julianday(exit_date)-julianday(entry_date) AS INTEGER) END AS period_days,
  CASE WHEN scored=1 THEN ROUND(sign*(exit_price/entry_price-1)*100,1) END AS return_value,
  CASE WHEN scored=1 THEN ROUND(sign*(benchmark_exit/benchmark_entry-1)*100,1) END AS benchmark_return,
  CASE WHEN scored=1 THEN ROUND(sign*(exit_price/entry_price-benchmark_exit/benchmark_entry)*100,1) END AS excess_return,
  entry_date,exit_date,entry_price,exit_price,benchmark_entry,benchmark_exit
FROM calculated;
