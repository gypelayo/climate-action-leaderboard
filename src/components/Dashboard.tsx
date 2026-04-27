"use client";

import { useEffect, useState, useCallback } from "react";
import type { CountryRenewable, CountryCarbon } from "@/types";
import RenewableLeaderboard from "@/components/RenewableLeaderboard";
import CarbonLeaderboard    from "@/components/CarbonLeaderboard";
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

type Tab = "renewable" | "carbon";

export default function Dashboard() {
  const [renewable,   setRenewable]   = useState<CountryRenewable[]>([]);
  const [carbon,      setCarbon]      = useState<CountryCarbon[]>([]);
  const [lastFetched, setLastFetched] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [tab,         setTab]         = useState<Tab>("renewable");
  const [renewSearch, setRenewSearch] = useState("");
  const [carbSearch,  setCarbSearch]  = useState("");
  const clock = useClock();

  const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
  const freshLabel  = lastFetched
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
    <div className="relative min-h-screen" style={{ zIndex: 3 }}>
      <StarField />

      <div className="relative" style={{ zIndex: 4 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 border-b"
          style={{
            zIndex: 50,
            borderColor: "rgba(120,200,255,0.1)",
            background: "rgba(0, 5, 18, 0.88)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="max-w-[1600px] mx-auto px-5 py-3 flex items-center gap-5">
            <Globe />

            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold leading-tight title-gradient">
                Climate Action Leaderboard
              </h1>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                World sustainability rankings ·{" "}
                <span style={{ color: "var(--glow-cyan)" }}>{Math.max(renewable.length, carbon.length)} nations</span>
              </p>
            </div>

            {/* Status badges */}
            <div className="hidden md:flex items-center gap-2">
              {liveCount > 0 && <Pill color="green" dot blink label={`${liveCount} live`} />}
              {recentCount > 0 && <Pill color="amber" dot label={`${recentCount} near real-time`} />}
              {lastFetched && <Pill color="cyan" label={`Updated ${freshLabel}`} />}
            </div>

            {/* Clock */}
            <div className="hidden lg:block text-right">
              <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>UTC</div>
              <div className="text-sm font-mono font-semibold glow-cyan" style={{ color: "var(--glow-cyan)" }}>
                {clock}
              </div>
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
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

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="max-w-[1600px] mx-auto px-4 py-5">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-48 gap-5">
              <div
                className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "rgba(34,211,238,0.4)", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Loading climate data…
              </p>
            </div>
          )}

          {error && !loading && (
            <div
              className="text-center p-6 text-sm rounded-xl border"
              style={{
                borderColor: "rgba(248,113,113,0.25)",
                color: "var(--glow-red)",
                background: "rgba(248,113,113,0.05)",
              }}
            >
              ⚠ {error} —{" "}
              <button onClick={() => fetchData()} className="underline opacity-70 hover:opacity-100">
                retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Mobile tab bar */}
              <div
                className="flex lg:hidden gap-1 p-1 rounded-xl mb-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {(["renewable", "carbon"] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={tab === t
                      ? { background: "rgba(34,211,238,0.15)", color: "var(--glow-cyan)" }
                      : { color: "var(--text-muted)" }
                    }
                  >
                    {t === "renewable" ? "⚡ Renewable" : "🌿 Carbon"}
                  </button>
                ))}
              </div>

              {/* Two-column layout */}
              <div className="flex flex-col lg:flex-row gap-4">

                {/* ── Renewable panel ──────────────────────────────────── */}
                <section
                  className={`flex-1 min-w-0 flex flex-col glass glass-accent relative animate-fade-in ${
                    tab === "carbon" ? "hidden lg:flex" : "flex"
                  }`}
                >
                  <PanelHeader
                    icon="⚡"
                    title="Renewable Energy"
                    subtitle="Share of electricity from clean sources"
                    count={filteredR.length}
                    search={renewSearch}
                    onSearch={setRenewSearch}
                  />
                  <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 210px)" }}>
                    <RenewableLeaderboard data={filteredR} />
                  </div>
                </section>

                {/* Vertical divider */}
                <div
                  className="hidden lg:block w-px self-stretch flex-shrink-0"
                  style={{ background: "linear-gradient(to bottom, transparent, rgba(120,200,255,0.12), transparent)" }}
                />

                {/* ── Carbon panel ─────────────────────────────────────── */}
                <section
                  className={`flex-1 min-w-0 flex flex-col glass glass-accent relative animate-fade-in ${
                    tab === "renewable" ? "hidden lg:flex" : "flex"
                  }`}
                >
                  <PanelHeader
                    icon="🌿"
                    title="Carbon Footprint"
                    subtitle="Tonnes CO₂ per capita per year"
                    count={filteredC.length}
                    search={carbSearch}
                    onSearch={setCarbSearch}
                  />
                  <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 210px)" }}>
                    <CarbonLeaderboard data={filteredC} />
                  </div>
                </section>
              </div>
            </>
          )}
        </main>

        <footer
          className="text-center text-xs py-6 border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
        >
          Data: Electricity Maps · Energy-Charts.info (Fraunhofer ISE / ENTSO-E) · World Bank · Global Carbon Project · Our World in Data
          <br />
          <a
            href="https://github.com/gypelayo/climate-action-leaderboard"
            className="hover:opacity-60 transition-opacity mt-1 inline-block"
          >
            github.com/gypelayo/climate-action-leaderboard
          </a>
        </footer>
      </div>
    </div>
  );
}

/* ── Shared sub-components ─────────────────────────────────────────────────── */

function Pill({
  color, label, dot, blink,
}: { color: "green"|"cyan"|"amber"|"red"; label: string; dot?: boolean; blink?: boolean }) {
  const cols = {
    green: { bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)",  text: "#34d399" },
    cyan:  { bg: "rgba(34,211,238,0.1)",  border: "rgba(34,211,238,0.25)",  text: "#22d3ee" },
    amber: { bg: "rgba(251,146,60,0.1)",  border: "rgba(251,146,60,0.25)",  text: "#fb923c" },
    red:   { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", text: "#f87171" },
  }[color];
  return (
    <span
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: cols.bg, border: `1px solid ${cols.border}`, color: cols.text }}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${blink ? "animate-blink" : "animate-pulse-dot"}`}
          style={{ background: cols.text, color: cols.text }}
        />
      )}
      {label}
    </span>
  );
}

function PanelHeader({
  icon, title, subtitle, count, search, onSearch,
}: {
  icon: string; title: string; subtitle: string;
  count: number; search: string; onSearch: (v: string) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-5 py-4 border-b flex-wrap gap-y-2"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{icon}</span>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {subtitle} · <span style={{ color: "var(--text-secondary)" }}>{count} nations</span>
          </p>
        </div>
      </div>
      <input
        type="text"
        placeholder="Search country…"
        value={search}
        onChange={e => onSearch(e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg outline-none transition-all w-44"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--text-primary)",
        }}
        onFocus={e  => (e.target.style.borderColor = "rgba(34,211,238,0.4)")}
        onBlur={e   => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
      />
    </div>
  );
}
