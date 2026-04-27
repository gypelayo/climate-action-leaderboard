"use client";

import { useEffect, useState, useCallback } from "react";
import type { CountryRenewable, CountryCarbon } from "@/types";
import RenewableLeaderboard from "@/components/RenewableLeaderboard";
import CarbonLeaderboard from "@/components/CarbonLeaderboard";
import { RefreshCw, Zap, Leaf, Globe2, Info } from "lucide-react";

type Tab = "renewable" | "carbon";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("renewable");
  const [renewable, setRenewable] = useState<CountryRenewable[]>([]);
  const [carbon, setCarbon] = useState<CountryCarbon[]>([]);
  const [lastFetched, setLastFetched] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  // NEXT_PUBLIC_BASE_PATH is set to /climate-action-leaderboard in GitHub Actions;
  // empty string locally — so the fetch always resolves correctly.
  const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/data/combined.json`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load data");
      const json = await res.json();
      setRenewable(json.renewable || []);
      setCarbon(json.carbon || []);
      setLastFetched(json.lastFetched || "");
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 15 minutes
    const interval = setInterval(() => fetchData(true), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredRenewable = renewable.filter(
    (c) =>
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCarbon = carbon.filter(
    (c) =>
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const liveCount = renewable.filter((c) => c.source === "live").length;
  const recentCount = renewable.filter((c) => c.source === "recent").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Climate Action Leaderboard
              </h1>
              <p className="text-xs text-emerald-400/80">World rankings · Updated in real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="hidden sm:block text-xs text-slate-400">
                Updated {new Date(lastFetched).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info banner */}
        {showInfo && (
          <div className="max-w-7xl mx-auto px-4 pb-4">
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 text-sm text-slate-300 space-y-1">
              <p>
                <span className="text-emerald-400 font-semibold">🟢 Live</span> — Real-time data from Electricity Maps API (15-min intervals, key required)
              </p>
              <p>
                <span className="text-yellow-400 font-semibold">🟡 Recent</span> — Near real-time from Energy-Charts.info / ENTSO-E (no key needed, European grids)
              </p>
              <p>
                <span className="text-slate-400 font-semibold">⚪ Annual</span> — Annual averages from Our World in Data / Global Carbon Project (2022-2023)
              </p>
              <p className="text-slate-500 text-xs pt-1">
                Carbon footprint data: Global Carbon Project &amp; Our World in Data. Renewable % = share of electricity generation excluding nuclear.
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Data freshness badges */}
      {!loading && (
        <div className="max-w-7xl mx-auto px-4 pt-4 flex gap-3 flex-wrap">
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              {liveCount} countries live
            </span>
          )}
          {recentCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              {recentCount} near real-time
            </span>
          )}
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            {renewable.length - liveCount - recentCount} annual baseline
          </span>
        </div>
      )}

      {/* Tab bar + Search */}
      <div className="max-w-7xl mx-auto px-4 pt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex rounded-xl bg-black/30 border border-white/10 p-1 gap-1">
          <button
            onClick={() => setTab("renewable")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "renewable"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4" />
            Renewable Energy
          </button>
          <button
            onClick={() => setTab("carbon")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "carbon"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Leaf className="w-4 h-4" />
            Carbon Footprint
          </button>
        </div>

        <input
          type="text"
          placeholder="Search country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-white placeholder-slate-500 text-sm outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Fetching climate data…</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-6 text-center text-red-400">
            {error} —{" "}
            <button onClick={() => fetchData()} className="underline hover:text-red-300">
              retry
            </button>
          </div>
        )}

        {!loading && !error && tab === "renewable" && (
          <RenewableLeaderboard data={filteredRenewable} />
        )}
        {!loading && !error && tab === "carbon" && (
          <CarbonLeaderboard data={filteredCarbon} />
        )}
      </main>

      <footer className="text-center text-xs text-slate-600 py-8 border-t border-white/5">
        Data sources: Electricity Maps · Energy-Charts.info (Fraunhofer ISE / ENTSO-E) · Global Carbon Project · Our World in Data
        <br />
        <a href="https://github.com/gypelayo/climate-action-leaderboard" className="hover:text-slate-400 transition-colors mt-1 inline-block">
          github.com/gypelayo/climate-action-leaderboard
        </a>
      </footer>
    </div>
  );
}
