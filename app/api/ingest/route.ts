import { env } from 'cloudflare:workers';
import { getDashboardData, getMemberDetails } from '../../../db/analytics';

type Kind = 'members'|'transactions'|'filings'|'prices'|'quality';
type Manifest = {chunks:Record<Kind,number>;counts:Record<Kind,number>;priceTotal:number;meta:{source_generated_at:string;source_start_year:number;source_end_year:number;readable_ptr_count:number;methodology:string}};
type Run = {id:string;base_imported_at:string|null;seed:number;status:string;manifest:string};
const kinds: Kind[]=['members','transactions','filings','prices','quality'];
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function authorized(request:Request) {
  const secret=(env as unknown as {CAPITOL_INGEST_KEY?:string}).CAPITOL_INGEST_KEY;
  const provided=request.headers.get('x-capitol-import-key');
  if (!secret || !provided) return false;
  const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [a,b]=await Promise.all([digest(secret),digest(provided)]);
  return a.reduce((diff,value,i)=>diff|(value^b[i]),0)===0;
}
const priceSQL=(source:string)=>`INSERT INTO price_history(ticker,date,adjusted_close)
 SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') FROM json_each(${source}) WHERE 1
 ON CONFLICT(ticker,date) DO UPDATE SET adjusted_close=excluded.adjusted_close`;
export async function GET(request:Request) {
  if (!await authorized(request)) return reply({error:'Unauthorized'},401);
  const query=new URL(request.url).searchParams;
  if (query.get('view')==='dashboard') return reply(await getDashboardData());
  if (query.get('member')) return reply(await getMemberDetails(query.get('member')!));
  const db=env.DB;
  const [imports,runs,tracked,rules]=await db.batch([db.prepare('SELECT * FROM dataset_imports'),db.prepare("SELECT id,status,created_at,published_at FROM ingestion_runs ORDER BY created_at DESC LIMIT 5"),db.prepare('SELECT * FROM tracked_members ORDER BY id'),db.prepare('SELECT * FROM alert_rules ORDER BY id')]);
  return reply({import:imports.results[0]??null,runs:runs.results,trackedMembers:tracked.results,alertRules:rules.results});
}
export async function POST(request:Request) {
  if (!await authorized(request)) return reply({error:'Unauthorized'},401);
  const db=env.DB;
  try {
    const text=await request.text();
    if (text.length>1_800_000) return reply({error:'Chunk too large'},413);
    const body=JSON.parse(text);
    if (typeof body.runId!=='string'||!/^[-a-zA-Z0-9_.:]{1,100}$/.test(body.runId)) return reply({error:'Invalid run ID'},400);
    const run=await db.prepare('SELECT * FROM ingestion_runs WHERE id=?').bind(body.runId).first<Run>();
    if (body.action==='begin') {
      if (run) return reply({id:run.id,status:run.status,seed:!!run.seed});
      const manifest=body.manifest as Manifest;
      if (!manifest || kinds.some(k=>!Number.isInteger(manifest.counts?.[k])||manifest.counts[k]<0||!Number.isInteger(manifest.chunks?.[k])||manifest.chunks[k]<0)
        ||!manifest.counts.members||!manifest.counts.transactions||!manifest.priceTotal||!manifest.meta?.source_generated_at) return reply({error:'Invalid manifest'},400);
      const current=await db.prepare('SELECT imported_at,source_generated_at FROM dataset_imports WHERE id=1').first<{imported_at:string;source_generated_at:string}>();
      if ((current?.imported_at??null)!==(body.baseImportedAt??null)) return reply({error:'Base dataset changed; regenerate upload'},409);
      if (current && manifest.meta.source_generated_at<current.source_generated_at) return reply({error:'Refusing older source data'},409);
      await db.prepare("INSERT INTO ingestion_runs(id,base_imported_at,seed,status,manifest) VALUES (?,?,?,'staging',?)")
        .bind(body.runId,current?.imported_at??null,current?0:1,JSON.stringify(manifest)).run();
      return reply({id:body.runId,status:'staging',seed:!current});
    }
    if (!run) return reply({error:'Unknown import'},404);
    if (run.status==='published' && body.action==='publish') return reply({status:'published',id:run.id});
    if (run.status==='published' && body.action==='cleanup') {
      await db.prepare('DELETE FROM ingestion_chunks WHERE run_id=?').bind(run.id).run();
      return reply({cleaned:true,id:run.id});
    }
    if (run.status!=='staging') return reply({error:'Import is not staging'},409);
    const manifest=JSON.parse(run.manifest) as Manifest;
    if (body.action==='chunk') {
      const kind=body.kind as Kind;
      if (!kinds.includes(kind)||!Number.isInteger(body.index)||body.index<0||body.index>=manifest.chunks[kind]||!Array.isArray(body.rows)||!body.rows.length) return reply({error:'Invalid chunk'},400);
      if (kind==='prices' && body.rows.some((r:unknown[])=>!Array.isArray(r)||r.length!==3||typeof r[0]!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(String(r[1]))||typeof r[2]!=='number'||!Number.isFinite(r[2])||r[2]<=0)) return reply({error:'Invalid prices'},400);
      const payload=JSON.stringify(body.rows);
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload))),b=>b.toString(16).padStart(2,'0')).join('');
      const existing=await db.prepare('SELECT sha256 FROM ingestion_chunks WHERE run_id=? AND kind=? AND chunk_index=?').bind(run.id,kind,body.index).first<{sha256:string}>();
      if (existing) return existing.sha256===hash?reply({received:true,reused:true}):reply({error:'Chunk content mismatch'},409);
      const statements=[];
      // Initial backfill is invisible to the old site. Later runs stage every change.
      if (kind==='prices'&&run.seed) {
        if (await db.prepare('SELECT 1 FROM dataset_imports LIMIT 1').first()) return reply({error:'Seed already activated'},409);
        statements.push(db.prepare(priceSQL('?')).bind(payload));
      }
      statements.push(db.prepare('INSERT INTO ingestion_chunks VALUES (?,?,?,?,?,?)').bind(run.id,kind,body.index,body.rows.length,hash,kind==='prices'&&run.seed?'[]':payload));
      await db.batch(statements);
      return reply({received:true,rows:body.rows.length});
    }
    if (body.action==='publish') {
      const received=await db.prepare('SELECT kind,COUNT(*) AS chunks,SUM(row_count) AS rows FROM ingestion_chunks WHERE run_id=? GROUP BY kind').bind(run.id).all<{kind:Kind;chunks:number;rows:number}>();
      for (const kind of kinds) {
        const got=received.results.find(r=>r.kind===kind);
        if ((got?.chunks??0)!==manifest.chunks[kind]||(got?.rows??0)!==manifest.counts[kind]) return reply({error:`Incomplete ${kind} upload`},409);
      }
      const current=await db.prepare('SELECT imported_at FROM dataset_imports WHERE id=1').first<{imported_at:string}>();
      if ((current?.imported_at??null)!==run.base_imported_at) return reply({error:'Base dataset changed'},409);
      if (run.seed) {
        const seedCounts=await db.prepare("SELECT COUNT(*) AS count,MAX(CASE WHEN ticker='SPY' THEN date END) AS spy FROM price_history").first<{count:number;spy:string|null}>();
        if (seedCounts?.count!==manifest.priceTotal||!seedCounts.spy) return reply({error:'Seed price coverage does not match manifest'},409);
      }
      const counts=await db.prepare("SELECT (SELECT COUNT(*) FROM transactions) AS transactions,(SELECT MAX(date) FROM price_history WHERE ticker='SPY') AS priceDate").first<{transactions:number;priceDate:string|null}>();
      if (counts && manifest.counts.transactions<counts.transactions*0.95) return reply({error:'Transaction count dropped over 5%; investigate before importing'},409);
      const chunks=await db.prepare('SELECT kind,chunk_index FROM ingestion_chunks WHERE run_id=? ORDER BY kind,chunk_index').bind(run.id).all<{kind:Kind;chunk_index:number}>();
      const source='(SELECT payload FROM ingestion_chunks WHERE run_id=? AND kind=? AND chunk_index=?)';
      const sql:Record<Kind,string>={
        members:`INSERT INTO research_members SELECT json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.state_district'),json_extract(value,'$.indexed_filing_count') FROM json_each(${source}) WHERE 1 ON CONFLICT(id) DO UPDATE SET name=excluded.name,state_district=excluded.state_district,indexed_filing_count=excluded.indexed_filing_count`,
        transactions:`INSERT INTO transactions SELECT json_extract(value,'$.id'),json_extract(value,'$.member_id'),json_extract(value,'$.ticker'),json_extract(value,'$.instrument'),json_extract(value,'$.direction'),json_extract(value,'$.action'),json_extract(value,'$.close_kind'),json_extract(value,'$.expiration_date'),json_extract(value,'$.strike'),json_extract(value,'$.transaction_date'),json_extract(value,'$.filing_id'),json_extract(value,'$.payload') FROM json_each(${source})`,
        filings:`INSERT INTO filings SELECT json_extract(value,'$.doc_id'),json_extract(value,'$.member_id'),json_extract(value,'$.filing_type'),json_extract(value,'$.filing_year'),json_extract(value,'$.filed_at'),json_extract(value,'$.source_index_url'),json_extract(value,'$.source_pdf_url'),json_extract(value,'$.discovered_at') FROM json_each(${source}) WHERE 1 ON CONFLICT(doc_id) DO UPDATE SET member_id=excluded.member_id,filed_at=excluded.filed_at,source_pdf_url=excluded.source_pdf_url`,
        prices:priceSQL(source),
        quality:`INSERT INTO price_exclusions SELECT json_extract(value,'$.ticker'),json_extract(value,'$.reason'),json_extract(value,'$.checked_at'),json_extract(value,'$.last_good_price_date') FROM json_each(${source})`,
      };
      const statements=[db.prepare('DELETE FROM transactions'),db.prepare('DELETE FROM price_exclusions')];
      for (const kind of kinds) for (const chunk of chunks.results.filter(c=>c.kind===kind)) {
        if (kind==='prices'&&run.seed) continue;
        statements.push(db.prepare(sql[kind]).bind(run.id,kind,chunk.chunk_index));
      }
      const meta=manifest.meta,now=new Date().toISOString();
      statements.push(db.prepare(`INSERT INTO dataset_imports VALUES(1,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET imported_at=excluded.imported_at,source_generated_at=excluded.source_generated_at,source_start_year=excluded.source_start_year,source_end_year=excluded.source_end_year,readable_ptr_count=excluded.readable_ptr_count,methodology=excluded.methodology`)
        .bind(now,meta.source_generated_at,meta.source_start_year,meta.source_end_year,meta.readable_ptr_count,meta.methodology));
      statements.push(db.prepare("UPDATE ingestion_runs SET status='published',published_at=? WHERE id=?").bind(now,run.id));
      await db.batch(statements);
      return reply({status:'published',id:run.id,importedAt:now});
    }
    return reply({error:'Unknown action'},400);
  } catch(error) { console.error(error);return reply({error:error instanceof Error?error.message:'Import failed'},500); }
}
