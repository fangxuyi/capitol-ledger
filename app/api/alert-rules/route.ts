import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { alertRules } from "../../../db/schema";

export async function GET(request: Request) {
  const memberId = new URL(request.url).searchParams.get("memberId") ?? "nancy-pelosi";
  try {
    const rules = await getDb().select().from(alertRules).where(eq(alertRules.memberId, memberId));
    return Response.json({ rules });
  } catch {
    return Response.json({ rules: [], storage: "initializing" });
  }
}

export async function POST(request: Request) {
  const body = await request.json() as { memberId?: string; ruleType?: string; enabled?: boolean; thresholdCents?: number };
  if (!body.memberId || !body.ruleType || typeof body.enabled !== "boolean") {
    return Response.json({ error: "memberId, ruleType, and enabled are required." }, { status: 400 });
  }
  try {
    const [rule] = await getDb().insert(alertRules).values({
      memberId: body.memberId,
      ruleType: body.ruleType,
      enabled: body.enabled,
      thresholdCents: body.thresholdCents,
    }).onConflictDoUpdate({
      target: [alertRules.memberId, alertRules.ruleType],
      set: { enabled: body.enabled, thresholdCents: body.thresholdCents },
    }).returning();
    return Response.json({ rule });
  } catch {
    return Response.json({ rule: body, storage: "initializing" }, { status: 202 });
  }
}
