"use client";

import { useState } from "react";
import type { CountryForest } from "@/types";

const PAGE = 50;

type SortMode = "percent" | "km2";

function SegBar({ pct, color }: { pct: number; color: string }) {
  // % coverage: 0–100%
  const filled = Math.max(0, Math.min(20, Math.round((pct / 100) * 20)));
  return (
    <span className="seg-bar" style={{ color }}>
      {"█".repeat(filled)}
      <span style={{ opacity: 0.13 }}>{"█".repeat(20 - filled)}</span>
    </span>
  );
}

function getColor(pct: number) {
  if (pct >= 60) return "#34d399";
  if (pct >= 40) return "#2dd4bf";
  if (pct >= 20) return "#22d3ee";
  if (pct >= 10) return "#fb923c";
  return "#f87171";
}

function fmt(km2: number): string {
  if (km2 >= 1_000_000) return `${(km2 / 1_000_000).toFixed(2)}M km²`;
  if (km2 >= 1_000)     return `${(km2 / 1_000).toFixed(1)}k km²`;
  return `${km2.toFixed(0)} km²`;
}

function Rank({ n }: { n: number }) {
  if (n === 1) return <span>🥇</span>;
  if (n === 2) return <span>🥈</span>;
  if (n === 3) return <span>🥉</span>;
  return <span className="font-mono text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{n}</span>;
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="py-3 px-4">
      <div className="text-[9px] mb-1 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-sm font-semibold truncate" style={{ color }}>{value}</div>
      {sub && <div className="text-xs font-mono" style={{ color }}>{sub}</div>}
    </div>
  );
}

export default function ForestLeaderboard({ data }: { data: CountryForest[] }) {
  const [page,     setPage]     = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>("percent");
  const [asc,      setAsc]      = useState(false);

  const sorted = [...data].sort((a, b) => {
    const va = sortMode === "percent" ? a.forestPercent : a.forestKm2;
    const vb = sortMode === "percent" ? b.forestPercent : b.forestKm2;
    return asc ? va - vb : vb - va;
  });

  const totalPages = Math.ceil(sorted.length / PAGE);
  const visible    = sorted.slice((page - 1) * PAGE, page * PAGE);

  const avgPct      = data.length ? data.reduce((s, c) => s + c.forestPercent, 0) / data.length : 0;
  const totalKm2    = data.reduce((s, c) => s + c.forestKm2, 0);
  const over50      = data.filter(c => c.forestPercent >= 50).length;
  const latestYear  = data.length ? Math.max(...data.map(c => c.year)) : 2022;

  if (!data.length)
    return <p className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>No data — World Bank API unavailable during build</p>;

  return (
    <>
      {/* Stats strip */}
      <div className="grid grid-cols-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Stat label="Avg coverage"   value={`${avgPct.toFixed(1)}%`}  color="var(--glow-cyan)" />
        <Stat label="Total tracked"  value={fmt(totalKm2)} sub={`across ${data.length} nations`} color="#34d399" />
        <Stat label="≥50% forested"  value={`${over50} / ${data.length}`} color="var(--glow-amber)" />
      </div>

      {/* Context + sort toggle */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-2.5 border-b flex-wrap gap-y-2"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(52,211,153,0.03)" }}
      >
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span className="text-base">🌳</span>
          <span>
            Data: World Bank / FAO Global Forest Resources Assessment · Most recent year: {latestYear}
          </span>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["percent", "km2"] as SortMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setSortMode(m); setAsc(false); setPage(1); }}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all"
              style={sortMode === m
                ? { background: "rgba(52,211,153,0.2)", color: "#34d399" }
                : { color: "var(--text-muted)" }
              }
            >
              {m === "percent" ? "% coverage" : "km² area"}
            </button>
          ))}
        </div>
      </div>

      {/* Column header */}
      <div
        className="grid items-center px-4 py-2 text-xs sticky top-0"
        style={{
          gridTemplateColumns: "36px 1fr 80px 160px 52px",
          gap: "8px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(4,12,32,0.95)",
          color: "var(--text-muted)",
          zIndex: 10,
        }}
      >
        <div className="text-center">#</div>
        <div>Country</div>
        <button className="text-right hover:opacity-70 transition-opacity" onClick={() => { setSortMode("km2"); setAsc(a => !a); setPage(1); }}>
          km²
        </button>
        <button className="text-right hover:opacity-70 transition-opacity" onClick={() => { setSortMode("percent"); setAsc(a => !a); setPage(1); }}>
          % coverage {sortMode === "percent" ? (asc ? "▲" : "▼") : ""}
        </button>
        <div className="text-right">Year</div>
      </div>

      {/* Rows */}
      {visible.map((c, i) => {
        const rank = (page - 1) * PAGE + i + 1;
        const col  = getColor(c.forestPercent);
        return (
          <div
            key={c.code}
            className="data-row grid items-center px-4 py-3"
            style={{ gridTemplateColumns: "36px 1fr 80px 160px 52px", gap: "8px" }}
          >
            <div className="flex justify-center text-sm"><Rank n={rank} /></div>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none flex-shrink-0">{c.flag}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.country}</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.code}</div>
              </div>
            </div>
            <div className="text-right font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
              {fmt(c.forestKm2)}
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-sm mb-1" style={{ color: col }}>
                {c.forestPercent.toFixed(1)}%
              </div>
              <SegBar pct={c.forestPercent} color={col} />
            </div>
            <div className="text-right text-xs font-mono" style={{ color: "var(--text-muted)" }}>{c.year}</div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t text-sm" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-30" style={{ border: "1px solid rgba(34,211,238,0.2)", color: "var(--glow-cyan)", background: "rgba(34,211,238,0.06)" }}>← Prev</button>
          <span style={{ color: "var(--text-muted)" }}>{page} / {totalPages} · {sorted.length} nations</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-30" style={{ border: "1px solid rgba(34,211,238,0.2)", color: "var(--glow-cyan)", background: "rgba(34,211,238,0.06)" }}>Next →</button>
        </div>
      )}
    </>
  );
}
