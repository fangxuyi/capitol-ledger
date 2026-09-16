CREATE TABLE price_exclusions (ticker TEXT PRIMARY KEY,reason TEXT NOT NULL,checked_at TEXT NOT NULL,last_good_price_date TEXT);
DROP VIEW performance_episodes;
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
  SELECT *, CASE WHEN exit_date>=entry_date AND julianday(entry_date)-julianday(transaction_date)<=7 AND entry_price>0 AND benchmark_entry>0 AND benchmark_exit>0 AND NOT EXISTS (SELECT 1 FROM price_exclusions q WHERE q.ticker=marks.ticker) THEN 1 ELSE 0 END AS scored,
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

ALTER TABLE ingestion_chunks RENAME TO ingestion_chunks_previous;
CREATE TABLE ingestion_chunks (run_id TEXT NOT NULL REFERENCES ingestion_runs(id),kind TEXT NOT NULL CHECK(kind IN ('members','transactions','filings','prices','quality')),chunk_index INTEGER NOT NULL,row_count INTEGER NOT NULL,sha256 TEXT NOT NULL,payload TEXT NOT NULL CHECK(json_valid(payload)),PRIMARY KEY(run_id,kind,chunk_index)) WITHOUT ROWID;
INSERT INTO ingestion_chunks SELECT * FROM ingestion_chunks_previous;
DROP TABLE ingestion_chunks_previous;
