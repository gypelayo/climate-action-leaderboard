"use client";

import { useState } from "react";
import type { CountryRenewable } from "@/types";

const PAGE = 50;

/** Unicode block bar — fills N of 20 segments */
function SegBar({ pct, color }: { pct: number; color: string }) {
  const filled = Math.max(0, Math.min(20, Math.round((pct / 100) * 20)));
  return (
    <span className="seg-bar" style={{ color }}>
      {"█".repeat(filled)}
      <span style={{ color, opacity: 0.15 }}>{"█".repeat(20 - filled)}</span>
    </span>
  );
}

function getColor(pct: number): string {
  if (pct >= 90) return "var(--hud-green)";
  if (pct >= 65) return "#00ffcc";
  if (pct >= 45) return "var(--hud-cyan)";
  if (pct >= 25) return "var(--hud-amber)";
  if (pct >= 10) return "#ff8800";
  return "var(--hud-red)";
}

function SourceTag({ source }: { source: CountryRenewable["source"] }) {
  if (source === "live")
    return (
      <span className="font-mono text-[9px] tracking-widest" style={{ color: "var(--hud-green)" }}>
        <span className="animate-blink">●</span> LIVE
      </span>
    );
  if (source === "recent")
    return (
      <span className="font-mono text-[9px] tracking-widest" style={{ color: "var(--hud-amber)" }}>
        ◉ NEAR-RT
      </span>
    );
  return (
    <span className="font-mono text-[9px] tracking-widest" style={{ color: "rgba(0,229,255,0.3)" }}>
      ○ ANNUAL
    </span>
  );
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

export default function RenewableLeaderboard({ data }: { data: CountryRenewable[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [sortAsc, setSortAsc]   = useState(false);

  const sorted = [...data].sort((a, b) =>
    sortAsc ? a.renewablePercent - b.renewablePercent : b.renewablePercent - a.renewablePercent
  );

  const totalPages = Math.ceil(sorted.length / PAGE);
  const visible    = sorted.slice((page - 1) * PAGE, page * PAGE);

  // Summary stats
  const avg  = data.length ? data.reduce((s, c) => s + c.renewablePercent, 0) / data.length : 0;
  const best = data[0];
  const worst = data[data.length - 1];
  const over50 = data.filter(c => c.renewablePercent >= 50).length;

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
          { label: "GLOBAL AVG",   val: `${avg.toFixed(1)}%`,    color: "var(--hud-cyan)"  },
          { label: "BEST",         val: best ? `${best.flag} ${best.country}` : "—", sub: best ? `${best.renewablePercent.toFixed(1)}%` : "", color: "var(--hud-green)" },
          { label: "WORST",        val: worst ? `${worst.flag} ${worst.country}` : "—", sub: worst ? `${worst.renewablePercent.toFixed(1)}%` : "", color: "var(--hud-red)"   },
          { label: "≥50% CLEAN",   val: `${over50}/${data.length}`, color: "var(--hud-amber)" },
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

      {/* ── Column header ───────────────────────────────────────────── */}
      <div
        className="grid grid-cols-12 gap-1 px-3 py-2 border-b font-mono text-[8px] tracking-widest uppercase sticky top-0"
        style={{ borderColor: "rgba(0,229,255,0.08)", color: "rgba(0,229,255,0.35)", background: "rgba(0,6,18,0.95)", zIndex: 10 }}
      >
        <div className="col-span-1 text-center">RNK</div>
        <div className="col-span-4">NATION</div>
        <div className="col-span-5">
          <button
            className="hover:opacity-80 transition-opacity flex items-center gap-1"
            onClick={() => { setSortAsc(s => !s); setPage(1); }}
          >
            RENEWABLE % {sortAsc ? "▲" : "▼"}
          </button>
        </div>
        <div className="col-span-2 text-right hidden sm:block">STATUS</div>
      </div>

      {/* ── Rows ────────────────────────────────────────────────────── */}
      {visible.map((c, i) => {
        const rank    = (page - 1) * PAGE + i + 1;
        const col     = getColor(c.renewablePercent);
        const isOpen  = expanded === c.code;
        const hasBD   = c.breakdown && Object.keys(c.breakdown).length > 0;

        return (
          <div key={c.code}>
            <button
              className="hud-row w-full grid grid-cols-12 gap-1 px-3 py-2.5 text-left items-center"
              onClick={() => setExpanded(isOpen ? null : c.code)}
            >
              <div className="col-span-1 flex justify-center">
                <RankLabel n={rank} />
              </div>

              <div className="col-span-4 flex items-center gap-2 min-w-0">
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

              <div className="col-span-5 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs tabular-nums" style={{ color: col }}>
                    {c.renewablePercent.toFixed(1)}%
                  </span>
                </div>
                <SegBar pct={c.renewablePercent} color={col} />
              </div>

              <div className="col-span-2 text-right hidden sm:flex sm:justify-end sm:items-center">
                <SourceTag source={c.source} />
              </div>
            </button>

            {/* Breakdown drawer */}
            {isOpen && hasBD && (
              <div
                className="px-4 pb-3 pt-1 border-b"
                style={{ borderColor: "rgba(0,229,255,0.08)", background: "rgba(0,20,10,0.6)" }}
              >
                <div className="font-mono text-[8px] tracking-widest mb-2" style={{ color: "rgba(0,229,255,0.4)" }}>
                  ▸ ENERGY MIX BREAKDOWN
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(c.breakdown!).map(([src, val]) => (
                    <div
                      key={src}
                      className="px-2 py-1 border text-center"
                      style={{ borderColor: "rgba(0,229,255,0.15)", minWidth: 60 }}
                    >
                      <div className="font-mono text-[8px] tracking-widest capitalize" style={{ color: "rgba(0,229,255,0.4)" }}>
                        {src}
                      </div>
                      <div className="font-mono font-bold text-xs" style={{ color: getColor(val as number) }}>
                        {(val as number).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="font-mono text-[8px] mt-2" style={{ color: "rgba(0,229,255,0.25)" }}>
                  SRC:{" "}
                  {c.source === "live"   ? "ELECTRICITY MAPS (REAL-TIME)" :
                   c.source === "recent" ? "ENERGY-CHARTS.INFO / ENTSO-E" :
                                           "OUR WORLD IN DATA / IRENA (ANNUAL)"}
                  {c.source !== "annual" && c.updatedAt !== "2023"
                    ? `  ·  ${new Date(c.updatedAt).toLocaleTimeString()}`
                    : "  ·  2022-2023 BASELINE"}
                </div>
              </div>
            )}
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
