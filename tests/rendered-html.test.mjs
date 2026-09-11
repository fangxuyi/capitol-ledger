import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the completed congressional disclosure tracker", async () => {
  const [page, dashboard, data, houseData, houseJson, houseCsv, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TrackerDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/tracker-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/house-performance.generated.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/data/house-performance.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/house-performance-episodes.csv", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /TrackerDashboard/);
  assert.match(dashboard, /Raw Clerk pipeline/);
  assert.match(dashboard, /Latest material changes/);
  assert.match(dashboard, /House performance table/);
  assert.match(houseData, /"filerCount": 401/);
  assert.match(houseData, /"scoredEpisodeCount":/);
  assert.match(houseData, /"averageHoldingDays":/);
  assert.match(houseJson, /"members":/);
  assert.match(houseJson, /"episodes":/);
  assert.match(houseCsv, /^member_id,member,state_district,ticker/);
  assert.match(dashboard, /Average holding period/);
  assert.match(dashboard, /Download JSON/);
  assert.match(data, /Nancy Pelosi/);
  assert.match(data, /James R\. Langevin/);
  assert.match(data, /Ed Perlmutter/);
  assert.match(data, /Marjorie Taylor Greene/);
  assert.match(data, /Dean Phillips/);
  assert.match(data, /John James/);
  assert.match(data, /Carol Devine Miller/);
  assert.match(data, /Gary Palmer/);
  assert.match(data, /Daniel Crenshaw/);
  assert.match(dashboard, /correct raw-source record is unavailable/);
  assert.match(data, /disclosures-clerk\.house\.gov/);
  assert.match(layout, /Capitol Ledger/);
  assert.doesNotMatch(`${page}${dashboard}${layout}`, /codex-preview|react-loading-skeleton/i);
});
