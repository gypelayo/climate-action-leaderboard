"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { CountryRenewable, CountryCarbon } from "@/types";
import RenewableLeaderboard from "@/components/RenewableLeaderboard";
import CarbonLeaderboard    from "@/components/CarbonLeaderboard";
import StarField            from "@/components/StarField";
import Globe                from "@/components/Globe";
import { RefreshCw }        from "lucide-react";

function useMissionClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toUTCString().slice(17, 25) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

type Tab = "renewable" | "carbon";

export default function Dashboard() {
  const [renewable, setRenewable] = useState<CountryRenewable[]>([]);
  const [carbon,    setCarbon]    = useState<CountryCarbon[]>([]);
  const [lastFetched, setLastFetched] = useState("");
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [tab,       setTab]       = useState<Tab>("renewable");
  const [renewSearch, setRenewSearch] = useState("");
  const [carbSearch,  setCarbSearch]  = useState("");
  const clock = useMissionClock();

  const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const fetchData = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/data/combined.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRenewable(j.renewable ?? []);
      setCarbon(j.carbon ?? []);
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
  const totalCountries = Math.max(renewable.length, carbon.length);

  const freshLabel = lastFetched
    ? new Date(lastFetched).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  const filteredR = renewable.filter(c =>
    c.country.toLowerCase().includes(renewSearch.toLowerCase()) ||
    c.code.toLowerCase().includes(renewSearch.toLowerCase())
  );
  const filteredC = carbon.filter(c =>
    c.country.toLowerCase().includes(carbSearch.toLowerCase()) ||
    c.code.toLowerCase().includes(carbSearch.toLowerCase())
  );

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ zIndex: 3 }}>
      <StarField />

      {/* Everything above the starfield */}
      <div className="relative" style={{ zIndex: 4 }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 border-b px-4 py-3"
          style={{
            zIndex: 50,
            borderColor: "var(--hud-border)",
            background: "rgba(0,6,18,0.85)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div className="max-w-[1600px] mx-auto flex items-center gap-4 flex-wrap">
            <Globe />

            {/* Title block */}
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] font-mono tracking-[0.3em] uppercase mb-0.5"
                style={{ color: "rgba(0,229,255,0.5)" }}
              >
                ◈ ORBITAL CLIMATE MONITOR · EARTH
              </div>
              <h1
                className="text-base sm:text-xl font-bold tracking-widest uppercase leading-tight glow-cyan"
                style={{ color: "var(--hud-cyan)", fontFamily: "var(--font-mono)" }}
              >
                WORLD CLIMATE ACTION LEADERBOARD
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                <StatusPill color="green" label={`${totalCountries} NATIONS TRACKED`} />
                {liveCount > 0 && <StatusPill color="green" blink label={`${liveCount} LIVE`} />}
                {recentCount > 0 && <StatusPill color="amber" label={`${recentCount} NEAR-REAL-TIME`} />}
                <StatusPill color="cyan" label={`DATA: ${freshLabel}`} />
              </div>
            </div>

            {/* Right: clock + refresh */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="text-right hidden sm:block">
                <div className="text-[9px] font-mono tracking-widest" style={{ color: "rgba(0,229,255,0.4)" }}>
                  MISSION CLOCK
                </div>
                <div
                  className="text-sm font-mono font-bold animate-data-flicker glow-cyan"
                  style={{ color: "var(--hud-cyan)" }}
                >
                  {clock}
                </div>
              </div>
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold tracking-widest uppercase transition-all disabled:opacity-40"
                style={{
                  border: "1px solid rgba(0,229,255,0.3)",
                  color: "var(--hud-cyan)",
                  background: "rgba(0,229,255,0.05)",
                }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">REFRESH</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <main className="max-w-[1600px] mx-auto p-4">

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-40 gap-5">
              <div
                className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--hud-cyan)", borderTopColor: "transparent" }}
              />
              <p className="font-mono text-xs tracking-widest uppercase" style={{ color: "rgba(0,229,255,0.5)" }}>
                ACQUIRING TELEMETRY…
              </p>
            </div>
          )}

          {error && !loading && (
            <div
              className="text-center p-6 font-mono text-sm border rounded"
              style={{ borderColor: "rgba(255,59,59,0.3)", color: "var(--hud-red)", background: "rgba(255,0,0,0.05)" }}
            >
              ⚠ SIGNAL ERROR: {error} —{" "}
              <button onClick={() => fetchData()} className="underline hover:opacity-70">RETRY</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Mobile tabs */}
              <div className="flex lg:hidden gap-2 mb-4">
                {(["renewable", "carbon"] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="flex-1 py-2 text-xs font-mono font-bold tracking-widest uppercase transition-all"
                    style={{
                      border: "1px solid",
                      borderColor: tab === t ? "var(--hud-cyan)" : "rgba(0,229,255,0.2)",
                      color:       tab === t ? "var(--hud-cyan)" : "rgba(0,229,255,0.4)",
                      background:  tab === t ? "rgba(0,229,255,0.08)" : "transparent",
                    }}
                  >
                    {t === "renewable" ? "⚡ RENEWABLE" : "🌿 CARBON"}
                  </button>
                ))}
              </div>

              {/* Desktop: two panels side-by-side / Mobile: single tab */}
              <div className="flex flex-col lg:flex-row gap-4">

                {/* Renewable panel */}
                <div className={`flex-1 min-w-0 ${tab === "carbon" ? "hidden lg:flex lg:flex-col" : "flex flex-col"}`}>
                  <PanelHeader
                    title="⚡ RENEWABLE ENERGY"
                    subtitle="% of electricity from clean sources"
                    search={renewSearch}
                    onSearch={setRenewSearch}
                    count={filteredR.length}
                  />
                  <div
                    className="hud-panel flex-1 overflow-y-auto animate-slide-in"
                    style={{ maxHeight: "calc(100vh - 220px)" }}
                  >
                    <span className="hud-corner-bl" /><span className="hud-corner-br" />
                    <RenewableLeaderboard data={filteredR} />
                  </div>
                </div>

                {/* Divider (desktop only) */}
                <div
                  className="hidden lg:block w-px flex-shrink-0 self-stretch"
                  style={{ background: "linear-gradient(to bottom, transparent, var(--hud-border), transparent)" }}
                />

                {/* Carbon panel */}
                <div className={`flex-1 min-w-0 ${tab === "renewable" ? "hidden lg:flex lg:flex-col" : "flex flex-col"}`}>
                  <PanelHeader
                    title="🌿 CARBON FOOTPRINT"
                    subtitle="tonnes CO₂ per capita per year"
                    search={carbSearch}
                    onSearch={setCarbSearch}
                    count={filteredC.length}
                  />
                  <div
                    className="hud-panel flex-1 overflow-y-auto animate-slide-in"
                    style={{ maxHeight: "calc(100vh - 220px)" }}
                  >
                    <span className="hud-corner-bl" /><span className="hud-corner-br" />
                    <CarbonLeaderboard data={filteredC} />
                  </div>
                </div>

              </div>
            </>
          )}
        </main>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer
          className="text-center font-mono text-[9px] tracking-widest py-6 border-t"
          style={{ borderColor: "var(--hud-border)", color: "rgba(0,229,255,0.25)" }}
        >
          DATA SOURCES: ELECTRICITY MAPS · ENERGY-CHARTS.INFO (FRAUNHOFER ISE / ENTSO-E) · GLOBAL CARBON PROJECT · OUR WORLD IN DATA
          <br />
          <a
            href="https://github.com/gypelayo/climate-action-leaderboard"
            className="hover:opacity-60 transition-opacity"
          >
            GITHUB.COM/GYPELAYO/CLIMATE-ACTION-LEADERBOARD
          </a>
        </footer>
      </div>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────────────── */

function StatusPill({
  color, label, blink,
}: { color: "green" | "amber" | "cyan" | "red"; label: string; blink?: boolean }) {
  const colors = {
    green: { dot: "#00ff88", text: "rgba(0,255,136,0.7)" },
    cyan:  { dot: "#00e5ff", text: "rgba(0,229,255,0.6)" },
    amber: { dot: "#ffaa00", text: "rgba(255,170,0,0.7)" },
    red:   { dot: "#ff3b3b", text: "rgba(255,59,59,0.8)" },
  }[color];
  return (
    <span className="flex items-center gap-1" style={{ color: colors.text }}>
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${blink ? "animate-blink" : "animate-pulse-dot"}`}
        style={{ background: colors.dot, color: colors.dot }}
      />
      <span className="text-[9px] font-mono tracking-widest uppercase">{label}</span>
    </span>
  );
}

function PanelHeader({
  title, subtitle, search, onSearch, count,
}: {
  title: string; subtitle: string;
  search: string; onSearch: (v: string) => void;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
      <div>
        <div
          className="text-xs font-mono font-bold tracking-widest uppercase glow-cyan"
          style={{ color: "var(--hud-cyan)" }}
        >
          {title}
        </div>
        <div className="text-[9px] font-mono tracking-widest" style={{ color: "rgba(0,229,255,0.35)" }}>
          {subtitle} · {count} nations
        </div>
      </div>
      <input
        type="text"
        placeholder="SEARCH…"
        value={search}
        onChange={e => onSearch(e.target.value)}
        className="px-3 py-1.5 text-xs font-mono tracking-wider uppercase bg-transparent outline-none w-40 transition-all"
        style={{
          border: "1px solid rgba(0,229,255,0.2)",
          color: "var(--hud-cyan)",
          caretColor: "var(--hud-cyan)",
        }}
        onFocus={e => (e.target.style.borderColor = "rgba(0,229,255,0.6)")}
        onBlur={e  => (e.target.style.borderColor = "rgba(0,229,255,0.2)")}
      />
    </div>
  );
}
