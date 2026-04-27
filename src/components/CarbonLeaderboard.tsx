"use client";

import { useState, useMemo, useEffect } from "react";
import type { CountryCarbon } from "@/types";

const PAGE    = 50;
const PARIS   = 2.0;
const BAR_MAX = 32.0;

function SegBar({ co2, color }: { co2: number; color: string }) {
  const filled  = Math.max(0, Math.min(20, Math.round((co2 / BAR_MAX) * 20)));
  const parisAt = Math.round((PARIS / BAR_MAX) * 20); // ~1
  return (
    <span className="seg-bar flex">
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          style={{
            color: i === parisAt ? "rgba(52,211,153,0.7)" : color,
            opacity: i > filled ? 0.13 : 1,
          }}
        >
          {i === parisAt ? "|" : "█"}
        </span>
      ))}
    </span>
  );
}

function getColor(co2: number) {
  if (co2 <= 0.5)  return "#34d399";  // emerald
  if (co2 <= 2.0)  return "#2dd4bf";  // teal
  if (co2 <= 5.0)  return "#22d3ee";  // cyan
  if (co2 <= 10.0) return "#fb923c";  // amber
  if (co2 <= 18.0) return "#f97316";  // orange
  return "#f87171";                    // red
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

export default function CarbonLeaderboard({ data, search = "" }: { data: CountryCarbon[]; search?: string }) {
  const [page,  setPage]  = useState(1);
  const [asc,   setAsc]   = useState(true);

  const sorted     = [...data].sort((a, b) => asc ? a.co2PerCapita - b.co2PerCapita : b.co2PerCapita - a.co2PerCapita);
  const rankOf = useMemo(() => { const m = new Map<string,number>(); sorted.forEach((c,i)=>m.set(c.code,i+1)); return m; }, [sorted]);
  const filtered = useMemo(() => { if (!search.trim()) return sorted; const q=search.toLowerCase(); return sorted.filter(c=>c.country.toLowerCase().includes(q)||c.code.toLowerCase().includes(q)); }, [sorted,search]);
  useEffect(()=>{setPage(1);},[search]);
  const totalPages = Math.ceil(filtered.length / PAGE);
  const visible    = filtered.slice((page - 1) * PAGE, page * PAGE);

  const avg     = data.length ? data.reduce((s, c) => s + c.co2PerCapita, 0) / data.length : 0;
  const best    = [...data].sort((a, b) => a.co2PerCapita - b.co2PerCapita)[0];
  const onTrack = data.filter(c => c.co2PerCapita <= PARIS).length;

  // Most recent year available in the dataset
  const latestYear = data.length ? Math.max(...data.map(c => c.year)) : 2022;

  if (!data.length)
    return <p className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>No results</p>;

  return (
    <>
      {/* Stats strip */}
      <div
        className="grid grid-cols-3 divide-x text-center"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Stat label="Global avg" value={`${avg.toFixed(1)} t`} color="var(--glow-cyan)" />
        <Stat label="Lowest (best)" value={best ? `${best.flag} ${best.country}` : "—"} sub={best ? `${best.co2PerCapita} t` : ""} color="#34d399" />
        <Stat label="Paris-track ≤2t" value={`${onTrack} / ${data.length}`} color="var(--glow-amber)" />
      </div>

      {/* Paris callout */}
      <div
        className="flex items-center gap-2.5 px-5 py-2.5 text-xs border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(52,211,153,0.04)" }}
      >
        <span className="text-base">🎯</span>
        <span style={{ color: "var(--text-secondary)" }}>
          Paris target: ≤ 2 t CO₂ per person / year by 2050.{" "}
          <span style={{ color: "#34d399", fontWeight: 600 }}>{onTrack} of {data.length}</span> nations already there.
          {" "}Green marker <span style={{ color: "#34d399" }}>|</span> on each bar shows the threshold.
          {" "}<span style={{ color: "var(--text-muted)" }}>Data year: up to {latestYear}.</span>
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid items-center px-4 py-2 text-xs sticky top-0"
        style={{
          gridTemplateColumns: "36px 1fr 180px 52px",
          gap: "8px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(4,12,32,0.95)",
          color: "var(--text-muted)",
          zIndex: 10,
        }}
      >
        <div className="text-center">#</div>
        <div>Country</div>
        <button
          className="text-right hover:opacity-70 transition-opacity"
          onClick={() => { setAsc(a => !a); setPage(1); }}
        >
          CO₂ / capita {asc ? "▲" : "▼"}
        </button>
        <div className="text-right">Year</div>
      </div>

      {/* Rows */}
      {visible.map((c, i) => {
        const rank    = rankOf.get(c.code) ?? i + 1;
        const col     = getColor(c.co2PerCapita);
        const onParis = c.co2PerCapita <= PARIS;

        return (
          <div
            key={c.code}
            className="data-row grid items-center px-4 py-3"
            style={{
              gridTemplateColumns: "36px 1fr 180px 52px",
              gap: "8px",
              borderLeft: onParis ? "2px solid rgba(52,211,153,0.45)" : "2px solid transparent",
            }}
          >
            {/* Rank */}
            <div className="flex justify-center text-sm"><Rank n={rank} /></div>

            {/* Country */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none flex-shrink-0">{c.flag}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {c.country}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.code}</div>
              </div>
            </div>

            {/* Bar + value */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className="font-mono font-bold text-sm" style={{ color: col }}>
                  {c.co2PerCapita.toFixed(2)} t
                </span>
                {onParis && (
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}
                  >
                    ✓ Paris
                  </span>
                )}
              </div>
              <SegBar co2={c.co2PerCapita} color={col} />
            </div>

            {/* Year */}
            <div className="text-right text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {c.year}
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-5 py-3 border-t text-sm"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-30"
            style={{ border: "1px solid rgba(34,211,238,0.2)", color: "var(--glow-cyan)", background: "rgba(34,211,238,0.06)" }}
          >
            ← Prev
          </button>
          <span style={{ color: "var(--text-muted)" }}>
            {page} / {totalPages} · {filtered.length === data.length ? data.length : `${filtered.length} of ${data.length}`} nations
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-30"
            style={{ border: "1px solid rgba(34,211,238,0.2)", color: "var(--glow-cyan)", background: "rgba(34,211,238,0.06)" }}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}
