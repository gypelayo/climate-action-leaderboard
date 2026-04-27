import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  getRenewableLeaderboard,
  getCarbonLeaderboard,
  getCyclingLeaderboard,
  getForestLeaderboard,
  getCarbonIntensityLeaderboard,
  getAirQualityLeaderboard,
  getWildfireLeaderboard,
} from "../src/lib/fetcher";

async function main() {
  console.log("🌍 Generating static climate data...");

  const [renewable, carbon, cycling, carbonIntensity, airQuality, wildfire] =
    await Promise.all([
      getRenewableLeaderboard(),
      getCarbonLeaderboard(),
      getCyclingLeaderboard(),
      getCarbonIntensityLeaderboard(),
      getAirQualityLeaderboard(),
      getWildfireLeaderboard(),
    ]);

  // Forest makes 1 extra WB call — run after to avoid rate-limit collisions
  const forest = await getForestLeaderboard();

  const lastFetched = new Date().toISOString();
  const combined = { renewable, carbon, cycling, forest, carbonIntensity, airQuality, wildfire, lastFetched };

  const dataDir = join(process.cwd(), "public", "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "combined.json"), JSON.stringify(combined, null, 2));

  const liveRenew = renewable.filter(c => c.source === "live").length;
  const recentRenew = renewable.filter(c => c.source === "recent").length;
  const wbCarbon  = carbon.filter(c => c.source.includes("World Bank")).length;
  const liveCI    = carbonIntensity.filter(c => c.source === "live").length;
  const liveWF    = wildfire.filter(c => c.periodDays === 7).length;
  const livAQ     = airQuality.filter(c => c.source.includes("OpenAQ")).length;

  console.log(`✓ Renewable      : ${renewable.length} countries  (🟢 ${liveRenew} live · 🟡 ${recentRenew} near-RT)`);
  console.log(`✓ Carbon         : ${carbon.length} countries  (🌐 ${wbCarbon} WB 2024)`);
  console.log(`✓ Cycling        : ${cycling.length} countries`);
  console.log(`✓ Forest         : ${forest.length} countries  (🌐 WB/FAO 2023)`);
  console.log(`✓ CO₂ Intensity  : ${carbonIntensity.length} countries  (🟢 ${liveCI} live EU · computed rest)`);
  console.log(`✓ Air Quality    : ${airQuality.length} countries  (${livAQ > 0 ? `🟢 ${livAQ} OpenAQ live` : "WHO/WB baseline"})`);
  console.log(`✓ Wildfires      : ${wildfire.length} countries  (${liveWF > 0 ? `🔴 ${liveWF} NASA FIRMS 7-day` : "annual baseline"})`);
  console.log(`✓ Written        : public/data/combined.json  [${lastFetched}]`);
}

main().catch(err => {
  console.error("❌ Data generation failed:", err);
  process.exit(1);
});
