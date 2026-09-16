import { eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { trackedMembers } from '../../../db/schema';
import { database } from '../../../db/analytics';
import { getChatGPTUser } from '../../chatgpt-auth';
export async function GET() {
  if (!await getChatGPTUser()) return Response.json({error:'Sign in to continue.'},{status:401});
  try { return Response.json({members:await getDb().select().from(trackedMembers).where(eq(trackedMembers.active,true))},{headers:{'Cache-Control':'no-store'}}); }
  catch (error) { console.error(error); return Response.json({error:'Watchlist could not be loaded.'},{status:503}); }
}
export async function POST(request: Request) {
  if (!await getChatGPTUser()) return Response.json({error:'Sign in to continue.'},{status:401});
  let body: {id?:string};
  try { body = await request.json(); } catch { return Response.json({error:'Invalid JSON.'},{status:400}); }
  if (!body || typeof body.id!=='string' || !/^[a-z0-9-]+$/.test(body.id)) return Response.json({error:'A valid member ID is required.'},{status:400});
  try {
    const member = await database().prepare('SELECT * FROM research_members WHERE id=?').bind(body.id).first<{id:string;name:string;state_district:string}>();
    if (!member) return Response.json({error:'No indexed House member matches this ID.'},{status:404});
    const parts = member.name.split(' ');
    const [saved] = await getDb().insert(trackedMembers).values({id:member.id,firstName:parts[0],lastName:parts.slice(1).join(' ') || parts[0],displayName:member.name,stateDistrict:member.state_district})
      .onConflictDoUpdate({target:trackedMembers.id,set:{active:true}}).returning();
    return Response.json({member:saved},{status:201});
  } catch (error) { console.error(error); return Response.json({error:'Member was not saved.'},{status:503}); }
}
