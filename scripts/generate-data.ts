/**
 * Build-time data generator.
 * Runs before `next build` to populate public/data/combined.json.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  getRenewableLeaderboard,
  getCarbonLeaderboard,
  getCyclingLeaderboard,
  getForestLeaderboard,
} from "../src/lib/fetcher";

async function main() {
  console.log("🌍 Generating static climate data...");

  const [renewable, carbon, cycling] = await Promise.all([
    getRenewableLeaderboard(),
    getCarbonLeaderboard(),
    getCyclingLeaderboard(),
  ]);
  // Forest uses 2 extra World Bank calls — run after the others to avoid
  // saturating connections and triggering AbortSignal timeouts.
  const forest = await getForestLeaderboard();

  const lastFetched = new Date().toISOString();
  const combined = { renewable, carbon, cycling, forest, lastFetched };

  const dataDir = join(process.cwd(), "public", "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "combined.json"), JSON.stringify(combined, null, 2));

  const liveCount   = renewable.filter(c => c.source === "live").length;
  const recentCount = renewable.filter(c => c.source === "recent").length;
  const wbCarbon    = carbon.filter(c => c.source.includes("World Bank")).length;

  console.log(`✓ Renewable : ${renewable.length} countries  (🟢 ${liveCount} live · 🟡 ${recentCount} recent · ⚪ ${renewable.length - liveCount - recentCount} annual)`);
  console.log(`✓ Carbon    : ${carbon.length} countries  (🌐 ${wbCarbon} World Bank 2024)`);
  console.log(`✓ Cycling   : ${cycling.length} countries`);
  console.log(`✓ Forest    : ${forest.length} countries  (🌐 World Bank / FAO)`);
  console.log(`✓ Written   : public/data/combined.json  [${lastFetched}]`);
}

main().catch(err => {
  console.error("❌ Data generation failed:", err);
  process.exit(1);
});
