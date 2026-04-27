"use client";
import { useState, useMemo, useEffect } from "react";
import type { CountryCarbonIntensity } from "@/types";

const PAGE = 50;
function SegBar({ val, max, color }: { val: number; max: number; color: string }) {
  const filled = Math.max(0, Math.min(20, Math.round((val / max) * 20)));
  return <span className="seg-bar" style={{ color }}>{"█".repeat(filled)}<span style={{ opacity: 0.13 }}>{"█".repeat(20 - filled)}</span></span>;
}
function getColor(g: number) {
  if (g <= 50)  return "#34d399";
  if (g <= 150) return "#2dd4bf";
  if (g <= 300) return "#22d3ee";
  if (g <= 500) return "#fb923c";
  return "#f87171";
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
export default function CarbonIntensityLeaderboard({ data, search = "" }: { data: CountryCarbonIntensity[]; search?: string }) {
  const [page, setPage] = useState(1);
  const [asc,  setAsc]  = useState(true);
  // Full sorted list — determines global ranks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sorted = useMemo(() => [...data].sort((a, b) => asc ? a.gCO2perKwh - b.gCO2perKwh : b.gCO2perKwh - a.gCO2perKwh), [data, asc]);

  // code → 1-based global rank in the full sorted list
  const rankOf = useMemo(() => {
    const m = new Map<string, number>();
    sorted.forEach((c, i) => m.set(c.code, i + 1));
    return m;
  }, [sorted]);

  // Subset for display — preserves sort order
  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(c => c.country.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [sorted, search]);

  useEffect(() => { setPage(1); }, [search]);
  const totalPages = Math.ceil(filtered.length / PAGE);
  const visible    = filtered.slice((page - 1) * PAGE, page * PAGE);
  const avg  = data.length ? Math.round(data.reduce((s, c) => s + c.gCO2perKwh, 0) / data.length) : 0;
  const best = sorted[0];
  const liveCount = data.filter(c => c.source === "live").length;

  if (!filtered.length) return <p className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>No data</p>;
  return (
    <>
      <div className="grid grid-cols-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Stat label="Global avg"   value={`${avg} g/kWh`}    color="var(--glow-cyan)" />
        <Stat label="Cleanest grid" value={best ? `${best.flag} ${best.country}` : "—"} sub={best ? `${best.gCO2perKwh} g/kWh` : ""} color="#34d399" />
        <Stat label="Live EU grids" value={`${liveCount} countries`} color="var(--glow-amber)" />
      </div>
      <div className="flex items-center gap-2 px-5 py-2.5 border-b text-xs" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(34,211,238,0.03)" }}>
        <span className="text-base">🏭</span>
        <span style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>g CO₂ per kWh</strong> — how much carbon is released per unit of electricity.
          EU grids are live from Energy-Charts.info. All others computed from power-mix breakdowns using IPCC emission factors.
        </span>
      </div>
      <div className="grid items-center px-4 py-2 text-xs sticky top-0" style={{ gridTemplateColumns: "36px 1fr 160px 80px", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,12,32,0.95)", color: "var(--text-muted)", zIndex: 10 }}>
        <div className="text-center">#</div>
        <div>Country</div>
        <button className="text-right hover:opacity-70 transition-opacity" onClick={() => { setAsc(a => !a); setPage(1); }}>g CO₂/kWh {asc ? "▲" : "▼"}</button>
        <div className="text-right">Source</div>
      </div>
      {visible.map((c, i) => {
        const rank = rankOf.get(c.code) ?? i + 1;
        const col  = getColor(c.gCO2perKwh);
        return (
          <div key={c.code} className="data-row grid items-center px-4 py-3" style={{ gridTemplateColumns: "36px 1fr 160px 80px", gap: "8px" }}>
            <div className="flex justify-center text-sm"><Rank n={rank} /></div>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none flex-shrink-0">{c.flag}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.country}</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.code}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-sm mb-1" style={{ color: col }}>{c.gCO2perKwh} g</div>
              <SegBar val={c.gCO2perKwh} max={900} color={col} />
            </div>
            <div className="text-right">
              {c.source === "live" ? (
                <span className="text-[10px] font-medium flex items-center justify-end gap-1" style={{ color: "#34d399" }}><span className="w-1.5 h-1.5 rounded-full bg-current animate-blink" />Live</span>
              ) : c.source === "recent" ? (
                <span className="text-[10px]" style={{ color: "#fb923c" }}>Recent</span>
              ) : (
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Est.</span>
              )}
            </div>
          </div>
        );
      })}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t text-sm" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-30" style={{ border: "1px solid rgba(34,211,238,0.2)", color: "var(--glow-cyan)", background: "rgba(34,211,238,0.06)" }}>← Prev</button>
          <span style={{ color: "var(--text-muted)" }}>{page} / {totalPages} · {filtered.length === data.length ? data.length : `${filtered.length} of ${data.length}`} nations</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-30" style={{ border: "1px solid rgba(34,211,238,0.2)", color: "var(--glow-cyan)", background: "rgba(34,211,238,0.06)" }}>Next →</button>
        </div>
      )}
    </>
  );
}
