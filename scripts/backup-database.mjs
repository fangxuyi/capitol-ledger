import { backup } from 'node:sqlite';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openLocalDatabase } from './local-db.mjs';
const {db} = await openLocalDatabase();
try {
  await mkdir('backups',{recursive:true});
  const destination=resolve('backups',`capitol-ledger-${new Date().toISOString().replaceAll(':','-')}.sqlite`);
  await backup(db,destination);
  console.log(destination);
} finally { db.close(); }
