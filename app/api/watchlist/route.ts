import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { trackedMembers } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in with ChatGPT to continue." }, { status: 401 });
  try {
    const members = await getDb().select().from(trackedMembers).orderBy(asc(trackedMembers.displayName));
    return Response.json({ members });
  } catch {
    return Response.json({ members: [], storage: "initializing" });
  }
}

export async function POST(request: Request) {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in with ChatGPT to continue." }, { status: 401 });
  const body = await request.json() as { id?: string; firstName?: string; lastName?: string; displayName?: string; district?: string };
  if (!body.id || !body.firstName || !body.lastName || !body.displayName) {
    return Response.json({ error: "Member identity is incomplete." }, { status: 400 });
  }
  try {
    const [saved] = await getDb().insert(trackedMembers).values({
      id: body.id,
      firstName: body.firstName,
      lastName: body.lastName,
      displayName: body.displayName,
      stateDistrict: body.district,
    }).onConflictDoUpdate({
      target: trackedMembers.id,
      set: { displayName: body.displayName, stateDistrict: body.district, active: true },
    }).returning();
    return Response.json({ member: saved }, { status: 201 });
  } catch {
    return Response.json({ member: body, storage: "initializing" }, { status: 202 });
  }
}
