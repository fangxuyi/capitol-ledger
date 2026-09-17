import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import {openLocalDatabase} from './local-db.mjs';
const before=process.argv.includes('--before');
const key=execFileSync('/usr/bin/security',['find-generic-password','-s','capitol-ledger-ingest','-a','openclaw','-w'],{encoding:'utf8'}).trim();
const get=async(query='')=>{const response=await fetch(`https://capitol-ledger.yeefangxu.chatgpt.site/api/ingest${query}`,{headers:{'x-capitol-import-key':key},signal:AbortSignal.timeout(120000)});assert.ok(response.ok,`Hosted API ${response.status}`);return response.json();};
if(before)await copyFile('work/hosted-database.sqlite','work/baseline-verification.sqlite');
const db=before?new DatabaseSync('work/baseline-verification.sqlite'):(await openLocalDatabase()).db;
if(before&&!db.prepare("SELECT 1 FROM sqlite_master WHERE name='price_exclusions'").get())db.exec(await readFile('drizzle/0005_price_quality.sql','utf8'));
try {
 const status=await get(),dashboard=await get('?view=dashboard');
 const localImport=db.prepare('SELECT * FROM dataset_imports').get();
 assert.equal(dashboard.meta.generatedAt,localImport.source_generated_at);
 assert.equal(dashboard.meta.transactionCount,db.prepare('SELECT COUNT(*) n FROM transactions').get().n);
 assert.equal(dashboard.meta.benchmarkPriceAsOf,db.prepare("SELECT MAX(date) d FROM price_history WHERE ticker='SPY'").get().d);
 const local=db.prepare('SELECT * FROM performance_episodes').all();
 const numeric=value=>value===0?0:value;
 const localMembers=db.prepare('SELECT id FROM research_members').all().map(r=>r.id).sort();
 assert.deepEqual(dashboard.members.map(r=>r.id).sort(),localMembers,'Member coverage mismatch');
 assert.equal(dashboard.meta.episodeCount,local.length);
 assert.equal(dashboard.meta.scoredEpisodeCount,local.filter(e=>e.return_value!==null).length);
 for(const member of dashboard.members){
  const all=local.filter(e=>e.member_id===member.id),rows=all.filter(e=>e.return_value!==null);
  const average=field=>rows.length?numeric(Math.round(rows.reduce((s,e)=>s+e[field],0)/rows.length*10)/10):null;
  assert.equal(member.selectionCount,all.length);assert.equal(member.scoredCount,rows.length);
  assert.equal(member.averageExcess,average('excess_return'));assert.equal(member.averageReturn,average('return_value'));
  assert.equal(member.openCount,all.filter(e=>e.status.includes('latest mark')).length);
  assert.equal(member.closedCount,all.filter(e=>['Closed','Expiry inferred'].includes(e.status)).length);
  assert.equal(member.hitRate,rows.length?Math.round(rows.filter(e=>e.return_value>0).length/rows.length*1000)/10:null);
 }
 const details={};
 for(const member of dashboard.tracked){
  const data=await get(`?member=${encodeURIComponent(member.id)}`);
  const expectedTransactions=db.prepare('SELECT payload FROM transactions WHERE member_id=? ORDER BY transaction_date DESC,id').all(member.id).map(r=>JSON.parse(r.payload));
  assert.deepEqual(data.transactions,expectedTransactions,`${member.id}: transaction values differ`);
  const episodes=local.filter(e=>e.member_id===member.id);assert.equal(data.episodes.length,episodes.length);
  const byId=new Map(episodes.map(e=>[e.id,e]));
  for(const row of data.episodes){const expected=byId.get(row.id);assert.ok(expected);assert.deepEqual(row,JSON.parse(JSON.stringify({...JSON.parse(expected.payload),closeDate:expected.close_date,status:expected.status,periodDays:expected.period_days,returnValue:expected.return_value,benchmarkReturn:expected.benchmark_return,excessReturn:expected.excess_return})),`${member.id}: episode values differ`);}
  details[member.id]=data;
 }
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());
 const directory=`work/daily-runs/${day}`;await mkdir(directory,{recursive:true});
 if(!before){const previous=JSON.parse(await readFile(`${directory}/api-before.json`,'utf8'));const ordered=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(ordered(status.trackedMembers),ordered(previous.status.trackedMembers),'Watchlist changed during import');assert.deepEqual(ordered(status.alertRules),ordered(previous.status.alertRules),'Alert rules changed during import');}
 await writeFile(`${directory}/api-${before?'before':'after'}.json`,JSON.stringify({verifiedAt:new Date().toISOString(),status,dashboard,details}));
 console.log(JSON.stringify({verified:true,meta:dashboard.meta,tracked:dashboard.tracked.length,memberSummaries:dashboard.members.length}));
}finally{db.close();}
