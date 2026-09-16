import { strFromU8, unzipSync } from "fflate";
import { getDb } from "../../../db";
import { filings, syncRuns, trackedMembers } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

type ClerkRow = {
  firstName: string;
  lastName: string;
  filingType: string;
  stateDistrict: string;
  filingYear: number;
  filingDate: string;
  docId: string;
  sourceIndexUrl: string;
  sourcePdfUrl: string;
};

function pdfUrl(year: number, filingType: string, docId: string) {
  const folder = filingType === "P" ? "ptr-pdfs" : "financial-pdfs";
  return `https://disclosures-clerk.house.gov/public_disc/${folder}/${year}/${docId}.pdf`;
}

function parseIndex(text: string, year: number, sourceIndexUrl: string, firstName: string, lastName: string): ClerkRow[] {
  return text.split(/\r?\n/).slice(1).flatMap((line) => {
    const fields = line.split("\t");
    if (fields.length < 9) return [];
    const [, rowLast, rowFirst, , filingType, stateDistrict, filingYear, filingDate, docId] = fields.map((value) => value.trim());
    if (rowLast.toLowerCase() !== lastName.toLowerCase()) return [];
    if (firstName && !rowFirst.toLowerCase().includes(firstName.toLowerCase())) return [];
    const reportYear = Number(filingYear || year);
    return [{ firstName: rowFirst, lastName: rowLast, filingType, stateDistrict, filingYear: reportYear, filingDate, docId, sourceIndexUrl, sourcePdfUrl: pdfUrl(year, filingType, docId) }];
  });
}

export async function POST(request: Request) {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in with ChatGPT to continue." }, { status: 401 });
  let body: { memberId?: string; firstName?: string; lastName?: string; years?: number[] };
  try { body = await request.json(); } catch { return Response.json({error:"Invalid JSON."},{status:400}); }
  if (!body || typeof body.memberId!=="string" || typeof body.lastName!=="string" || (body.firstName!==undefined && typeof body.firstName!=="string") || (body.years!==undefined && (!Array.isArray(body.years) || body.years.some((year) => !Number.isInteger(year))))) return Response.json({error:"Invalid sync request."},{status:400});
  const memberId = body.memberId?.trim();
  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim();
  const years = (body.years?.length ? body.years : [new Date().getUTCFullYear()]).filter((year) => year >= 2008 && year <= new Date().getUTCFullYear());
  if (!memberId || !lastName || years.length > 4) return Response.json({ error: "A member and up to four valid years are required." }, { status: 400 });

  const runId = crypto.randomUUID();
  const found: ClerkRow[] = [];
  try {
    for (const year of years) {
      const sourceIndexUrl = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`;
      const response = await fetch(sourceIndexUrl, { signal: AbortSignal.timeout(30000), headers: { "user-agent": "Capitol-Ledger/1.0 disclosure-monitor" } });
      if (!response.ok) throw new Error(`Clerk index returned ${response.status} for ${year}`);
      const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
      const file = archive[`${year}FD.txt`];
      if (!file) throw new Error(`The ${year} Clerk index did not contain its TSV file.`);
      found.push(...parseIndex(strFromU8(file), year, sourceIndexUrl, firstName, lastName));
    }

    const db = getDb();
    const writes = found.map((row) => db.insert(filings).values({ docId: row.docId, memberId, filingType: row.filingType, filingYear: row.filingYear, filedAt: row.filingDate, sourceIndexUrl: row.sourceIndexUrl, sourcePdfUrl: row.sourcePdfUrl }).onConflictDoNothing());
    // D1 batches are atomic: never mark a sync completed if its filing writes failed.
    await db.batch([
      db.insert(trackedMembers).values({ id: memberId, firstName: firstName || found[0]?.firstName || "Unknown", lastName, displayName: `${firstName} ${lastName}`.trim(), stateDistrict: found[0]?.stateDistrict }).onConflictDoNothing(),
      ...writes,
      db.insert(syncRuns).values({ id: runId, memberId, status: "completed", filingCount: found.length, completedAt: new Date().toISOString() }),
    ]);

    return Response.json({ runId, status: "completed", filings: found, filingCount: found.length, source: "Office of the Clerk, U.S. House of Representatives" });
  } catch (error) {
    return Response.json({ runId, status: "failed", error: error instanceof Error ? error.message : "Official source check failed." }, { status: 502 });
  }
}
