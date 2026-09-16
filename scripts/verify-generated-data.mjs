// Kept as the data:verify entry point; checks the database, not generated bundles.
import assert from 'node:assert/strict';
import { openLocalDatabase } from './local-db.mjs';
const {db,path} = await openLocalDatabase();
try {
  assert.equal(db.prepare('PRAGMA quick_check').get().quick_check,'ok');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.ok(db.prepare('SELECT COUNT(*) AS count FROM dataset_imports').get().count);
  const counts=db.prepare('SELECT COUNT(*) AS episodes,COUNT(return_value) AS scored FROM performance_episodes').get();
  assert.ok(counts.episodes>0 && counts.scored>0);
  console.log({database:path,...counts});
} finally { db.close(); }
