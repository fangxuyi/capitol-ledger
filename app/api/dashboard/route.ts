import { getDashboardData } from '../../../db/analytics';
import { getChatGPTUser } from '../../chatgpt-auth';
export async function GET() {
  if (!await getChatGPTUser()) return Response.json({ error:'Sign in to continue.' },{status:401});
  try { return Response.json(await getDashboardData(),{headers:{'Cache-Control':'no-store'}}); }
  catch (error) { console.error(error); return Response.json({error:'Database unavailable. Retry after database setup or recovery.'},{status:503}); }
}
