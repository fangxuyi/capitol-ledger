import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the completed congressional disclosure tracker", async () => {
  const [page, dashboard, data, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TrackerDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/tracker-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /TrackerDashboard/);
  assert.match(dashboard, /Raw Clerk pipeline/);
  assert.match(dashboard, /Latest material changes/);
  assert.match(data, /Nancy Pelosi/);
  assert.match(data, /disclosures-clerk\.house\.gov/);
  assert.match(layout, /Capitol Ledger/);
  assert.doesNotMatch(`${page}${dashboard}${layout}`, /codex-preview|react-loading-skeleton/i);
});
