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

import {parseHouseIndex,compareIndexes} from '../scripts/house-index.mjs';
test('historical columns and disclosure type produce stable filing identities',()=>{
 const modern='Prefix\tLast\tFirst\tSuffix\tFilingType\tStateDst\tYear\tFilingDate\tDocID\nHon.\tLangevin\tJames R.\t\tP\tRI02\t2013\t5/15/2013\t2001782';
 const historical='Prefix\tLast\tFirst\tSuffix\tFilingType\tStateDst\tYear\tFiling Year\tFilingDate\tDocID\tDisclosureType\nHONORABLE\tLANGEVIN\tJAMES R.\t\tO\tRI02\t2013\t2013\t5/15/2013\t2001782\tPTR';
 const before=parseHouseIndex(modern,2013),after=parseHouseIndex(historical,2013);
 assert.equal(after[0].filingId,'2001782');assert.equal(after[0].filingDate,'5/15/2013');assert.equal(after[0].filingType,'P');
 assert.deepEqual(compareIndexes(before,after),{added:[],changed:[]});
 assert.throws(()=>parseHouseIndex(modern.replace('DocID','Unknown'),2013),/missing column/);
 assert.throws(()=>parseHouseIndex(modern.replace('2001782','5/15/2013'),2013),/invalid DocID/);
 const changed=structuredClone(after);changed[0].filingDate='5/16/2013';assert.equal(compareIndexes(before,changed).changed.length,1);
});
test('blank official filing dates stay unknown and archive category changes are not amendments',()=>{
 const text='Prefix\tLast\tFirst\tSuffix\tFilingType\tStateDst\tYear\tFilingDate\tDocID\n\tPerson\tTest\t\tW\t\t2026\t\t9116303';
 const rows=parseHouseIndex(text,2026);assert.equal(rows[0].filingDate,'');
 const changed=structuredClone(rows);changed[0].filingType='O';assert.deepEqual(compareIndexes(rows,changed),{added:[],changed:[]});
});
