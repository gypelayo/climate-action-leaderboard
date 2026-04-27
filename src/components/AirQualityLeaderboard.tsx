"use client";
import { useState, useMemo, useEffect } from "react";
import type { CountryAirQuality } from "@/types";

const PAGE = 50;
const WHO_GUIDELINE = 5; // µg/m³

function SegBar({ val, color }: { val: number; color: string }) {
  const filled = Math.max(0, Math.min(20, Math.round((val / 80) * 20)));
  const whoAt  = Math.round((WHO_GUIDELINE / 80) * 20);
  return (
    <span className="seg-bar flex">
      {Array.from({ length: 20 }, (_, i) => (
        <span key={i} style={{ color: i === whoAt ? "rgba(52,211,153,0.8)" : color, opacity: i > filled ? 0.13 : 1 }}>
          {i === whoAt ? "|" : "█"}
        </span>
      ))}
    </span>
  );
}
function getColor(pm25: number) {
  if (pm25 <= 5)  return "#34d399";
  if (pm25 <= 10) return "#2dd4bf";
  if (pm25 <= 25) return "#22d3ee";
  if (pm25 <= 50) return "#fb923c";
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
export default function AirQualityLeaderboard({ data, search = "" }: { data: CountryAirQuality[]; search?: string }) {
  const [page, setPage] = useState(1);
  const [asc,  setAsc]  = useState(true);
  const sorted     = [...data].sort((a, b) => asc ? a.pm25 - b.pm25 : b.pm25 - a.pm25);
  const rankOf = useMemo(() => { const m = new Map<string,number>(); sorted.forEach((c,i)=>m.set(c.code,i+1)); return m; }, [sorted]);
  const filtered = useMemo(() => { if (!search.trim()) return sorted; const q=search.toLowerCase(); return sorted.filter(c=>c.country.toLowerCase().includes(q)||c.code.toLowerCase().includes(q)); }, [sorted,search]);
  useEffect(()=>{setPage(1);},[search]);
  const totalPages = Math.ceil(filtered.length / PAGE);
  const visible    = filtered.slice((page - 1) * PAGE, page * PAGE);
  const avg        = data.length ? data.reduce((s, c) => s + c.pm25, 0) / data.length : 0;
  const best       = sorted[0];
  const safe       = data.filter(c => c.pm25 <= WHO_GUIDELINE).length;
  const liveCount  = data.filter(c => c.source.includes("OpenAQ")).length;

  if (!filtered.length) return <p className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>No data</p>;
  return (
    <>
      <div className="grid grid-cols-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Stat label="Global avg"     value={`${avg.toFixed(1)} µg/m³`} color="var(--glow-cyan)" />
        <Stat label="Cleanest air"   value={best ? `${best.flag} ${best.country}` : "—"} sub={best ? `${best.pm25} µg/m³` : ""} color="#34d399" />
        <Stat label="Meet WHO <5µg" value={`${safe} / ${data.length}`} color="var(--glow-amber)" />
      </div>
      <div className="flex items-center gap-2 px-5 py-2.5 border-b text-xs" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(52,211,153,0.03)" }}>
        <span className="text-base">🌬️</span>
        <span style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>PM2.5 annual mean (µg/m³)</strong> — fine particle pollution.
          WHO safe guideline: ≤5 µg/m³ (green marker |).
          Source: WHO Global Air Quality Database / World Bank.
          {liveCount > 0 && <span style={{ color: "#34d399" }}> {liveCount} countries enriched from OpenAQ live stations.</span>}
        </span>
      </div>
      <div className="grid items-center px-4 py-2 text-xs sticky top-0" style={{ gridTemplateColumns: "36px 1fr 160px 60px", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,12,32,0.95)", color: "var(--text-muted)", zIndex: 10 }}>
        <div className="text-center">#</div>
        <div>Country</div>
        <button className="text-right hover:opacity-70 transition-opacity" onClick={() => { setAsc(a => !a); setPage(1); }}>PM2.5 µg/m³ {asc ? "▲" : "▼"}</button>
        <div className="text-right">Year</div>
      </div>
      {visible.map((c, i) => {
        const rank    = (page - 1) * PAGE + i + 1;
        const col     = getColor(c.pm25);
        const isSafe  = c.pm25 <= WHO_GUIDELINE;
        return (
          <div key={c.code} className="data-row grid items-center px-4 py-3" style={{ gridTemplateColumns: "36px 1fr 160px 60px", gap: "8px", borderLeft: isSafe ? "2px solid rgba(52,211,153,0.45)" : "2px solid transparent" }}>
            <div className="flex justify-center text-sm"><Rank n={rank} /></div>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none flex-shrink-0">{c.flag}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.country}</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.code}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className="font-mono font-bold text-sm" style={{ color: col }}>{c.pm25.toFixed(1)} µg</span>
                {isSafe && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>✓ WHO</span>}
              </div>
              <SegBar val={c.pm25} color={col} />
            </div>
            <div className="text-right text-xs font-mono" style={{ color: "var(--text-muted)" }}>{c.year}</div>
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
