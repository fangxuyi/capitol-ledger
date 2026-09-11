import { strFromU8, unzipSync } from "fflate";
import { getDb } from "../../../db";
import { filings, syncRuns, trackedMembers } from "../../../db/schema";

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
  const body = await request.json() as { memberId?: string; firstName?: string; lastName?: string; years?: number[] };
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
      const response = await fetch(sourceIndexUrl, { headers: { "user-agent": "Capitol-Ledger/1.0 disclosure-monitor" } });
      if (!response.ok) throw new Error(`Clerk index returned ${response.status} for ${year}`);
      const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
      const file = archive[`${year}FD.txt`];
      if (!file) throw new Error(`The ${year} Clerk index did not contain its TSV file.`);
      found.push(...parseIndex(strFromU8(file), year, sourceIndexUrl, firstName, lastName));
    }

    try {
      const db = getDb();
      await db.insert(trackedMembers).values({ id: memberId, firstName: firstName || found[0]?.firstName || "Unknown", lastName, displayName: `${firstName} ${lastName}`.trim(), stateDistrict: found[0]?.stateDistrict }).onConflictDoNothing();
      await db.insert(syncRuns).values({ id: runId, memberId, status: "completed", filingCount: found.length, completedAt: new Date().toISOString() });
      for (const row of found) {
        await db.insert(filings).values({ docId: row.docId, memberId, filingType: row.filingType, filingYear: row.filingYear, filedAt: row.filingDate, sourceIndexUrl: row.sourceIndexUrl, sourcePdfUrl: row.sourcePdfUrl }).onConflictDoNothing();
      }
    } catch {
      // The official-source check still succeeds while a fresh D1 database is being initialized.
    }

    return Response.json({ runId, status: "completed", filings: found, filingCount: found.length, source: "Office of the Clerk, U.S. House of Representatives" });
  } catch (error) {
    return Response.json({ runId, status: "failed", error: error instanceof Error ? error.message : "Official source check failed." }, { status: 502 });
  }
}
