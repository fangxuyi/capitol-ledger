import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
const exec=promisify(execFile),root=process.cwd();
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());
const run=`${root}/work/daily-runs/${date}`;
await fs.mkdir(run,{recursive:true});
const key=(await exec('/usr/bin/security',['find-generic-password','-s','capitol-ledger-ingest','-a','openclaw','-w'])).stdout.trim();
const response=await fetch('https://capitol-ledger.yeefangxu.chatgpt.site/api/ingest',{headers:{'x-capitol-import-key':key}});
if(!response.ok)throw Error('Cannot read production watchlist');
const live=await response.json();
const ids=new Set(live.trackedMembers.filter(r=>r.active).map(r=>r.id));
await fs.writeFile(`${run}/preferences-before.json`,JSON.stringify({tracked:live.trackedMembers,rules:live.alertRules}));
const baseline=JSON.parse(await fs.readFile(`${root}/work/pelosi-disclosure-monitor-state.json`));
const prior=new Map(baseline.records.map(r=>[r.sourceUrl,r]));
const successful=JSON.parse(await fs.readFile(`${root}/work/capitol-ledger-daily-state.json`));
if(successful.originalsAuditPath){
 for(const record of JSON.parse(await fs.readFile(successful.originalsAuditPath))) {
  if(record.sha256&&!record.error)prior.set(record.sourceUrl,record);
 }
}
const rows=[];
for(let year=2013;year<=new Date().getUTCFullYear();year++){
 const {stdout}=await exec('/usr/bin/curl',['-fsSL','--max-time','45',`https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`],{encoding:'buffer',maxBuffer:20000000});
 const zip=unzipSync(stdout),name=Object.keys(zip).find(n=>n.endsWith('.txt'));if(!name)throw Error(`Missing index ${year}`);
 for(const line of strFromU8(zip[name]).split(/\r?\n/).slice(1)){
  const f=line.split('\t').map(x=>x.trim());if(f.length<9)continue;
  const memberId=`${f[2].split(/\s+/)[0]}-${f[1]}`.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const sourceUrl=`https://disclosures-clerk.house.gov/public_disc/${f[4]==='P'?'ptr-pdfs':'financial-pdfs'}/${year}/${f[8]}.pdf`;
  rows.push({year,memberId,filingId:f[8],filingType:f[4],filingDate:f[7],sourceUrl,indexRow:line});
 }
}
await fs.writeFile(`${run}/indexes.json`,JSON.stringify(rows));
// Check all current-year PTR originals, all existing Pelosi hash baselines,
// and tracked members' recent annual reports. Historical indexes are retained in full.
const candidates=rows.filter(r=>(r.year===new Date().getUTCFullYear()&&r.filingType==='P')||prior.has(r.sourceUrl)||(ids.has(r.memberId)&&Date.parse(r.filingDate)>=Date.parse('2025-01-01')));
await fs.mkdir(`${run}/pdfs`,{recursive:true});await fs.mkdir(`${run}/texts`,{recursive:true});
const results=[];let cursor=0;
async function worker(){while(cursor<candidates.length){const r=candidates[cursor++];const path=`${run}/pdfs/${r.year}-${r.filingId}.pdf`;try{
 await exec('/usr/bin/curl',['-fsSL','--max-time','40',r.sourceUrl,'-o',path]);const pdf=await fs.readFile(path);if(pdf.subarray(0,5).toString()!=='%PDF-')throw Error('Not a PDF');
 const sha256=createHash('sha256').update(pdf).digest('hex');const previous=prior.get(r.sourceUrl);const out={...r,sha256,pdfHashChanged:previous?previous.sha256!==sha256:false,pelosiHashChanged:r.memberId==='nancy-pelosi'&&previous?previous.sha256!==sha256:false};
 if(r.filingType==='P') {const {stdout:text}=await exec('/Users/openclaw/.local/share/capitol-tools/bin/pdftotext',['-layout',path,'-'],{maxBuffer:10000000});await fs.writeFile(`${run}/texts/${r.year}-${r.filingId}.txt`,text);let cached=null;try{cached=await fs.readFile(`${root}/work/house-ptrs/${r.year}-${r.filingId}.txt`,'utf8')}catch{};out.cachedTextChanged=cached!==null&&text!==cached;out.readable=text.trim().length>=200;
 if(out.cachedTextChanged&&out.readable){await fs.writeFile(`${run}/texts/${r.year}-${r.filingId}.previous.txt`,cached);await fs.writeFile(`${root}/work/house-ptrs/${r.year}-${r.filingId}.txt`,text);}
 if(out.cachedTextChanged&&!out.readable)throw Error('Previously readable filing became unreadable');}
 results.push(out);
 }catch(e){results.push({...r,error:e.message.slice(0,250)});}}
}
await Promise.all(Array.from({length:8},worker));
await fs.writeFile(`${run}/originals-audit.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify({indexRows:rows.length,originals:results.length,errors:results.filter(r=>r.error).length,changed:results.filter(r=>r.pelosiHashChanged||r.cachedTextChanged).map(r=>({year:r.year,id:r.filingId,member:r.memberId,hash:r.pelosiHashChanged,text:r.cachedTextChanged}))}));

if(results.some(r=>r.error))throw Error('Original filing audit failed; do not publish this run');
