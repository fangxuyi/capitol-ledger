import { database } from '../../../db/analytics';
import { getChatGPTUser } from '../../chatgpt-auth';
export async function GET(request: Request) {
  if (!await getChatGPTUser()) return Response.json({error:'Sign in to continue.'},{status:401});
  try {
    const rows = (await database().prepare('SELECT * FROM performance_episodes ORDER BY member_id,transaction_date,id').all()).results;
    const format = new URL(request.url).searchParams.get('format');
    if (format !== 'csv') return Response.json({calculatedAt:new Date().toISOString(),episodes:rows},{headers:{'Cache-Control':'no-store','Content-Disposition':'attachment; filename="house-performance.json"'}});
    const fields = ['id','member_id','ticker','instrument','direction','transaction_date','close_date','status','period_days','return_value','benchmark_return','excess_return','entry_date','exit_date','entry_price','exit_price','benchmark_entry','benchmark_exit'];
    const cell = (value: unknown) => `"${String(value ?? '').replace(/^[=+@-]/,"'$&").replaceAll('"','""')}"`;
    return new Response([fields.join(','),...rows.map((row: Record<string,unknown>) => fields.map((field) => cell(row[field])).join(','))].join('\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="house-performance.csv"','Cache-Control':'no-store'}});
  } catch (error) { console.error(error); return Response.json({error:'Export unavailable.'},{status:503}); }
}
