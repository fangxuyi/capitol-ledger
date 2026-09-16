CREATE TABLE ingestion_runs (
  id TEXT PRIMARY KEY,
  base_imported_at TEXT,
  seed INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('staging','published','aborted')),
  manifest TEXT NOT NULL CHECK(json_valid(manifest)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);
CREATE UNIQUE INDEX ingestion_one_writer ON ingestion_runs(status) WHERE status='staging';
CREATE TABLE ingestion_chunks (
  run_id TEXT NOT NULL REFERENCES ingestion_runs(id),
  kind TEXT NOT NULL CHECK(kind IN ('members','transactions','filings','prices')),
  chunk_index INTEGER NOT NULL,
  row_count INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  PRIMARY KEY(run_id,kind,chunk_index)
) WITHOUT ROWID;
