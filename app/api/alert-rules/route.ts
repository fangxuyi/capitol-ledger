import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { alertRules } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(request: Request) {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in with ChatGPT to continue." }, { status: 401 });
  const memberId = new URL(request.url).searchParams.get("memberId") ?? "nancy-pelosi";
  try {
    const rules = await getDb().select().from(alertRules).where(eq(alertRules.memberId, memberId));
    return Response.json({ rules }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Saved rules could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in with ChatGPT to continue." }, { status: 401 });
  let body: { memberId?: string; ruleType?: string; enabled?: boolean; thresholdCents?: number | null };
  try { body = await request.json(); } catch { return Response.json({error:"Invalid JSON."},{status:400}); }
  if (!body || typeof body.memberId !== "string" || !/^[a-z0-9-]+$/.test(body.memberId) || !["new-filing","one-million","new-position","options","late"].includes(body.ruleType ?? "") || typeof body.enabled !== "boolean" || (body.thresholdCents != null && (!Number.isSafeInteger(body.thresholdCents) || body.thresholdCents < 0))) {
    return Response.json({ error: "memberId, ruleType, and enabled are required." }, { status: 400 });
  }
  try {
    const [rule] = await getDb().insert(alertRules).values({
      memberId: body.memberId,
      ruleType: body.ruleType!,
      enabled: body.enabled,
      thresholdCents: body.thresholdCents,
    }).onConflictDoUpdate({
      target: [alertRules.memberId, alertRules.ruleType],
      set: { enabled: body.enabled, thresholdCents: body.thresholdCents },
    }).returning();
    return Response.json({ rule });
  } catch {
    return Response.json({ error: "Rule was not saved." }, { status: 503 });
  }
}
