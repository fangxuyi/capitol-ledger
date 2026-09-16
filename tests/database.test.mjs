import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
const schema = (await Promise.all(['0003_analytics.sql','0004_hosted_ingestion.sql','0005_price_quality.sql'].map(name=>readFile(new URL(`../drizzle/${name}`,import.meta.url),'utf8')))).join('\n');
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON'); db.exec(schema);
  db.prepare('INSERT INTO research_members VALUES (?,?,?,?)').run('member','Test Member','CA',1);
  for (const [ticker,date,price] of [['TEST','2024-01-02',100],['TEST','2024-01-03',120],['TEST','2024-01-04',150],['SPY','2024-01-02',200],['SPY','2024-01-03',210],['SPY','2024-01-04',220]]) db.prepare('INSERT INTO price_history VALUES (?,?,?)').run(ticker,date,price);
  function trade(id,action,date,{owner='SP',kind=null,direction='Long',instrument='Stock',expiration=null}={}) {
    const row={id,memberId:'member',ticker:'TEST',instrument,direction,action,transactionDate:date,owner};
    db.prepare('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id,'member','TEST',instrument,direction,action,kind,expiration,null,date,'filing',JSON.stringify(row));
  }
  return {db,trade};
}
test('returns recalculate directly after price and transaction changes, without rebuilding',() => {
  const {db,trade}=fixture();
  try {
    trade('buy','P','2024-01-02');
    const read=()=>db.prepare('SELECT * FROM performance_episodes').get();
    assert.equal(read().return_value,50); assert.equal(read().benchmark_return,10); assert.equal(read().excess_return,40);
    db.prepare("UPDATE price_history SET adjusted_close=180 WHERE ticker='TEST' AND date='2024-01-04'").run();
    assert.equal(read().return_value,80); assert.equal(read().excess_return,70);
    trade('sell','S','2024-01-03');
    assert.equal(read().return_value,20); assert.equal(read().status,'Closed'); assert.equal(read().period_days,1);
  } finally { db.close(); }
});
test('partial exits retain residuals, full exits start a new purchase cycle, owners remain separate',() => {
  const {db,trade}=fixture();
  try {
    trade('a','P','2024-01-02'); trade('b','S','2024-01-03',{kind:'partial'});
    assert.equal(db.prepare('SELECT status FROM performance_episodes').get().status,'Residual · latest mark');
    trade('c','S','2024-01-04'); trade('d','P','2024-01-05'); trade('e','P','2024-01-02',{owner:'JT'});
    const rows=db.prepare('SELECT * FROM performance_episodes ORDER BY id').all();
    assert.equal(rows.length,3); assert.equal(rows[0].status,'Closed');
    assert.equal(rows[1].return_value,null); assert.equal(rows[1].status,'No price match');
    assert.equal(rows[2].return_value,50);
  } finally { db.close(); }
});
test('purchased puts use short directional return and benchmark',() => {
  const {db,trade}=fixture();
  try {
    trade('put','P','2024-01-02',{direction:'Short',instrument:'Put',expiration:'2024-01-04'});
    const row=db.prepare('SELECT * FROM performance_episodes').get();
    assert.equal(row.return_value,-50); assert.equal(row.benchmark_return,-10); assert.equal(row.excess_return,-40); assert.equal(row.status,'Expiry inferred');
  } finally { db.close(); }
});
test('benchmark dates match the available security prices and missing prices stay unknown',() => {
  const {db,trade}=fixture();
  try {
    trade('a','P','2024-01-02');
    db.exec("DELETE FROM price_history WHERE ticker='TEST' AND date='2024-01-04'");
    const row=db.prepare('SELECT * FROM performance_episodes').get();
    assert.equal(row.close_date,'2024-01-03'); assert.equal(row.benchmark_return,5);
    db.exec("DELETE FROM price_history WHERE ticker='TEST'");
    assert.equal(db.prepare('SELECT return_value FROM performance_episodes').get().return_value,null);
    assert.throws(()=>db.prepare('INSERT INTO price_history VALUES (?,?,?)').run('TEST','2024-01-04',0));
  } finally { db.close(); }
});
test('dashboard runtime reads APIs, not archived static datasets',async () => {
  const dashboard=await readFile(new URL('../app/components/TrackerDashboard.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(dashboard,/house-performance\.generated|tracker-data|\/data\/members|\$23\.1M/);
  assert.match(dashboard,/\/api\/members/); assert.match(dashboard,/\/api\/dashboard/);
});
test('unavailable histories and entry prices years after purchase cannot produce ranked returns',()=>{
  const {db,trade}=fixture();
  try{
    trade('a','P','2024-01-02');
    db.prepare('INSERT INTO price_exclusions VALUES (?,?,?,?)').run('TEST','Source unavailable','2026-09-16','2024-01-04');
    assert.equal(db.prepare('SELECT return_value FROM performance_episodes').get().return_value,null);
    db.exec('DELETE FROM price_exclusions');
    assert.equal(db.prepare('SELECT return_value FROM performance_episodes').get().return_value,50);
    db.exec("UPDATE transactions SET transaction_date='2020-01-02'");
    assert.equal(db.prepare('SELECT return_value FROM performance_episodes').get().return_value,null);
  }finally{db.close();}
});
