import { BASELINE_RENEWABLE, BASELINE_CARBON, COUNTRY_FLAGS } from "./data";
import type { CountryRenewable, CountryCarbon } from "@/types";

// Electricity Maps free API — zone-level real-time power breakdown
// Docs: https://static.electricitymap.org/api/docs/index.html
// Free token via: https://api-portal.electricitymaps.com/
const EMAPS_TOKEN = process.env.ELECTRICITY_MAPS_TOKEN || "";

// Open-Meteo Electricity (powered by ENTSO-E / various TSOs) — no key needed
// https://energy-charts.info/api/ — no key needed (Fraunhofer ISE)
const ENERGY_CHARTS_BASE = "https://api.energy-charts.info/public_power_aggregated";

// Electricity Maps zone → ISO-2 mapping (subset of major zones)
const ZONE_TO_ISO: Record<string, string> = {
  "NO": "NO", "SE": "SE", "DK-DK1": "DK", "DK-DK2": "DK", "FI": "FI",
  "DE": "DE", "AT": "AT", "CH": "CH", "FR": "FR", "ES": "ES",
  "PT": "PT", "IT-NO": "IT", "GB": "GB", "IE": "IE", "NL": "NL",
  "BE": "BE", "PL": "PL", "CZ": "CZ", "US-CAL-CISO": "US", "AU-NSW": "AU",
  "BR-CS": "BR", "IN-NO": "IN", "JP-TK": "JP", "KR": "KR",
};

// Energy Charts country codes → ISO-2
const ENERGY_CHARTS_COUNTRIES: Record<string, string> = {
  "de": "DE", "at": "AT", "ch": "CH", "fr": "FR", "es": "ES",
  "pt": "PT", "it": "IT", "gb": "GB", "nl": "NL", "be": "BE",
  "pl": "PL", "cz": "CZ", "dk": "DK", "se": "SE", "no": "NO",
  "fi": "FI", "ie": "IE",
};

async function fetchElectricityMapsZone(zone: string): Promise<{ renewablePercent: number; breakdown: Record<string, number> } | null> {
  if (!EMAPS_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.electricitymap.org/v3/power-breakdown/latest?zone=${zone}`,
      {
        headers: { "auth-token": EMAPS_TOKEN },
        next: { revalidate: 900 }, // 15 min cache
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const breakdown = data.powerProductionBreakdown || {};
    const total = Object.values(breakdown as Record<string, number>).reduce((a, b) => a + Math.max(0, b), 0);
    const renewableSources = ["solar", "wind", "hydro", "geothermal", "biomass", "nuclear"];
    // Note: nuclear is debated — we include it as low-carbon but mark separately
    const renewableOnly = ["solar", "wind", "hydro", "geothermal", "biomass"];
    const renewableTotal = renewableOnly.reduce((sum, src) => sum + Math.max(0, breakdown[src] || 0), 0);
    const renewablePercent = total > 0 ? (renewableTotal / total) * 100 : 0;
    return { renewablePercent, breakdown };
  } catch {
    return null;
  }
}

export async function getRenewableLeaderboard(): Promise<CountryRenewable[]> {
  const results: Map<string, CountryRenewable> = new Map();

  // Initialize all countries with baseline data
  for (const [code, info] of Object.entries(BASELINE_RENEWABLE)) {
    results.set(code, {
      country: info.name,
      code,
      flag: COUNTRY_FLAGS[code] || "🏳️",
      renewablePercent: info.percent,
      source: "annual",
      updatedAt: "2023",
      breakdown: info.breakdown,
    });
  }

  // Try Electricity Maps for real-time data on key zones
  if (EMAPS_TOKEN) {
    const zones = Object.keys(ZONE_TO_ISO);
    const results_live = await Promise.allSettled(
      zones.map(async (zone) => {
        const data = await fetchElectricityMapsZone(zone);
        return { zone, data };
      })
    );

    // Aggregate zones by country (take best/latest)
    const countryData: Map<string, number[]> = new Map();
    for (const r of results_live) {
      if (r.status === "fulfilled" && r.value.data) {
        const iso = ZONE_TO_ISO[r.value.zone];
        if (!countryData.has(iso)) countryData.set(iso, []);
        countryData.get(iso)!.push(r.value.data.renewablePercent);
      }
    }

    for (const [iso, percents] of countryData) {
      const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
      const existing = results.get(iso);
      if (existing) {
        results.set(iso, {
          ...existing,
          renewablePercent: Math.round(avg * 10) / 10,
          source: "live",
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Try Open Energy Charts API for European countries (no key needed)
  const europeCountries = Object.entries(ENERGY_CHARTS_COUNTRIES);
  const now = new Date();
  const startDate = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const europeResults = await Promise.allSettled(
    europeCountries.map(async ([ec_code, iso]) => {
      try {
        const url = `${ENERGY_CHARTS_BASE}?country=${ec_code}&time_step=quarterhour&date=${fmt(now)}`;
        const res = await fetch(url, { next: { revalidate: 900 } });
        if (!res.ok) return null;
        const data = await res.json();
        return { iso, data };
      } catch {
        return null;
      }
    })
  );

  for (const r of europeResults) {
    if (r.status !== "fulfilled" || !r.value) continue;
    try {
      const { iso, data } = r.value;
      if (!data?.production_types) continue;

      // Find last non-null interval
      const renewableTypes = ["Run-of-river", "Biomass", "Wind offshore", "Wind onshore", "Photovoltaics", "Pumped storage generation", "Other renewables"];
      const fossilTypes = ["Fossil hard coal", "Fossil brown coal / lignite", "Fossil gas", "Fossil oil", "Nuclear"];

      let renewableTotal = 0;
      let grandTotal = 0;

      for (const pt of data.production_types) {
        const values: (number | null)[] = pt.data || [];
        const last = [...values].reverse().find((v) => v !== null) ?? 0;
        grandTotal += Math.max(0, last as number);
        if (renewableTypes.some((rt) => pt.name?.includes(rt.split(" ")[0]))) {
          renewableTotal += Math.max(0, last as number);
        }
      }

      const percent = grandTotal > 0 ? (renewableTotal / grandTotal) * 100 : 0;
      if (percent > 0 && percent <= 100) {
        const existing = results.get(iso);
        if (existing && existing.source !== "live") {
          results.set(iso, {
            ...existing,
            renewablePercent: Math.round(percent * 10) / 10,
            source: "recent",
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // fallback to baseline
    }
  }

  return Array.from(results.values()).sort((a, b) => b.renewablePercent - a.renewablePercent);
}

export async function getCarbonLeaderboard(): Promise<CountryCarbon[]> {
  const results: CountryCarbon[] = [];

  for (const [code, info] of Object.entries(BASELINE_CARBON)) {
    results.push({
      country: info.name,
      code,
      flag: COUNTRY_FLAGS[code] || "🏳️",
      co2PerCapita: info.co2PerCapita,
      year: info.year,
      source: "Global Carbon Project / Our World in Data",
    });
  }

  // Sort ascending (lowest footprint first = best performers)
  return results.sort((a, b) => a.co2PerCapita - b.co2PerCapita);
}
