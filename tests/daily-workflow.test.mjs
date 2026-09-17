import test from 'node:test';
import assert from 'node:assert/strict';
import {runStages} from '../scripts/daily-workflow.mjs';
import {compareSnapshots} from '../scripts/daily-report.mjs';

test('a failed stage blocks publication, and resume preserves completed stages',async()=>{
 const journal={steps:{}},calls=[],stages=['backup','before','refresh','publish','after'].map(name=>({name}));
 await assert.rejects(runStages(stages,journal,{save:async()=>{},execute:async s=>{calls.push(s.name);if(s.name==='refresh')throw Error('provider down');}}),/provider down/);
 assert.deepEqual(calls,['backup','before','refresh']);assert.equal(journal.status,'failed');
 calls.length=0;
 await runStages(stages,journal,{save:async()=>{},execute:async s=>calls.push(s.name)});
 assert.deepEqual(calls,['refresh','publish','after']);assert.equal(journal.status,'verified');
 calls.length=0;await runStages(stages,journal,{save:async()=>{},execute:async s=>calls.push(s.name)});assert.deepEqual(calls,[]);
});
const snapshot=(excess,status='Open · latest mark')=>({status:{trackedMembers:[{id:'m'}],alertRules:[]},dashboard:{members:[{id:'m',name:'Member',scoredCount:12,openCount:1,averageExcess:excess}],tracked:[{id:'m',name:'Member'}],meta:{methodology:'same',priceUnavailableSymbols:[]}},details:{m:{episodes:[{id:'episode',memberId:'m',ticker:'ABC',owner:'SP',transactionDate:'2026-01-01',filingId:'f',status}]}}});
test('lost price coverage is not a disclosed position closure and null is not zero',()=>{
 const result=compareSnapshots(snapshot(4),snapshot(null,'No price match'));
 assert.equal(result.tracked[0].closed.length,0);assert.equal(result.tracked[0].excessChange,null);assert.equal(result.emailRequired,false);
});
test('two-point changes and new tracked disclosures trigger the email gate',()=>{
 assert.equal(compareSnapshots(snapshot(4),snapshot(6)).emailRequired,true);
 assert.equal(compareSnapshots(snapshot(4),snapshot(4),{added:[{memberId:'m',sourceUrl:'https://disclosures-clerk.house.gov/f.pdf'}],changed:[]}).emailRequired,true);
});
test('a confirmed closed episode triggers notification; changed preferences block completion',()=>{
 assert.equal(compareSnapshots(snapshot(4),snapshot(4,'Closed')).tracked[0].closed.length,1);
 const after=snapshot(4);after.status.alertRules=[{id:'changed'}];assert.throws(()=>compareSnapshots(snapshot(4),after),/preferences changed/);
});
