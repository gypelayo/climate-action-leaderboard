"use client";

import { useEffect, useState, useCallback } from "react";
import type { CountryRenewable, CountryCarbon, CountryCycling, CountryForest } from "@/types";
import RenewableLeaderboard from "@/components/RenewableLeaderboard";
import CarbonLeaderboard    from "@/components/CarbonLeaderboard";
import CyclingLeaderboard   from "@/components/CyclingLeaderboard";
import ForestLeaderboard    from "@/components/ForestLeaderboard";
import StarField            from "@/components/StarField";
import Globe                from "@/components/Globe";
import { RefreshCw }        from "lucide-react";

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

type TabId = "renewable" | "carbon" | "cycling" | "forest";

const TABS: { id: TabId; icon: string; label: string; sub: string }[] = [
  { id: "renewable", icon: "⚡", label: "Renewable Energy",  sub: "% electricity from clean sources" },
  { id: "carbon",    icon: "🌿", label: "Carbon Footprint",  sub: "t CO₂ per capita / year"          },
  { id: "cycling",   icon: "🚴", label: "Cycling",           sub: "% of daily trips by bike"         },
  { id: "forest",    icon: "🌳", label: "Forest Cover",      sub: "% of land area / km²"             },
];

export default function Dashboard() {
  const [renewable,   setRenewable]   = useState<CountryRenewable[]>([]);
  const [carbon,      setCarbon]      = useState<CountryCarbon[]>([]);
  const [cycling,     setCycling]     = useState<CountryCycling[]>([]);
  const [forest,      setForest]      = useState<CountryForest[]>([]);
  const [lastFetched, setLastFetched] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [tab,         setTab]         = useState<TabId>("renewable");
  const [search,      setSearch]      = useState("");

  const clock = useClock();
  const BASE  = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  // Reset search when switching tabs
  const handleTab = (t: TabId) => { setTab(t); setSearch(""); };

  const fetchData = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/data/combined.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRenewable(j.renewable ?? []);
      setCarbon(j.carbon     ?? []);
      setCycling(j.cycling   ?? []);
      setForest(j.forest     ?? []);
      setLastFetched(j.lastFetched ?? "");
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

  const liveCount   = renewable.filter(c => c.source === "live").length;
  const recentCount = renewable.filter(c => c.source === "recent").length;
  const freshLabel  = lastFetched
    ? new Date(lastFetched).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  const activeTab = TABS.find(t => t.id === tab)!;

  function filter<T extends { country: string; code: string }>(arr: T[]): T[] {
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr.filter(c => c.country.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }

  return (
    <div className="relative min-h-screen" style={{ zIndex: 3 }}>
      <StarField />

      <div className="relative" style={{ zIndex: 4 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 border-b"
          style={{
            zIndex: 50,
            borderColor: "rgba(120,200,255,0.1)",
            background: "rgba(0,5,18,0.9)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-4">
            <Globe />

            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight title-gradient">
                Climate Action Leaderboard
              </h1>
              <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "var(--text-secondary)" }}>
                World sustainability rankings ·{" "}
                <span style={{ color: "var(--glow-cyan)" }}>
                  {Math.max(renewable.length, carbon.length)} nations
                </span>
              </p>
            </div>

            {/* Status pills — hidden on small screens */}
            <div className="hidden lg:flex items-center gap-2">
              {liveCount > 0   && <Pill color="green" dot blink label={`${liveCount} live`} />}
              {recentCount > 0 && <Pill color="amber" dot   label={`${recentCount} near-RT`} />}
              {lastFetched     && <Pill color="cyan"        label={`${freshLabel} UTC`} />}
            </div>

            {/* Clock */}
            <div className="hidden md:block text-right">
              <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>UTC</div>
              <div className="text-sm font-mono font-semibold glow-cyan" style={{ color: "var(--glow-cyan)" }}>
                {clock}
              </div>
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex-shrink-0"
              style={{
                border: "1px solid rgba(34,211,238,0.25)",
                color: "var(--glow-cyan)",
                background: "rgba(34,211,238,0.07)",
              }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <main className="max-w-5xl mx-auto px-4 py-5">

          {loading && (
            <div className="flex flex-col items-center justify-center py-48 gap-5">
              <div
                className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "rgba(34,211,238,0.4)", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading climate data…</p>
            </div>
          )}

          {error && !loading && (
            <div
              className="text-center p-6 text-sm rounded-xl border"
              style={{ borderColor: "rgba(248,113,113,0.25)", color: "var(--glow-red)", background: "rgba(248,113,113,0.05)" }}
            >
              ⚠ {error} —{" "}
              <button onClick={() => fetchData()} className="underline opacity-70 hover:opacity-100">retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* ── Tab bar (horizontally scrollable) ──────────────────── */}
              <div
                className="flex gap-1 p-1 rounded-xl overflow-x-auto mb-4 no-scrollbar"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTab(t.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0"
                    style={tab === t.id
                      ? { background: "rgba(34,211,238,0.15)", color: "var(--glow-cyan)" }
                      : { color: "var(--text-muted)" }
                    }
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* ── Active tab header (metric explanation + search) ─────── */}
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap gap-y-2">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {activeTab.icon} {activeTab.label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{activeTab.sub}</p>
                </div>
                <input
                  type="text"
                  placeholder="Search country…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg outline-none transition-all w-44"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "rgba(34,211,238,0.4)")}
                  onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>

              {/* ── Glass panel ────────────────────────────────────────── */}
              <div className="glass glass-accent relative animate-fade-in">
                {tab === "renewable" && <RenewableLeaderboard data={filter(renewable)} />}
                {tab === "carbon"    && <CarbonLeaderboard    data={filter(carbon)}    />}
                {tab === "cycling"   && <CyclingLeaderboard   data={filter(cycling)}   />}
                {tab === "forest"    && <ForestLeaderboard    data={filter(forest)}    />}
              </div>
            </>
          )}
        </main>

        <footer
          className="text-center text-xs py-6 border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
        >
          Data: Electricity Maps · Energy-Charts.info · World Bank · Global Carbon Project · ITDP · FAO · Our World in Data
          <br />
          <a href="https://github.com/gypelayo/climate-action-leaderboard" className="hover:opacity-60 transition-opacity mt-1 inline-block">
            github.com/gypelayo/climate-action-leaderboard
          </a>
        </footer>
      </div>
    </div>
  );
}

function Pill({ color, label, dot, blink }: { color: "green"|"cyan"|"amber"|"red"; label: string; dot?: boolean; blink?: boolean }) {
  const cols = {
    green: { bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)",  text: "#34d399" },
    cyan:  { bg: "rgba(34,211,238,0.1)",  border: "rgba(34,211,238,0.25)",  text: "#22d3ee" },
    amber: { bg: "rgba(251,146,60,0.1)",  border: "rgba(251,146,60,0.25)",  text: "#fb923c" },
    red:   { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", text: "#f87171" },
  }[color];
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: cols.bg, border: `1px solid ${cols.border}`, color: cols.text }}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${blink ? "animate-blink" : "animate-pulse-dot"}`} style={{ background: cols.text, color: cols.text }} />}
      {label}
    </span>
  );
}
