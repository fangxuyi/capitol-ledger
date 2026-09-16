import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';

test('hosted importer requires credentials, rejects partial uploads, resumes chunks, and atomically publishes',async()=>{
 const db=new DatabaseSync(':memory:');
 for(const name of ['0000_marvelous_photon.sql','0003_analytics.sql','0004_hosted_ingestion.sql','0005_price_quality.sql'])db.exec(await fs.readFile(new URL(`../drizzle/${name}`,import.meta.url),'utf8'));
 function prepare(sql){let args=[];return{bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)??null;},async all(){return{results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);},execute(){return db.prepare(sql).run(...args);}};}
 const fixture={CAPITOL_INGEST_KEY:'test-secret',DB:{prepare,async batch(items){db.exec('BEGIN');try{const result=items.map(s=>s.execute());db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}}};
 globalThis.__capitolTestEnv=fixture;
 const source=(await fs.readFile(new URL('../app/api/ingest/route.ts',import.meta.url),'utf8')).replace("import { env } from 'cloudflare:workers';","const env=globalThis.__capitolTestEnv;").replace("import { getDashboardData, getMemberDetails } from '../../../db/analytics';",'');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {POST}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
 const post=(body,key='test-secret')=>POST(new Request('http://localhost/api/ingest',{method:'POST',headers:{'x-capitol-import-key':key},body:JSON.stringify(body)}));
 const manifest={counts:{members:1,transactions:1,filings:1,prices:2,quality:0},chunks:{members:1,transactions:1,filings:1,prices:1,quality:0},priceTotal:2,meta:{source_generated_at:'2026-09-15T12:00:00Z',source_start_year:2013,source_end_year:2026,readable_ptr_count:1,methodology:'Test'}};
 try{
  assert.equal((await post({action:'begin',runId:'test',manifest},'wrong')).status,401);
  assert.equal((await post({action:'begin',runId:'test',manifest})).status,200);
  assert.equal((await post({action:'publish',runId:'test'})).status,409);
  assert.equal(db.prepare('SELECT count(*) n FROM dataset_imports').get().n,0);
  const row={id:'t',member_id:'m',ticker:'TEST',instrument:'Stock',direction:'Long',action:'P',transaction_date:'2024-01-02',filing_id:'f',payload:'{}'};
  const data={members:[{id:'m',name:'Member',state_district:'CA',indexed_filing_count:1}],transactions:[row],filings:[{doc_id:'f',member_id:'m',filing_type:'P',filing_year:2024,filed_at:'2024-01-04',source_index_url:'https://disclosures-clerk.house.gov/',source_pdf_url:'https://disclosures-clerk.house.gov/f.pdf',discovered_at:'2024-01-05'}],prices:[['TEST','2024-01-02',100],['SPY','2024-01-02',200]]};
  for(const[kind,rows]of Object.entries(data))assert.equal((await post({action:'chunk',runId:'test',kind,index:0,rows})).status,200);
  assert.equal((await post({action:'chunk',runId:'test',kind:'prices',index:0,rows:data.prices})).status,200);
  assert.equal((await post({action:'publish',runId:'test'})).status,200);
  assert.equal(db.prepare('SELECT count(*) n FROM transactions').get().n,1);
  assert.equal((await post({action:'publish',runId:'test'})).status,200);
  const imported=db.prepare('SELECT imported_at FROM dataset_imports').get().imported_at;
  const next={...manifest,meta:{...manifest.meta,source_generated_at:'2026-09-16T12:00:00Z'}};
  assert.equal((await post({action:'begin',runId:'next',manifest:next,baseImportedAt:'wrong'})).status,409);
  assert.equal((await post({action:'begin',runId:'next',manifest:next,baseImportedAt:imported})).status,200);
  for(const[kind,rows]of Object.entries({...data,prices:[['TEST','2024-01-02',150],['SPY','2024-01-02',200]]}))assert.equal((await post({action:'chunk',runId:'next',kind,index:0,rows})).status,200);
  assert.equal(db.prepare("SELECT adjusted_close n FROM price_history WHERE ticker='TEST'").get().n,100,'staged data stays invisible');
  assert.equal((await post({action:'publish',runId:'next'})).status,200);
  assert.equal(db.prepare("SELECT adjusted_close n FROM price_history WHERE ticker='TEST'").get().n,150);
 } finally {db.close();delete globalThis.__capitolTestEnv;}
});
