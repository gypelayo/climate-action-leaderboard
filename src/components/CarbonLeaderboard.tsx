"use client";

import { useState } from "react";
import type { CountryCarbon } from "@/types";

const PAGE       = 50;
const PARIS      = 2.0;   // tonnes — Paris pathway target
const BAR_MAX    = 32.0;  // scale cap for the bar

function SegBar({ co2, color }: { co2: number; color: string }) {
  const filled = Math.max(0, Math.min(20, Math.round((co2 / BAR_MAX) * 20)));
  const parisAt = Math.round((PARIS / BAR_MAX) * 20);
  return (
    <span className="seg-bar flex items-center gap-px" style={{ color }}>
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          style={{
            opacity: i < filled ? 1 : 0.12,
            color: i === parisAt ? "rgba(0,255,136,0.8)" : color,
          }}
        >
          {i === parisAt ? "|" : "█"}
        </span>
      ))}
    </span>
  );
}

function getColor(co2: number): string {
  if (co2 <= 0.5)  return "var(--hud-green)";
  if (co2 <= 2.0)  return "#00ffcc";
  if (co2 <= 5.0)  return "var(--hud-cyan)";
  if (co2 <= 10.0) return "var(--hud-amber)";
  if (co2 <= 18.0) return "#ff8800";
  return "var(--hud-red)";
}

function RankLabel({ n }: { n: number }) {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  if (medals[n]) return <span className="text-base leading-none">{medals[n]}</span>;
  return (
    <span className="font-mono text-[10px] tabular-nums" style={{ color: "rgba(0,229,255,0.3)" }}>
      {String(n).padStart(3, "0")}
    </span>
  );
}

export default function CarbonLeaderboard({ data }: { data: CountryCarbon[] }) {
  const [page,    setPage]    = useState(1);
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...data].sort((a, b) =>
    sortAsc ? a.co2PerCapita - b.co2PerCapita : b.co2PerCapita - a.co2PerCapita
  );

  const totalPages = Math.ceil(sorted.length / PAGE);
  const visible    = sorted.slice((page - 1) * PAGE, page * PAGE);

  const avg       = data.length ? data.reduce((s, c) => s + c.co2PerCapita, 0) / data.length : 0;
  const best      = sortAsc ? sorted[0] : sorted[sorted.length - 1];
  const worst     = sortAsc ? sorted[sorted.length - 1] : sorted[0];
  const onTrack   = data.filter(c => c.co2PerCapita <= PARIS).length;

  if (!data.length)
    return (
      <p className="text-center py-16 font-mono text-xs" style={{ color: "rgba(0,229,255,0.4)" }}>
        NO SIGNAL
      </p>
    );

  return (
    <div className="text-[11px]">

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-px border-b"
        style={{ borderColor: "rgba(0,229,255,0.08)", background: "rgba(0,229,255,0.04)" }}
      >
        {[
          { label: "GLOBAL AVG",     val: `${avg.toFixed(1)} t`,    color: "var(--hud-cyan)"  },
          { label: "LOWEST (BEST)",  val: best ? `${best.flag} ${best.country}` : "—",  sub: best  ? `${best.co2PerCapita} t`  : "", color: "var(--hud-green)" },
          { label: "HIGHEST (WORST)",val: worst? `${worst.flag} ${worst.country}` : "—", sub: worst ? `${worst.co2PerCapita} t` : "", color: "var(--hud-red)"   },
          { label: "PARIS-TRACK ≤2t",val: `${onTrack}/${data.length}`, color: "var(--hud-amber)" },
        ].map(s => (
          <div key={s.label} className="px-3 py-2.5" style={{ background: "rgba(0,6,18,0.6)" }}>
            <div className="font-mono text-[8px] tracking-widest mb-1" style={{ color: "rgba(0,229,255,0.35)" }}>
              {s.label}
            </div>
            <div className="font-mono font-bold text-xs truncate" style={{ color: s.color }}>
              {s.val}
            </div>
            {s.sub && <div className="font-mono text-[9px]" style={{ color: s.color }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Paris callout */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{ borderColor: "rgba(0,229,255,0.08)", background: "rgba(0,255,136,0.03)" }}
      >
        <span className="text-sm">🎯</span>
        <span className="font-mono text-[9px] tracking-wide" style={{ color: "rgba(0,255,136,0.6)" }}>
          PARIS AGREEMENT TARGET: ≤2 t CO₂ PER PERSON / YEAR BY 2050 · GREEN MARKER ( | ) ON BAR ·{" "}
          <strong style={{ color: "var(--hud-green)" }}>{onTrack} OF {data.length}</strong> NATIONS ALREADY ON TRACK
        </span>
      </div>

      {/* ── Column header ───────────────────────────────────────────── */}
      <div
        className="grid grid-cols-12 gap-1 px-3 py-2 border-b font-mono text-[8px] tracking-widest uppercase sticky top-0"
        style={{ borderColor: "rgba(0,229,255,0.08)", color: "rgba(0,229,255,0.35)", background: "rgba(0,6,18,0.95)", zIndex: 10 }}
      >
        <div className="col-span-1 text-center">RNK</div>
        <div className="col-span-3">NATION</div>
        <div className="col-span-6">
          <button
            className="hover:opacity-80 transition-opacity flex items-center gap-1"
            onClick={() => { setSortAsc(s => !s); setPage(1); }}
          >
            CO₂/CAPITA (t/yr) {sortAsc ? "▲" : "▼"}
          </button>
        </div>
        <div className="col-span-2 text-right">YEAR</div>
      </div>

      {/* ── Rows ────────────────────────────────────────────────────── */}
      {visible.map((c, i) => {
        const rank    = (page - 1) * PAGE + i + 1;
        const col     = getColor(c.co2PerCapita);
        const onParis = c.co2PerCapita <= PARIS;

        return (
          <div
            key={c.code}
            className="hud-row grid grid-cols-12 gap-1 px-3 py-2.5 items-center"
            style={onParis ? { borderLeft: "2px solid rgba(0,255,136,0.5)" } : {}}
          >
            <div className="col-span-1 flex justify-center">
              <RankLabel n={rank} />
            </div>

            <div className="col-span-3 flex items-center gap-2 min-w-0">
              <span className="text-base leading-none flex-shrink-0">{c.flag}</span>
              <div className="min-w-0">
                <div className="font-mono font-bold text-[10px] truncate" style={{ color: "#c8ffe8" }}>
                  {c.country.toUpperCase()}
                </div>
                <div className="font-mono text-[8px]" style={{ color: "rgba(0,229,255,0.3)" }}>
                  {c.code}
                </div>
              </div>
            </div>

            <div className="col-span-6 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs tabular-nums" style={{ color: col }}>
                  {c.co2PerCapita.toFixed(2)} t
                </span>
                {onParis && (
                  <span className="font-mono text-[8px] tracking-widest" style={{ color: "var(--hud-green)" }}>
                    ✓ PARIS
                  </span>
                )}
              </div>
              <SegBar co2={c.co2PerCapita} color={col} />
            </div>

            <div className="col-span-2 text-right font-mono text-[9px]" style={{ color: "rgba(0,229,255,0.3)" }}>
              {c.year}
            </div>
          </div>
        );
      })}

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "rgba(0,229,255,0.08)" }}
        >
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="font-mono text-[9px] tracking-widest px-3 py-1 border transition-all disabled:opacity-30"
            style={{ borderColor: "rgba(0,229,255,0.25)", color: "var(--hud-cyan)" }}
          >
            ◀ PREV
          </button>
          <span className="font-mono text-[9px] tracking-widest" style={{ color: "rgba(0,229,255,0.4)" }}>
            PAGE {page} / {totalPages}  ·  {sorted.length} NATIONS
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="font-mono text-[9px] tracking-widest px-3 py-1 border transition-all disabled:opacity-30"
            style={{ borderColor: "rgba(0,229,255,0.25)", color: "var(--hud-cyan)" }}
          >
            NEXT ▶
          </button>
        </div>
      )}
    </div>
  );
}
