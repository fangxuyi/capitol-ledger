import { DatabaseSync } from 'node:sqlite';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Locate by schema, not Miniflare's private hash. Never open a remote database.
export async function openLocalDatabase() {
  const directory = resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  const candidates = [];
  for (const file of await readdir(directory).catch(() => [])) {
    if (!file.endsWith('.sqlite') || file === 'metadata.sqlite') continue;
    const path = resolve(directory, file);
    const db = new DatabaseSync(path);
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='dataset_imports'").get()) candidates.push({ db, path });
    else db.close();
  }
  if (candidates.length !== 1) {
    for (const candidate of candidates) candidate.db.close();
    throw new Error('Expected one migrated Capitol Ledger database. Run npm run db:migrate first.');
  }
  candidates[0].db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;');
  return candidates[0];
}
