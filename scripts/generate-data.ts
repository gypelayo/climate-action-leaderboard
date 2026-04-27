/**
 * Build-time data generator.
 * Runs before `next build` to populate public/data/combined.json.
 * Tries Energy-Charts.info (free, ENTSO-E, EU grids) first,
 * then falls back to the annual baseline dataset.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { getRenewableLeaderboard, getCarbonLeaderboard } from "../src/lib/fetcher";

async function main() {
  console.log("🌍 Generating static climate data...");

  const [renewable, carbon] = await Promise.all([
    getRenewableLeaderboard(),
    getCarbonLeaderboard(),
  ]);

  const lastFetched = new Date().toISOString();

  const combined = { renewable, carbon, lastFetched };

  const dataDir = join(process.cwd(), "public", "data");
  mkdirSync(dataDir, { recursive: true });

  writeFileSync(join(dataDir, "combined.json"), JSON.stringify(combined, null, 2));

  const liveCount   = renewable.filter((c) => c.source === "live").length;
  const recentCount = renewable.filter((c) => c.source === "recent").length;
  const annualCount = renewable.length - liveCount - recentCount;

  console.log(`✓ Renewable : ${renewable.length} countries  (🟢 ${liveCount} live · 🟡 ${recentCount} recent · ⚪ ${annualCount} annual)`);
  console.log(`✓ Carbon    : ${carbon.length} countries`);
  console.log(`✓ Written to public/data/combined.json  [${lastFetched}]`);
}

main().catch((err) => {
  console.error("❌ Data generation failed:", err);
  process.exit(1);
});
