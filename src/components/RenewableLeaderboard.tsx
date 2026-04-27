"use client";

import { useState, useMemo, useEffect } from "react";
import type { CountryRenewable } from "@/types";

const PAGE = 50;

function SegBar({ pct, color }: { pct: number; color: string }) {
  const filled = Math.max(0, Math.min(20, Math.round((pct / 100) * 20)));
  return (
    <span className="seg-bar" style={{ color }}>
      {"█".repeat(filled)}
      <span style={{ opacity: 0.14 }}>{"█".repeat(20 - filled)}</span>
    </span>
  );
}

function getColor(pct: number) {
  if (pct >= 90) return "#34d399";  // emerald
  if (pct >= 65) return "#2dd4bf";  // teal
  if (pct >= 45) return "#22d3ee";  // cyan
  if (pct >= 25) return "#fb923c";  // amber
  if (pct >= 10) return "#f97316";  // orange
  return "#f87171";                  // red
}

function SourceDot({ source }: { source: CountryRenewable["source"] }) {
  if (source === "live")
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#34d399" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-blink flex-shrink-0" />
        Live
      </span>
    );
  if (source === "recent")
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#fb923c" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
        ~Real-time
      </span>
    );
  return (
    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Annual</span>
  );
}

function Rank({ n }: { n: number }) {
  if (n === 1) return <span title="1st">🥇</span>;
  if (n === 2) return <span title="2nd">🥈</span>;
  if (n === 3) return <span title="3rd">🥉</span>;
  return (
    <span className="font-mono text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
      {n}
    </span>
  );
}

export default function RenewableLeaderboard({ data, search = "" }: { data: CountryRenewable[]; search?: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page,     setPage]     = useState(1);
  const [asc,      setAsc]      = useState(false);

  // Full sorted list — source of truth for global ranks
  const sorted = useMemo(() =>
    [...data].sort((a, b) => asc ? a.renewablePercent - b.renewablePercent : b.renewablePercent - a.renewablePercent),
    [data, asc]
  );

  // code → 1-based global rank
  const rankOf = useMemo(() => {
    const m = new Map<string, number>();
    sorted.forEach((c, i) => m.set(c.code, i + 1));
    return m;
  }, [sorted]);

  // Filtered subset for display — preserves sort order
  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(c => c.country.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [sorted, search]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.ceil(filtered.length / PAGE);
  const visible    = filtered.slice((page - 1) * PAGE, page * PAGE);

  const avg    = data.length ? data.reduce((s, c) => s + c.renewablePercent, 0) / data.length : 0;
  const best   = sorted[0];
  const over50 = data.filter(c => c.renewablePercent >= 50).length;

  if (!data.length)
    return <p className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>No results</p>;
  if (!filtered.length)
    return <p className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>No results for "{search}"</p>;

  return (
    <>
      {/* Stats strip */}
      <div
        className="grid grid-cols-3 divide-x text-center"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Stat label="Global avg" value={`${avg.toFixed(1)}%`} color="var(--glow-cyan)" />
        <Stat label="Top nation" value={best ? `${best.flag} ${best.country}` : "—"} sub={best ? `${best.renewablePercent.toFixed(1)}%` : ""} color="#34d399" />
        <Stat label="≥50% clean" value={`${over50} / ${data.length}`} color="var(--glow-amber)" />
      </div>

      {/* Column headers */}
      <div
        className="grid items-center px-4 py-2 text-xs sticky top-0"
        style={{
          gridTemplateColumns: "36px 1fr 160px 72px",
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
          Renewable % {asc ? "▲" : "▼"}
        </button>
        <div className="text-right hidden sm:block">Source</div>
      </div>

      {/* Rows */}
      {visible.map((c, i) => {
        const rank   = rankOf.get(c.code) ?? 1;
        const col    = getColor(c.renewablePercent);
        const isOpen = expanded === c.code;
        const hasBD  = c.breakdown && Object.keys(c.breakdown).length > 0;

        return (
          <div key={c.code}>
            <button
              className="data-row w-full text-left"
              onClick={() => setExpanded(isOpen ? null : c.code)}
            >
              <div
                className="grid items-center px-4 py-3"
                style={{ gridTemplateColumns: "36px 1fr 160px 72px", gap: "8px" }}
              >
                {/* Rank */}
                <div className="flex justify-center text-sm">
                  <Rank n={rank} />
                </div>

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
                  <div className="font-mono font-bold text-sm mb-1" style={{ color: col }}>
                    {c.renewablePercent.toFixed(1)}%
                  </div>
                  <SegBar pct={c.renewablePercent} color={col} />
                </div>

                {/* Source */}
                <div className="text-right hidden sm:flex justify-end">
                  <SourceDot source={c.source} />
                </div>
              </div>
            </button>

            {/* Breakdown */}
            {isOpen && hasBD && (
              <div
                className="px-5 pb-4 pt-2"
                style={{ background: "rgba(0,20,40,0.5)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <p className="text-[10px] font-medium mb-2.5" style={{ color: "var(--text-muted)" }}>
                  Energy mix breakdown
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(c.breakdown!).map(([src, val]) => (
                    <div
                      key={src}
                      className="px-2.5 py-1.5 rounded-lg text-center"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", minWidth: 64 }}
                    >
                      <div className="text-[9px] capitalize mb-0.5" style={{ color: "var(--text-muted)" }}>{src}</div>
                      <div className="font-mono font-bold text-xs" style={{ color: getColor(val as number) }}>
                        {(val as number).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] mt-2.5" style={{ color: "var(--text-muted)" }}>
                  {c.source === "live"   ? "Electricity Maps (real-time)" :
                   c.source === "recent" ? "Energy-Charts.info / ENTSO-E" :
                                           "Our World in Data / IRENA — annual average"}
                  {c.source !== "annual" && c.updatedAt !== "2023"
                    ? `  ·  ${new Date(c.updatedAt).toLocaleString()}`
                    : "  ·  2022–2023 baseline"}
                </p>
              </div>
            )}
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

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="py-3 px-4">
      <div className="text-[9px] mb-1 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-sm font-semibold truncate" style={{ color }}>{value}</div>
      {sub && <div className="text-xs font-mono" style={{ color }}>{sub}</div>}
    </div>
  );
}
