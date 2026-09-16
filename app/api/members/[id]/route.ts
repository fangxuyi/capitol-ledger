import { getMemberDetails } from '../../../../db/analytics';
import { getChatGPTUser } from '../../../chatgpt-auth';
export async function GET(_request: Request, { params }: { params: Promise<{id:string}> }) {
  if (!await getChatGPTUser()) return Response.json({error:'Sign in to continue.'},{status:401});
  const {id} = await params;
  if (!/^[a-z0-9-]+$/.test(id)) return Response.json({error:'Invalid member ID.'},{status:400});
  try { return Response.json(await getMemberDetails(id),{headers:{'Cache-Control':'no-store'}}); }
  catch (error) { console.error(error); return Response.json({error:'Member data could not be loaded.'},{status:503}); }
}
