import fs from 'node:fs/promises';
import {compareIndexes} from './house-index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { runStages } from './daily-workflow.mjs';
import { compareSnapshots } from './daily-report.mjs';
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());
const dir=`work/daily-runs/${day}`,path=`${dir}/workflow.json`,lock='work/daily-update.lock';
await fs.mkdir(dir,{recursive:true});
try { await fs.mkdir(lock); } catch { throw Error('Another daily update may be running. Check work/daily-update.lock before retrying.'); }
const atomic=async(path,value)=>{await fs.writeFile(`${path}.tmp`,JSON.stringify(value,null,2)+'\n');await fs.rename(`${path}.tmp`,path);};
try {
  await fs.writeFile(`${lock}/owner.json`,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
  // Do not bulk-write the SQLite file while this project's preview owns it.
  // Never stop unrelated projects' servers automatically.
  let listeners='';try{listeners=execFileSync('/usr/sbin/lsof',['-nP','-iTCP','-sTCP:LISTEN','-Fp'],{encoding:'utf8'});}catch(error){if(error.status!==1)throw error;}
  for(const pid of new Set([...listeners.matchAll(/^p(\d+)$/gm)].map(m=>m[1]))){
    if(Number(pid)===process.pid)continue;
    let cwd='';try{cwd=execFileSync('/usr/sbin/lsof',['-a','-p',pid,'-d','cwd','-Fn'],{encoding:'utf8'});}catch{continue;}
    if(cwd.split('\n').includes(`n${process.cwd()}`))throw Error(`A server in this project is listening (PID ${pid}). Stop its preview before updating; other projects were not touched.`);
  }
  let journal;try{journal=JSON.parse(await fs.readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(journal && !process.argv.includes('--resume')) throw Error('A run already exists today. Inspect its journal, then use --resume; do not overwrite its before snapshot.');
  journal??={day,status:'pending',steps:{}};
  const stages=[{name:'backup',script:'db:backup'},{name:'before',script:'db:verify-hosted',args:['--before']},
    {name:'audit',script:'data:audit'},{name:'refresh',script:'data:refresh',args:['--quarantine-unavailable-prices']},
    {name:'verify',script:'data:verify'},{name:'publish',script:'db:publish'},{name:'after',script:'db:verify-hosted'},
    {name:'report'}];
  await runStages(stages,journal,{save:j=>atomic(path,j),execute:async(stage)=>{
    if(stage.name==='report'){
      const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
      const before=await read(`${dir}/api-before.json`),after=await read(`${dir}/api-after.json`);
      const prior=await read('work/capitol-ledger-daily-state.json');
      const indexes=await read(`${dir}/indexes.json`),previous=await read(prior.indexesPath);
      const source=compareIndexes(previous,indexes);
      const comparison=compareSnapshots(before,after,source,await read(`${dir}/originals-audit.json`));
      await atomic(`${dir}/index-comparison.json`,source);await atomic(`${dir}/comparison.json`,comparison);
      const published=await read('work/hosted-database-state.json');
      const timestamp=new Date().toISOString();
      const lines=[`Capitol Ledger — ${day}`,`Prices: ${comparison.from.benchmarkPriceAsOf} → ${comparison.to.benchmarkPriceAsOf}`,`House: ${comparison.to.filerCount} filers, ${comparison.to.ptrCount} PTRs, ${comparison.to.scoredEpisodeCount} scored episodes.`,
        ...comparison.tracked.map(m=>`${m.name}: excess ${m.excessBefore} → ${m.excessAfter}; rank ${m.rankBefore} → ${m.rankAfter}; scored ${m.scoredAfter}; newly reconstructed open episodes ${m.opened.length}, closed/expired ${m.closed.length}.`),
        `Unavailable price symbols: ${(comparison.to.priceUnavailableSymbols??[]).join(', ')||'none'}.`,
        `Coverage changes: added ${comparison.coverageChanges.added.join(', ')||'none'}; recovered ${comparison.coverageChanges.removed.join(', ')||'none'}.`,
        ...comparison.trackedDisclosures.map(r=>`Disclosure: ${r.memberId}, filed ${r.filingDate}: ${r.sourceUrl}`),
        'These are equal-weighted historical episode estimates, not portfolio P&L; positions are reconstructed, not verified brokerage balances.',
        'https://capitol-ledger.yeefangxu.chatgpt.site/'];
      await fs.writeFile(`${dir}/summary.txt`,lines.join('\n')+'\n');
      await atomic('work/capitol-ledger-daily-state.json',{...prior,lastAttemptAt:timestamp,lastAttemptStatus:'verified',consecutiveFailures:0,
        lastCheckedAt:journal.steps.audit.completedAt,lastRefreshedAt:after.dashboard.meta.generatedAt,lastImportedAt:published.importedAt,
        lastPublishedAt:published.importedAt,lastVerifiedAt:after.verifiedAt,lastRunId:published.runId,benchmarkPriceAsOf:after.dashboard.meta.benchmarkPriceAsOf,
        priceUnavailableSymbols:after.dashboard.meta.priceUnavailableSymbols,trackedMembers:after.dashboard.tracked.map(m=>m.id),
        comparisonPath:`${dir}/comparison.json`,summaryPath:`${dir}/summary.txt`,indexesPath:`${dir}/indexes.json`,originalsAuditPath:`${dir}/originals-audit.json`,
        lastSentEmail:prior.email?.status==='sent'?prior.email:prior.lastSentEmail,
        email:prior.email?.status==='sent'&&prior.email.snapshot===after.dashboard.meta.generatedAt?prior.email:{status:comparison.emailRequired?'pending':'not_required',snapshot:after.dashboard.meta.generatedAt}});
      console.log(JSON.stringify({verified:true,emailRequired:comparison.emailRequired,summary:`${dir}/summary.txt`}));return;
    }
    const stream=createWriteStream(`${dir}/${stage.name}.log`,{flags:'a'});
    try{await new Promise((resolve,reject)=>{const child=spawn('npm',['run',stage.script,...(stage.args?['--',...stage.args]:[])],{env:{...process.env,PATH:`/Users/openclaw/.local/share/capitol-tools/bin:${process.env.PATH}`},stdio:['ignore','pipe','pipe']});child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(`${stage.name} failed (${code}); inspect ${dir}/${stage.name}.log. Later steps were not run.`)));});}finally{stream.end();}
  }});
} finally { await fs.rm(lock,{recursive:true,force:true}); }
