import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const payload = JSON.parse(await readFile(join(root, "public", "data", "house-performance.json"), "utf8"));
const trackedMemberIds = ["nancy-pelosi", "james-langevin", "ed-perlmutter", "marjorie-greene", "dean-phillips", "john-james", "carol-miller", "gary-palmer", "daniel-crenshaw"];

if (payload.meta.filerCount !== payload.members.length) throw new Error("Filer count does not match the member summary array.");
if (payload.meta.episodeCount !== payload.episodes.length) throw new Error("Episode count does not match the episode array.");
if (!payload.episodes.every((episode) => episode.sourceUrl?.startsWith("https://disclosures-clerk.house.gov/"))) throw new Error("An episode is missing official House Clerk provenance.");

for (const memberId of trackedMemberIds) {
  const details = JSON.parse(await readFile(join(root, "public", "data", "members", `${memberId}.json`), "utf8"));
  if (!Array.isArray(details.transactions) || !Array.isArray(details.episodes)) throw new Error(`${memberId} detail data is malformed.`);
  if (!details.transactions.every((transaction) => transaction.memberId === memberId)) throw new Error(`${memberId} contains another member's transaction.`);
  if (!details.episodes.every((episode) => episode.memberId === memberId)) throw new Error(`${memberId} contains another member's episode.`);
}

console.log(`Verified ${payload.meta.filerCount.toLocaleString()} filers, ${payload.meta.ptrCount.toLocaleString()} PTRs, and ${payload.meta.scoredEpisodeCount.toLocaleString()} scored episodes.`);

