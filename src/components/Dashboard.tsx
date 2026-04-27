"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { LeaderboardData, CountryRenewable, CountryCarbon, CountryCycling,
              CountryForest, CountryCarbonIntensity, CountryAirQuality, CountryWildfire } from "@/types";
import RenewableLeaderboard      from "@/components/RenewableLeaderboard";
import CarbonLeaderboard         from "@/components/CarbonLeaderboard";
import CyclingLeaderboard        from "@/components/CyclingLeaderboard";
import ForestLeaderboard         from "@/components/ForestLeaderboard";
import CarbonIntensityLeaderboard from "@/components/CarbonIntensityLeaderboard";
import AirQualityLeaderboard     from "@/components/AirQualityLeaderboard";
import WildfireLeaderboard       from "@/components/WildfireLeaderboard";
import CountryReport             from "@/components/CountryReport";
import StarField                 from "@/components/StarField";
import Globe                     from "@/components/Globe";
import { RefreshCw, Search, X }  from "lucide-react";

function useClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT(new Date().toUTCString().slice(17, 25));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

type TabId = "renewable" | "carbon" | "cycling" | "forest" | "carbonIntensity" | "airQuality" | "wildfire";

const TABS: { id: TabId; icon: string; label: string; sub: string }[] = [
  { id: "renewable",       icon: "⚡", label: "Renewable",    sub: "% electricity from clean sources"    },
  { id: "carbon",          icon: "🌿", label: "Carbon",       sub: "t CO₂ per capita / year"             },
  { id: "carbonIntensity", icon: "🏭", label: "Grid CO₂",     sub: "g CO₂ per kWh of electricity"       },
  { id: "airQuality",      icon: "🌬️", label: "Air Quality",  sub: "PM2.5 µg/m³ annual mean"            },
  { id: "wildfire",        icon: "🔥", label: "Wildfires",    sub: "fire detections per 100k km²"        },
  { id: "cycling",         icon: "🚴", label: "Cycling",      sub: "% of daily trips by bicycle"         },
  { id: "forest",          icon: "🌳", label: "Forests",      sub: "% of land area / km²"                },
];

const EMPTY: LeaderboardData = {
  renewable: [], carbon: [], cycling: [], forest: [],
  carbonIntensity: [], airQuality: [], wildfire: [],
  lastFetched: "",
};

export default function Dashboard() {
  const [data,       setData]       = useState<LeaderboardData>(EMPTY);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [tab,        setTab]        = useState<TabId>("renewable");
  const [tabSearch,  setTabSearch]  = useState("");

  // Global country search
  const [globalQ,       setGlobalQ]       = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; flag: string; name: string } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const clock = useClock();
  const BASE  = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const fetchData = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/data/combined.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json() as LeaderboardData & { lastFetched: string };
      setData(j);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [BASE]);

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(true), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build unified country list for global search autocomplete
  const allCountries = useMemo(() => {
    const map = new Map<string, { code: string; flag: string; name: string }>();
    const add = (arr: { code: string; flag: string; country: string }[]) =>
      arr.forEach(c => { if (!map.has(c.code)) map.set(c.code, { code: c.code, flag: c.flag, name: c.country }); });
    add(data.renewable); add(data.carbon); add(data.cycling); add(data.forest);
    add(data.carbonIntensity); add(data.airQuality); add(data.wildfire);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const suggestions = useMemo(() => {
    if (!globalQ.trim() || globalQ.length < 2) return [];
    const q = globalQ.toLowerCase();
    return allCountries.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)).slice(0, 8);
  }, [globalQ, allCountries]);

  const handleTab = (t: TabId) => { setTab(t); setTabSearch(""); };

  const liveRenew   = data.renewable.filter(c => c.source === "live").length;
  const recentRenew = data.renewable.filter(c => c.source === "recent").length;
  const liveCI      = data.carbonIntensity.filter(c => c.source === "live").length;
  const liveWF      = data.wildfire.filter(c => c.periodDays === 7).length;
  const freshLabel  = data.lastFetched
    ? new Date(data.lastFetched).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  function filterArr<T extends { country: string; code: string }>(arr: T[]): T[] {
    if (!tabSearch.trim()) return arr;
    const q = tabSearch.toLowerCase();
    return arr.filter(c => c.country.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }

  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="relative min-h-screen" style={{ zIndex: 3 }}>
      <StarField />

      <div className="relative" style={{ zIndex: 4 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 border-b" style={{ zIndex: 50, borderColor: "rgba(120,200,255,0.1)", background: "rgba(0,5,18,0.9)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <Globe />

            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight title-gradient">Climate Action Leaderboard</h1>
              <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "var(--text-secondary)" }}>
                {Math.max(data.renewable.length, data.carbon.length)} nations ·{" "}
                {liveRenew > 0 && <span style={{ color: "#34d399" }}>{liveRenew} live </span>}
                {liveCI > 0 && <span style={{ color: "#34d399" }}>· {liveCI} EU grids live </span>}
                {liveWF > 0 && <span style={{ color: "#f87171" }}>· {liveWF} wildfire live </span>}
                {data.lastFetched && <span style={{ color: "var(--text-muted)" }}>· built {freshLabel}</span>}
              </p>
            </div>

            {/* 🔍 Global country search */}
            <div ref={searchRef} className="relative w-full sm:w-56">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Country profile…"
                  value={globalQ}
                  onChange={e => { setGlobalQ(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  className="flex-1 bg-transparent outline-none text-sm min-w-0"
                  style={{ color: "var(--text-primary)", caretColor: "var(--glow-cyan)" }}
                />
                {globalQ && (
                  <button onClick={() => { setGlobalQ(""); setSelectedCountry(null); setShowSuggestions(false); }}>
                    <X className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  </button>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-2xl" style={{ background: "rgba(4,12,32,0.98)", border: "1px solid rgba(120,200,255,0.15)", zIndex: 100 }}>
                  {suggestions.map(c => (
                    <button
                      key={c.code}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                      onClick={() => { setSelectedCountry(c); setGlobalQ(c.name); setShowSuggestions(false); }}
                    >
                      <span className="text-xl leading-none">{c.flag}</span>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.code}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clock + refresh */}
            <div className="hidden lg:block text-right flex-shrink-0">
              <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>UTC</div>
              <div className="text-sm font-mono font-semibold glow-cyan" style={{ color: "var(--glow-cyan)" }}>{clock}</div>
            </div>
            <button onClick={() => fetchData(true)} disabled={refreshing || loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex-shrink-0" style={{ border: "1px solid rgba(34,211,238,0.25)", color: "var(--glow-cyan)", background: "rgba(34,211,238,0.07)" }}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="max-w-4xl mx-auto px-4 py-5">

          {loading && (
            <div className="flex flex-col items-center justify-center py-48 gap-5">
              <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(34,211,238,0.4)", borderTopColor: "transparent" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading climate data…</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center p-6 text-sm rounded-xl border" style={{ borderColor: "rgba(248,113,113,0.25)", color: "var(--glow-red)", background: "rgba(248,113,113,0.05)" }}>
              ⚠ {error} — <button onClick={() => fetchData()} className="underline opacity-70 hover:opacity-100">retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Tab bar */}
              <div className="flex gap-1 p-1 rounded-xl overflow-x-auto mb-4 no-scrollbar" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => handleTab(t.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0" style={tab === t.id ? { background: "rgba(34,211,238,0.15)", color: "var(--glow-cyan)" } : { color: "var(--text-muted)" }}>
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab header + search */}
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap gap-y-2">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{activeTab.icon} {activeTab.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{activeTab.sub}</p>
                </div>
                <input
                  type="text"
                  placeholder="Filter this list…"
                  value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg outline-none transition-all w-44"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
                  onFocus={e  => (e.target.style.borderColor = "rgba(34,211,238,0.4)")}
                  onBlur={e   => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>

              {/* Panel */}
              <div className="glass glass-accent relative animate-fade-in">
                {tab === "renewable"       && <RenewableLeaderboard       data={filterArr(data.renewable)} />}
                {tab === "carbon"          && <CarbonLeaderboard          data={filterArr(data.carbon)} />}
                {tab === "cycling"         && <CyclingLeaderboard         data={filterArr(data.cycling)} />}
                {tab === "forest"          && <ForestLeaderboard          data={filterArr(data.forest)} />}
                {tab === "carbonIntensity" && <CarbonIntensityLeaderboard data={filterArr(data.carbonIntensity)} />}
                {tab === "airQuality"      && <AirQualityLeaderboard      data={filterArr(data.airQuality)} />}
                {tab === "wildfire"        && <WildfireLeaderboard        data={filterArr(data.wildfire)} />}
              </div>
            </>
          )}
        </main>

        <footer className="text-center text-xs py-6 border-t" style={{ borderColor: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
          Electricity Maps · Energy-Charts.info · World Bank · Global Carbon Project · WHO · NASA FIRMS · ITDP · FAO · Our World in Data
          <br />
          <a href="https://github.com/gypelayo/climate-action-leaderboard" className="hover:opacity-60 transition-opacity mt-1 inline-block">github.com/gypelayo/climate-action-leaderboard</a>
        </footer>
      </div>

      {/* Country Report panel */}
      {selectedCountry && !loading && (
        <CountryReport
          code={selectedCountry.code}
          flag={selectedCountry.flag}
          name={selectedCountry.name}
          data={data}
          onClose={() => { setSelectedCountry(null); setGlobalQ(""); }}
          onTabSwitch={t => { handleTab(t); }}
        />
      )}
    </div>
  );
}
