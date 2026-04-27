import { BASELINE_RENEWABLE, BASELINE_CARBON, BASELINE_CYCLING, BASELINE_FOREST,
         BASELINE_AIR_QUALITY, BASELINE_WILDFIRE, getFlagEmoji } from "./data";
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
      flag: getFlagEmoji(code),
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
  // ── World Bank API: EN.GHG.CO2.PC.CE.AR5 (t CO₂e per capita, excl. LULUCF) ────
  // Free, no key. Returns 2023–2024 data for most countries — far more current
  // than any static baseline. The old EN.ATM.CO2E.PC indicator was archived;
  // this replacement is the officially maintained series.
  const wbMap = new Map<string, { co2: number; year: number }>();
  try {
    const url =
      "https://api.worldbank.org/v2/country/all/indicator/EN.GHG.CO2.PC.CE.AR5" +
      "?format=json&mrv=2&per_page=400";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
    } as RequestInit);
    if (res.ok) {
      const json = await res.json();
      const entries: any[] = json[1] ?? [];
      for (const entry of entries) {
        const iso2: string | undefined = entry.country?.id;
        if (!iso2 || entry.value === null || entry.value === undefined) continue;
        // Skip World Bank aggregate regions (single-char or numeric prefixes)
        if (iso2.length !== 2 || !/^[A-Z]{2}$/.test(iso2)) continue;
        const year = parseInt(entry.date, 10);
        const existing = wbMap.get(iso2);
        if (!existing || year > existing.year) {
          wbMap.set(iso2, { co2: Math.round(entry.value * 100) / 100, year });
        }
      }
    }
  } catch {
    // Silently fall back to GCP baseline on any network error
  }

  const results: CountryCarbon[] = [];

  for (const [code, info] of Object.entries(BASELINE_CARBON)) {
    const wb = wbMap.get(code);
    // Use World Bank data only if it's at least as recent as our baseline
    const useWB = wb && wb.year >= info.year;
    results.push({
      country: info.name,
      code,
      flag: getFlagEmoji(code),
      co2PerCapita: useWB ? wb!.co2  : info.co2PerCapita,
      year:         useWB ? wb!.year : info.year,
      source: useWB
        ? `World Bank (${wb!.year})`
        : `Global Carbon Project / Our World in Data (${info.year})`,
    });
  }

  return results.sort((a, b) => a.co2PerCapita - b.co2PerCapita);
}

export async function getCyclingLeaderboard(): Promise<import("@/types").CountryCycling[]> {
  return Object.entries(BASELINE_CYCLING)
    .map(([code, info]) => ({
      country:    info.name,
      code,
      flag:       getFlagEmoji(code),
      modalShare: info.modalShare,
      source:     "Eurobarometer / ITDP / national transport surveys",
      year:       info.year,
    }))
    .sort((a, b) => b.modalShare - a.modalShare);
}

export async function getForestLeaderboard(): Promise<import("@/types").CountryForest[]> {
  // ── Guaranteed baseline: 209 countries, World Bank/FAO 2023 data ────────
  // Baked in statically so the leaderboard always has data even if the API
  // is rate-limited or unavailable during the build.
  const baseline = new Map(
    Object.entries(BASELINE_FOREST).map(([code, info]) => [
      code,
      { name: info.name, pct: info.forestPercent, km2: 0, year: info.year },
    ])
  );

  // ── Try live WB API for updated % and km² values ────────────────────────
  // Uses a single sequential call with a long timeout. If it fails, the
  // guaranteed baseline above is used. km2 stays 0 for countries where the
  // API call doesn't succeed — the UI shows "—" for those.
  try {
    const res = await fetch(
      "https://api.worldbank.org/v2/country/all/indicator/AG.LND.FRST.K2" +
      "?format=json&mrv=1&per_page=500",
      { signal: AbortSignal.timeout(25_000) } as RequestInit
    );
    if (res.ok) {
      const json = await res.json();
      for (const entry of json[1] ?? []) {
        const code: string = entry.country?.id ?? "";
        if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) continue;
        if (entry.value === null || entry.value === undefined) continue;
        const existing = baseline.get(code);
        if (existing) {
          existing.km2 = Math.round(entry.value);
        }
      }
    }
  } catch { /* keep km2=0 */ }

  return Array.from(baseline.entries())
    .map(([code, d]) => ({
      country:       d.name,
      code,
      flag:          getFlagEmoji(code),
      forestPercent: d.pct,
      forestKm2:     d.km2,
      source:        "World Bank / FAO Global Forest Resources Assessment (2023)",
      year:          d.year,
    }))
    .sort((a, b) => b.forestPercent - a.forestPercent);
}

// ─── Carbon Intensity ────────────────────────────────────────────────────────
// g CO₂/kWh computed from power-mix breakdowns using life-cycle emission factors.
// EU countries use near-real-time Energy-Charts data (same source as renewable tab).
// All 170 countries in BASELINE_RENEWABLE are covered without any new API key.

const EMISSION_FACTORS: Record<string, number> = {
  solar: 41, wind: 11, hydro: 24, nuclear: 12, geo: 38, biomass: 230,
  fossil: 700,  // weighted coal/gas/oil average
  other: 300,
};

function computeGCO2(breakdown: Record<string, number>): number {
  const entries = Object.entries(breakdown);
  if (!entries.length) return 500;
  const total = entries.reduce((s, [, v]) => s + Math.max(0, v), 0);
  if (!total) return 500;
  const weighted = entries.reduce((s, [src, pct]) => {
    const factor = EMISSION_FACTORS[src.toLowerCase()] ?? EMISSION_FACTORS.other;
    return s + (Math.max(0, pct) / total) * factor;
  }, 0);
  return Math.round(weighted);
}

export async function getCarbonIntensityLeaderboard(): Promise<import("@/types").CountryCarbonIntensity[]> {
  const results = new Map<string, import("@/types").CountryCarbonIntensity>();

  // Step 1 – seed every country from static baseline
  for (const [code, info] of Object.entries(BASELINE_RENEWABLE)) {
    results.set(code, {
      country:    info.name,
      code,
      flag:       getFlagEmoji(code),
      gCO2perKwh: computeGCO2(info.breakdown ?? { fossil: 100 }),
      source:     "estimated",
      updatedAt:  "2023",
    });
  }

  // Step 2 – enrich EU countries with Energy-Charts real-time data
  // Same endpoint we already use for renewable; just re-fetch & re-compute.
  const EU_COUNTRIES: Record<string, string> = {
    de:"DE",at:"AT",ch:"CH",fr:"FR",es:"ES",pt:"PT",it:"IT",gb:"GB",
    nl:"NL",be:"BE",pl:"PL",cz:"CZ",dk:"DK",se:"SE",no:"NO",fi:"FI",ie:"IE",
  };
  const today = new Date().toISOString().split("T")[0];

  const FACTOR_MAP: Record<string, number> = {
    "Fossil hard coal": 820, "Fossil brown coal / lignite": 1000,
    "Fossil gas": 490, "Fossil oil": 650, "Fossil coal-derived gas": 550,
    "Nuclear": 12,
    "Hydro Run-of-River": 24, "Hydro pumped storage": 30,
    "Wind offshore": 12, "Wind onshore": 11,
    "Photovoltaics": 41, "Biomass": 230,
    "Other renewables": 50, "Geothermal": 38,
  };

  const euResults = await Promise.allSettled(
    Object.entries(EU_COUNTRIES).map(async ([ec, iso]) => {
      try {
        const url = `https://api.energy-charts.info/public_power_aggregated?country=${ec}&time_step=quarterhour&date=${today}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(12_000) } as RequestInit);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.production_types?.length) return null;

        let totalMW = 0, weightedCO2 = 0;
        for (const pt of data.production_types) {
          const vals: (number | null)[] = pt.data ?? [];
          const last = [...vals].reverse().find(v => v !== null) ?? 0;
          const mw = Math.max(0, last as number);
          totalMW += mw;
          weightedCO2 += mw * (FACTOR_MAP[pt.name] ?? 0);
        }
        if (!totalMW) return null;
        return { iso, gCO2: Math.round(weightedCO2 / totalMW) };
      } catch { return null; }
    })
  );

  for (const r of euResults) {
    if (r.status !== "fulfilled" || !r.value) continue;
    const { iso, gCO2 } = r.value;
    const existing = results.get(iso);
    if (existing && gCO2 > 0) {
      results.set(iso, { ...existing, gCO2perKwh: gCO2, source: "live", updatedAt: new Date().toISOString() });
    }
  }

  return Array.from(results.values()).sort((a, b) => a.gCO2perKwh - b.gCO2perKwh);
}

// ─── Air Quality ─────────────────────────────────────────────────────────────
// PM2.5 µg/m³ annual mean. Static baseline from WHO 2022 + World Bank.
// Enriched from World Bank API at build time when available.
// OpenAQ real-time data used if OPENAQ_API_KEY is set (hourly station averages).

export async function getAirQualityLeaderboard(): Promise<import("@/types").CountryAirQuality[]> {
  const results = new Map<string, import("@/types").CountryAirQuality>(
    Object.entries(BASELINE_AIR_QUALITY).map(([code, info]) => [
      code,
      { country: info.name, code, flag: getFlagEmoji(code), pm25: info.pm25, source: "WHO / World Bank (2019)", year: info.year },
    ])
  );

  // Try World Bank API for updated values
  try {
    const res = await fetch(
      "https://api.worldbank.org/v2/country/all/indicator/EN.ATM.PM25.MC.M3?format=json&mrv=1&per_page=500",
      { signal: AbortSignal.timeout(20_000) } as RequestInit
    );
    if (res.ok) {
      const json = await res.json();
      for (const entry of json[1] ?? []) {
        const code: string = entry.country?.id ?? "";
        if (code.length !== 2 || !entry.value) continue;
        const year = parseInt(entry.date, 10);
        const existing = results.get(code);
        if (existing && year >= existing.year) {
          results.set(code, {
            ...existing,
            pm25:   Math.round(entry.value * 10) / 10,
            source: `World Bank / WHO (${year})`,
            year,
          });
        } else if (!existing) {
          // Country in WB but not in our baseline — add it
          const any = BASELINE_FOREST[code] || BASELINE_RENEWABLE[code] || BASELINE_CARBON[code] || BASELINE_CYCLING[code];
          const name = (any as { name?: string })?.name ?? entry.country?.value;
          if (name) {
            results.set(code, {
              country: name, code, flag: getFlagEmoji(code),
              pm25: Math.round(entry.value * 10) / 10,
              source: `World Bank / WHO (${year})`, year,
            });
          }
        }
      }
    }
  } catch { /* keep static baseline */ }

  // Optional: OpenAQ real-time enrichment
  const OPENAQ_KEY = process.env.OPENAQ_API_KEY ?? "";
  if (OPENAQ_KEY) {
    try {
      // Fetch latest country-level PM2.5 averages from OpenAQ v3
      const res = await fetch(
        "https://api.openaq.org/v3/countries?limit=200&parameters_id=2",  // parameter 2 = pm25
        { headers: { "X-API-Key": OPENAQ_KEY }, signal: AbortSignal.timeout(15_000) } as RequestInit
      );
      if (res.ok) {
        const data = await res.json();
        for (const country of data.results ?? []) {
          const code = country.code?.toUpperCase();
          if (!code || code.length !== 2) continue;
          const latestPm25 = country.parameters?.find((p: any) => p.parameterId === 2)?.lastValue;
          if (latestPm25 && latestPm25 > 0) {
            const existing = results.get(code);
            if (existing) {
              results.set(code, {
                ...existing,
                pm25:   Math.round(latestPm25 * 10) / 10,
                source: `OpenAQ (live — ${new Date().toLocaleString()})`,
                year:   new Date().getFullYear(),
              });
            }
          }
        }
      }
    } catch { /* keep WB/static */ }
  }

  return Array.from(results.values()).sort((a, b) => a.pm25 - b.pm25);
}

// ─── Wildfire Activity ───────────────────────────────────────────────────────
// Fire detections per 100k km² (normalized density) + absolute count.
// Static baseline: NASA FIRMS VIIRS annual stats.
// Live enrichment: NASA FIRMS 7-day data when FIRMS_MAP_KEY is set.
// ISO-3 → ISO-2 mapping needed because FIRMS uses ISO-3.

const ISO3_TO_ISO2: Record<string, string> = {
  AFG:"AF",AGO:"AO",ALB:"AL",AND:"AD",ARE:"AE",ARG:"AR",ARM:"AM",ATG:"AG",AUS:"AU",AUT:"AT",
  AZE:"AZ",BDI:"BI",BEN:"BJ",BFA:"BF",BGD:"BD",BGR:"BG",BHR:"BH",BHS:"BS",BIH:"BA",BLR:"BY",
  BLZ:"BZ",BOL:"BO",BRA:"BR",BRN:"BN",BTN:"BT",BWA:"BW",CAF:"CF",CAN:"CA",CHE:"CH",CHL:"CL",
  CHN:"CN",CIV:"CI",CMR:"CM",COD:"CD",COG:"CG",COL:"CO",COM:"KM",CPV:"CV",CRI:"CR",CUB:"CU",
  CYP:"CY",CZE:"CZ",DEU:"DE",DJI:"DJ",DMA:"DM",DNK:"DK",DOM:"DO",DZA:"DZ",ECU:"EC",EGY:"EG",
  ERI:"ER",ESP:"ES",EST:"EE",ETH:"ET",FIN:"FI",FJI:"FJ",FRA:"FR",FSM:"FM",GAB:"GA",GBR:"GB",
  GEO:"GE",GHA:"GH",GIN:"GN",GMB:"GM",GNB:"GW",GNQ:"GQ",GRC:"GR",GRD:"GD",GTM:"GT",GUY:"GY",
  HND:"HN",HRV:"HR",HTI:"HT",HUN:"HU",IDN:"ID",IND:"IN",IRL:"IE",IRN:"IR",IRQ:"IQ",ISL:"IS",
  ISR:"IL",ITA:"IT",JAM:"JM",JOR:"JO",JPN:"JP",KAZ:"KZ",KEN:"KE",KGZ:"KG",KHM:"KH",KIR:"KI",
  KNA:"KN",KOR:"KR",KWT:"KW",LAO:"LA",LBN:"LB",LBR:"LR",LBY:"LY",LCA:"LC",LIE:"LI",LKA:"LK",
  LSO:"LS",LTU:"LT",LUX:"LU",LVA:"LV",MAR:"MA",MDA:"MD",MDG:"MG",MDV:"MV",MEX:"MX",MHL:"MH",
  MKD:"MK",MLI:"ML",MLT:"MT",MMR:"MM",MNE:"ME",MNG:"MN",MOZ:"MZ",MRT:"MR",MUS:"MU",MWI:"MW",
  MYS:"MY",NAM:"NA",NER:"NE",NGA:"NG",NIC:"NI",NLD:"NL",NOR:"NO",NPL:"NP",NRU:"NR",NZL:"NZ",
  OMN:"OM",PAK:"PK",PAN:"PA",PER:"PE",PHL:"PH",PLW:"PW",PNG:"PG",POL:"PL",PRT:"PT",PRY:"PY",
  PSE:"PS",QAT:"QA",ROU:"RO",RUS:"RU",RWA:"RW",SAU:"SA",SEN:"SN",SLB:"SB",SLE:"SL",SLV:"SV",
  SMR:"SM",SOM:"SO",SRB:"RS",SSD:"SS",STP:"ST",SUR:"SR",SVK:"SK",SVN:"SI",SWE:"SE",SWZ:"SZ",
  SYC:"SC",SYR:"SY",TCD:"TD",TGO:"TG",THA:"TH",TJK:"TJ",TKM:"TM",TLS:"TL",TON:"TO",TTO:"TT",
  TUN:"TN",TUR:"TR",TUV:"TV",TZA:"TZ",UGA:"UG",UKR:"UA",URY:"UY",USA:"US",UZB:"UZ",VCT:"VC",
  VEN:"VE",VNM:"VN",VUT:"VU",WSM:"WS",YEM:"YE",ZAF:"ZA",ZMB:"ZM",ZWE:"ZW",
};

// Country land areas in km² (for density normalization of live FIRMS data)
const LAND_AREA_KM2: Record<string, number> = {
  AF:652230,AG:442,AL:27398,AM:28470,AO:1246700,AR:2736690,AT:82445,AU:7682300,
  AZ:82658,BA:51129,BB:430,BD:130170,BE:30278,BF:272967,BG:108560,BH:778,BI:25680,
  BJ:112622,BN:5265,BO:1083301,BR:8358140,BS:10010,BT:38117,BW:566730,BY:202910,
  BZ:22806,CA:9093507,CD:2267048,CF:622984,CG:342000,CH:39516,CI:322463,CL:743532,
  CM:472710,CN:9388211,CO:1038700,CR:51060,CU:103800,CV:4033,CY:9241,CZ:77247,
  DE:348672,DJ:23000,DK:42508,DM:751,DO:48320,DZ:2381741,EC:248360,EE:42388,
  EG:995450,ER:121144,ES:498800,ET:1000000,FI:303815,FJ:18272,FM:702,FR:640427,
  GA:257667,GB:241930,GD:344,GE:69700,GH:227540,GM:10380,GN:245836,GQ:28051,
  GR:128900,GT:107159,GW:28120,GY:196849,HN:111890,HR:55974,HT:27560,HU:92340,
  ID:1811570,IN:2973190,IE:68883,IR:1628550,IQ:438317,IS:100250,IL:20330,IT:294140,
  JM:10831,JO:88780,JP:364555,KE:569140,KG:191800,KH:176520,KI:717,KM:1862,
  KN:261,KP:120410,KR:97392,KW:17820,KZ:2699700,LA:230800,LB:10230,LC:539,
  LI:160,LK:62710,LR:96320,LS:30355,LT:62674,LU:2590,LV:62249,LY:1759540,
  MA:446300,MD:32850,ME:13452,MG:581540,MH:181,MK:25433,ML:1220190,MM:653290,
  MN:1553556,MR:1030700,MT:316,MU:2030,MV:300,MW:94280,MX:1943945,MY:328550,
  MZ:786380,NA:823290,NE:1266700,NG:910770,NI:119990,NL:33690,NO:304282,NP:143351,
  NZ:263310,OM:309500,PA:74177,PE:1280000,PG:452860,PH:298170,PK:770880,PL:304255,
  PT:88418,PW:444,PY:397302,QA:11586,RO:229575,RS:77474,RU:16376870,RW:24668,
  SA:2149690,SB:27986,SC:455,SD:1765048,SE:410340,SG:710,SI:20151,SK:48105,
  SL:71620,SM:61,SN:192530,SO:627340,SR:156000,SS:619745,ST:964,SV:20721,
  SY:183630,SZ:17204,TD:1259200,TG:54385,TH:510890,TJ:141510,TL:14919,TM:469930,
  TN:155360,TO:720,TR:769632,TT:5128,TV:26,TZ:885800,UA:579380,UG:197100,
  US:9147593,UY:173620,UZ:425400,VC:389,VE:882050,VN:310070,VU:12190,
  WS:2842,YE:527970,ZA:1213090,ZM:743390,ZW:386850,
};

export async function getWildfireLeaderboard(): Promise<import("@/types").CountryWildfire[]> {
  const FIRMS_KEY = process.env.FIRMS_MAP_KEY ?? "";
  const results = new Map<string, import("@/types").CountryWildfire>(
    Object.entries(BASELINE_WILDFIRE).map(([code, info]) => [
      code,
      {
        country:     info.name,
        code,
        flag:        getFlagEmoji(code),
        fireDensity: info.fireDensity,
        fireCount:   info.fireCount,
        periodDays:  365,
        source:      "NASA FIRMS VIIRS (annual baseline)",
        updatedAt:   `${info.year}`,
      },
    ])
  );

  if (FIRMS_KEY) {
    try {
      // 7-day VIIRS S-NPP near-real-time data for all countries
      const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${FIRMS_KEY}/VIIRS_SNPP_NRT/ALL/7`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) } as RequestInit);
      if (res.ok) {
        const csv = await res.text();
        const lines = csv.trim().split("\n").slice(1); // skip header
        const now = new Date().toISOString();

        for (const line of lines) {
          const [iso3Raw, countRaw] = line.split(",");
          const iso3 = iso3Raw?.trim().toUpperCase();
          const count = parseInt(countRaw?.trim() ?? "0", 10);
          if (!iso3 || isNaN(count)) continue;

          const iso2 = ISO3_TO_ISO2[iso3];
          if (!iso2) continue;

          const landKm2 = LAND_AREA_KM2[iso2] ?? 1;
          const density = Math.round((count / landKm2) * 100000);

          const existing = results.get(iso2);
          const name = existing?.country ?? iso3;
          results.set(iso2, {
            country:     name,
            code:        iso2,
            flag:        getFlagEmoji(iso2),
            fireDensity: density,
            fireCount:   count,
            periodDays:  7,
            source:      "NASA FIRMS VIIRS S-NPP (7-day live)",
            updatedAt:   now,
          });
        }
      }
    } catch { /* keep baseline */ }
  }

  return Array.from(results.values()).sort((a, b) => b.fireDensity - a.fireDensity);
}
