"use client";

import { useState } from "react";
import type { CountryCycling } from "@/types";

const PAGE    = 50;
const BAR_MAX = 30; // Netherlands is 27%, so 30% = full bar

function SegBar({ pct, color }: { pct: number; color: string }) {
  const filled = Math.max(0, Math.min(20, Math.round((pct / BAR_MAX) * 20)));
  return (
    <span className="seg-bar" style={{ color }}>
      {"█".repeat(filled)}
      <span style={{ opacity: 0.13 }}>{"█".repeat(20 - filled)}</span>
    </span>
  );
}

function getColor(pct: number) {
  if (pct >= 15) return "#34d399";
  if (pct >= 8)  return "#2dd4bf";
  if (pct >= 4)  return "#22d3ee";
  if (pct >= 2)  return "#fb923c";
  return "#94a3b8";
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

export default function CyclingLeaderboard({ data }: { data: CountryCycling[] }) {
  const [page, setPage] = useState(1);
  const [asc,  setAsc]  = useState(false);

  const sorted     = [...data].sort((a, b) => asc ? a.modalShare - b.modalShare : b.modalShare - a.modalShare);
  const totalPages = Math.ceil(sorted.length / PAGE);
  const visible    = sorted.slice((page - 1) * PAGE, page * PAGE);

  const avg     = data.length ? data.reduce((s, c) => s + c.modalShare, 0) / data.length : 0;
  const best    = sorted[0];
  const over10  = data.filter(c => c.modalShare >= 10).length;

  if (!data.length)
    return <p className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>No data</p>;

  return (
    <>
      {/* Stats strip */}
      <div className="grid grid-cols-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Stat label="Global avg"      value={`${avg.toFixed(1)}%`}    color="var(--glow-cyan)"  />
        <Stat label="Most cycling"    value={best ? `${best.flag} ${best.country}` : "—"} sub={best ? `${best.modalShare}% of trips` : ""} color="#34d399" />
        <Stat label="≥10% modal share" value={`${over10} / ${data.length}`} color="var(--glow-amber)" />
      </div>

      {/* Context note */}
      <div
        className="flex items-start gap-2.5 px-5 py-2.5 text-xs border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(34,211,238,0.03)" }}
      >
        <span className="text-base flex-shrink-0">🚴</span>
        <span style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Modal share</strong> = % of all daily trips made by bicycle.
          Sources: Eurobarometer 2022 (EU), ITDP Global Cycling Cities reports, national transport surveys.
          National averages mask large variation between cities.
        </span>
      </div>

      {/* Column header */}
      <div
        className="grid items-center px-4 py-2 text-xs sticky top-0"
        style={{
          gridTemplateColumns: "36px 1fr 160px 60px",
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
          Modal share {asc ? "▲" : "▼"}
        </button>
        <div className="text-right">Year</div>
      </div>

      {/* Rows */}
      {visible.map((c, i) => {
        const rank = (page - 1) * PAGE + i + 1;
        const col  = getColor(c.modalShare);
        return (
          <div
            key={c.code}
            className="data-row grid items-center px-4 py-3"
            style={{ gridTemplateColumns: "36px 1fr 160px 60px", gap: "8px" }}
          >
            <div className="flex justify-center text-sm"><Rank n={rank} /></div>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none flex-shrink-0">{c.flag}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.country}</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.code}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-sm mb-1" style={{ color: col }}>
                {c.modalShare.toFixed(1)}%
              </div>
              <SegBar pct={c.modalShare} color={col} />
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
