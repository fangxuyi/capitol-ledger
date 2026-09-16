import assert from 'node:assert/strict';
import test from 'node:test';
import { openLocalDatabase } from '../scripts/local-db.mjs';
const base=process.env.CAPITOL_TEST_URL;
test('HTTP APIs reflect committed database changes and persist preferences', {skip:!base}, async () => {
  const {db}=await openLocalDatabase();
  const id=`test-${crypto.randomUUID()}`;
  const ticker=`TEST${Date.now()}`;
  const json=async (path,body)=> {
    const response=await fetch(`${base}${path}`,body ? {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)} : {});
    assert.ok(response.ok,`${path}: ${response.status}`); return response.json();
  };
  try {
    db.prepare('INSERT INTO research_members VALUES (?,?,?,?)').run(id,'Database Test','TEST',1);
    const row={id,memberId:id,ticker,assetName:'Test',instrument:'Stock',direction:'Long',owner:'SP',action:'P',closeKind:null,expirationDate:null,strike:null,amount:'Test',transactionDate:'2024-01-02',filingDate:'2024-01-02',filingId:id,sourceUrl:'https://example.com/test'};
    db.prepare('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id,id,ticker,'Stock','Long','P',null,null,null,'2024-01-02',id,JSON.stringify(row));
    const price=db.prepare('INSERT INTO price_history VALUES (?,?,?)'); price.run(ticker,'2024-01-02',100); price.run(ticker,'2024-01-03',120);
    assert.equal((await json(`/api/members/${id}`)).episodes[0].returnValue,20);
    db.prepare('UPDATE price_history SET adjusted_close=150 WHERE ticker=? AND date=?').run(ticker,'2024-01-03');
    assert.equal((await json(`/api/members/${id}`)).episodes[0].returnValue,50);
    assert.equal((await json('/api/dashboard')).members.find((member)=>member.id===id).averageReturn,50);
    await json('/api/watchlist',{id});
    assert.ok((await json('/api/watchlist')).members.some((member)=>member.id===id));
    await json('/api/alert-rules',{memberId:id,ruleType:'one-million',enabled:true,thresholdCents:50000000});
    const rule=(await json(`/api/alert-rules?memberId=${id}`)).rules[0];
    assert.equal(rule.enabled,true); assert.equal(rule.thresholdCents,50000000);
    const invalid=await fetch(`${base}/api/alert-rules`,{method:'POST',headers:{'content-type':'application/json'},body:'{' });
    assert.equal(invalid.status,400);
  } finally {
    db.prepare('DELETE FROM alert_rules WHERE member_id=?').run(id);
    db.prepare('DELETE FROM tracked_members WHERE id=?').run(id);
    db.prepare('DELETE FROM transactions WHERE member_id=?').run(id);
    db.prepare('DELETE FROM research_members WHERE id=?').run(id);
    db.prepare('DELETE FROM price_history WHERE ticker=?').run(ticker);
    db.close();
  }
});
