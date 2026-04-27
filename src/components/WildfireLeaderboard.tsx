"use client";
import { useState, useMemo, useEffect } from "react";
import type { CountryWildfire } from "@/types";

const PAGE = 50;

function SegBar({ val, max, color }: { val: number; max: number; color: string }) {
  const filled = Math.max(0, Math.min(20, Math.round((val / max) * 20)));
  return <span className="seg-bar" style={{ color }}>{"█".repeat(filled)}<span style={{ opacity: 0.13 }}>{"█".repeat(20 - filled)}</span></span>;
}
function getColor(d: number) {
  if (d <= 50)   return "#34d399";
  if (d <= 300)  return "#22d3ee";
  if (d <= 800)  return "#fb923c";
  if (d <= 2000) return "#f97316";
  return "#f87171";
}
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
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
export default function WildfireLeaderboard({ data, search = "" }: { data: CountryWildfire[]; search?: string }) {
  const [page, setPage] = useState(1);
  const [asc,  setAsc]  = useState(false);
  const [mode, setMode] = useState<"density" | "count">("density");

  const sorted = [...data].sort((a, b) => {
    const va = mode === "density" ? a.fireDensity : a.fireCount;
    const vb = mode === "density" ? b.fireDensity : b.fireCount;
    return asc ? va - vb : vb - va;
  });
  const rankOf = useMemo(() => { const m = new Map<string,number>(); sorted.forEach((c,i)=>m.set(c.code,i+1)); return m; }, [sorted]);
  const filtered = useMemo(() => { if (!search.trim()) return sorted; const q=search.toLowerCase(); return sorted.filter(c=>c.country.toLowerCase().includes(q)||c.code.toLowerCase().includes(q)); }, [sorted,search]);
  useEffect(()=>{setPage(1);},[search]);
  const totalPages  = Math.ceil(filtered.length / PAGE);
  const visible     = filtered.slice((page - 1) * PAGE, page * PAGE);
  const isLive      = data.some(c => c.periodDays === 7);
  const liveCount   = data.filter(c => c.periodDays === 7).length;
  const worstDensity= data.reduce((best, c) => c.fireDensity > (best?.fireDensity ?? 0) ? c : best, data[0]);
  const worstCount  = data.reduce((best, c) => c.fireCount  > (best?.fireCount  ?? 0)  ? c : best, data[0]);

  if (!filtered.length) return <p className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>No data</p>;
  const maxDensity = Math.max(...data.map(c => c.fireDensity));
  const maxCount   = Math.max(...data.map(c => c.fireCount));

  return (
    <>
      <div className="grid grid-cols-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Stat label="Highest density" value={worstDensity ? `${worstDensity.flag} ${worstDensity.country}` : "—"} sub={worstDensity ? `${worstDensity.fireDensity}/100k km²` : ""} color="#f87171" />
        <Stat label="Most fires"      value={worstCount   ? `${worstCount.flag} ${worstCount.country}`   : "—"} sub={worstCount   ? fmt(worstCount.fireCount) : ""}          color="#fb923c" />
        <Stat label="Data freshness"  value={isLive ? "7-day satellite" : "Annual baseline"} sub={isLive ? `NASA FIRMS · ${liveCount} countries` : "NASA FIRMS VIIRS"} color={isLive ? "#34d399" : "var(--text-secondary)"} />
      </div>

      {/* Context + toggle */}
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b flex-wrap gap-y-2" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(248,113,113,0.03)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span className="text-base">🔥</span>
          <span>
            {isLive
              ? <><strong style={{ color: "#34d399" }}>NASA FIRMS live</strong> — 7-day VIIRS S-NPP satellite detections.</>
              : <><strong style={{ color: "var(--text-primary)" }}>NASA FIRMS annual baseline</strong> — VIIRS. Add <code style={{ color: "var(--glow-cyan)" }}>FIRMS_MAP_KEY</code> secret for live 7-day data.</>
            }
            {" "}Density = detections per 100k km² of land area.
          </span>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["density", "count"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setPage(1); }} className="px-3 py-1 rounded-md text-xs font-medium transition-all" style={mode === m ? { background: "rgba(248,113,113,0.2)", color: "#f87171" } : { color: "var(--text-muted)" }}>
              {m === "density" ? "per km²" : "total fires"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-center px-4 py-2 text-xs sticky top-0" style={{ gridTemplateColumns: "36px 1fr 80px 160px 52px", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,12,32,0.95)", color: "var(--text-muted)", zIndex: 10 }}>
        <div className="text-center">#</div>
        <div>Country</div>
        <button className="text-right hover:opacity-70" onClick={() => { setMode("count");   setAsc(a => !a); setPage(1); }}>Fires</button>
        <button className="text-right hover:opacity-70" onClick={() => { setMode("density"); setAsc(a => !a); setPage(1); }}>Per 100k km² {mode === "density" ? (asc ? "▲" : "▼") : ""}</button>
        <div className="text-right">Period</div>
      </div>

      {visible.map((c, i) => {
        const rank  = rankOf.get(c.code) ?? i + 1;
        const col   = getColor(c.fireDensity);
        const barV  = mode === "density" ? c.fireDensity : c.fireCount;
        const barM  = mode === "density" ? maxDensity    : maxCount;
        return (
          <div key={c.code} className="data-row grid items-center px-4 py-3" style={{ gridTemplateColumns: "36px 1fr 80px 160px 52px", gap: "8px" }}>
            <div className="flex justify-center text-sm"><Rank n={rank} /></div>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none flex-shrink-0">{c.flag}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.country}</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.code}</div>
              </div>
            </div>
            <div className="text-right font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{fmt(c.fireCount)}</div>
            <div className="text-right">
              <div className="font-mono font-bold text-sm mb-1" style={{ color: col }}>{c.fireDensity.toLocaleString()}</div>
              <SegBar val={barV} max={barM} color={col} />
            </div>
            <div className="text-right text-[10px] font-mono" style={{ color: c.periodDays === 7 ? "#34d399" : "var(--text-muted)" }}>
              {c.periodDays === 7 ? "7d 🛰️" : "1yr"}
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
