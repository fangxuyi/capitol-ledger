import { backup } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rename, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openLocalDatabase } from './local-db.mjs';

const origin='https://capitol-ledger.yeefangxu.chatgpt.site';
const key=process.env.CAPITOL_INGEST_KEY ?? execFileSync('/usr/bin/security',['find-generic-password','-s','capitol-ledger-ingest','-a','openclaw','-w'],{encoding:'utf8'}).trim();
if (!key) throw Error('Hosted ingestion credential unavailable');
const request=async(body)=> {
  for(let attempt=0;attempt<4;attempt++) {
    try {
      const response=await fetch(`${origin}/api/ingest`,{method:body?'POST':'GET',headers:{'x-capitol-import-key':key,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});
      const value=await response.json();
      if(!response.ok) { const error=Error(`${response.status}: ${value.error??'Hosted import failed'}`);error.retry=response.status>=500;throw error; }
      return value;
    } catch(error) { if(attempt===3||error.retry===false||/^4\d\d:/.test(error.message))throw error;await new Promise(r=>setTimeout(r,1000*(attempt+1))); }
  }
};
const {db}=await openLocalDatabase();
const mirror=resolve('work/hosted-database.sqlite');
const statePath='work/hosted-database-state.json';
try {
  const status=await request();
  const meta=db.prepare('SELECT * FROM dataset_imports WHERE id=1').get();
  if (!meta) throw Error('Local database has no verified import');
  let state=null; try{state=JSON.parse(await readFile(statePath,'utf8'));}catch{}
  if(status.import && state?.importedAt!==status.import.imported_at) throw Error('Hosted baseline differs from local mirror; recover the matching mirror before sending a delta.');
  if(status.import) {
    await access(mirror);
    db.prepare('ATTACH DATABASE ? AS previous').run(mirror);
  }
  const runId=`db-${createHash('sha256').update(meta.source_generated_at+'|'+(status.import?.imported_at??'seed')).digest('hex').slice(0,24)}`;
  const directory=`work/uploads/${runId}`;
  await mkdir(directory,{recursive:true});
  const manifest={chunks:{},counts:{},priceTotal:db.prepare('SELECT COUNT(*) AS count FROM price_history').get().count,meta};
  const chunks=[];
  const definitions={members:'SELECT * FROM research_members ORDER BY id',transactions:'SELECT * FROM transactions ORDER BY id',filings:'SELECT * FROM filings ORDER BY doc_id',quality:'SELECT * FROM price_exclusions ORDER BY ticker',
    prices:status.import?'SELECT p.* FROM main.price_history p LEFT JOIN previous.price_history b ON p.ticker=b.ticker AND p.date=b.date WHERE b.adjusted_close IS NULL OR p.adjusted_close!=b.adjusted_close ORDER BY p.ticker,p.date':'SELECT * FROM price_history ORDER BY ticker,date'};
  for(const [kind,sql]of Object.entries(definitions)) {
    let rows=[],index=0,count=0,bytes=0;
    const flush=async()=>{if(!rows.length)return;const file=`${directory}/${kind}-${index}.json`;await writeFile(file,JSON.stringify({action:'chunk',runId,kind,index,rows}));chunks.push(file);index++;rows=[];bytes=0;};
    for(const row of db.prepare(sql).iterate()) {
      const value=kind==='prices'?[row.ticker,row.date,row.adjusted_close]:row;
      const size=JSON.stringify(value).length+1;
      if(bytes+size>1_200_000||rows.length>=10000)await flush();
      rows.push(value);bytes+=size;count++;
    }
    await flush();manifest.chunks[kind]=index;manifest.counts[kind]=count;
  }
  await writeFile(`${directory}/manifest.json`,JSON.stringify(manifest,null,2));
  console.log(JSON.stringify({runId,counts:manifest.counts,chunks:chunks.length,seed:!status.import}));
  const begin=await request({action:'begin',runId,manifest,baseImportedAt:status.import?.imported_at??null});
  if(begin.status!=='published') {
    let cursor=0,done=0;
    async function upload(){while(cursor<chunks.length){const file=chunks[cursor++];await request(JSON.parse(await readFile(file,'utf8')));done++;if(done%25===0||done===chunks.length)console.log(`Uploaded ${done}/${chunks.length} chunks`);}}
    await Promise.all([upload(),upload()]);
    console.log(await request({action:'publish',runId}));
  }
  const verified=await request();
  if(verified.import?.source_generated_at!==meta.source_generated_at)throw Error('Hosted import did not activate expected source timestamp');
  // A mirror is an import baseline, never a substitute for a fresh source refresh.
  await backup(db,`${mirror}.next`);
  await rename(`${mirror}.next`,mirror);
  await writeFile(statePath,JSON.stringify({runId,importedAt:verified.import.imported_at,sourceGeneratedAt:meta.source_generated_at,counts:manifest.counts},null,2));
  console.log(JSON.stringify({verified:true,...verified.import}));
  await request({action:'cleanup',runId});
} finally {db.close();}
