"use client";

import type { CountryRenewable } from "@/types";
import { useState } from "react";

type SortKey = "rank" | "renewablePercent" | "country";

function SourceBadge({ source }: { source: CountryRenewable["source"] }) {
  if (source === "live")
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
        LIVE
      </span>
    );
  if (source === "recent")
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
        RECENT
      </span>
    );
  return (
    <span className="text-[10px] text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded-full">
      ANNUAL
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="text-lg" title="1st">🥇</span>;
  if (rank === 2)
    return <span className="text-lg" title="2nd">🥈</span>;
  if (rank === 3)
    return <span className="text-lg" title="3rd">🥉</span>;
  return (
    <span className="text-slate-400 font-mono text-sm w-6 text-center">
      {rank}
    </span>
  );
}

function BarChart({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

function getBarColor(percent: number) {
  if (percent >= 80) return "bg-gradient-to-r from-emerald-500 to-teal-400";
  if (percent >= 60) return "bg-gradient-to-r from-teal-500 to-cyan-400";
  if (percent >= 40) return "bg-gradient-to-r from-yellow-500 to-amber-400";
  if (percent >= 20) return "bg-gradient-to-r from-orange-500 to-amber-500";
  return "bg-gradient-to-r from-red-600 to-rose-500";
}

function getScoreColor(percent: number) {
  if (percent >= 80) return "text-emerald-400";
  if (percent >= 60) return "text-teal-400";
  if (percent >= 40) return "text-yellow-400";
  if (percent >= 20) return "text-orange-400";
  return "text-red-400";
}

export default function RenewableLeaderboard({ data }: { data: CountryRenewable[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("renewablePercent");
  const [asc, setAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    let v = 0;
    if (sort === "renewablePercent") v = a.renewablePercent - b.renewablePercent;
    else if (sort === "country") v = a.country.localeCompare(b.country);
    else v = 0; // rank = already sorted by percent desc
    return asc ? v : -v;
  });

  const handleSort = (key: SortKey) => {
    if (sort === key) setAsc(!asc);
    else { setSort(key); setAsc(false); }
  };

  if (data.length === 0)
    return <p className="text-center text-slate-500 py-16">No results found.</p>;

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Highest renewable", value: `${data[0]?.flag} ${data[0]?.country}`, sub: `${data[0]?.renewablePercent.toFixed(1)}%` },
          { label: "Lowest renewable", value: `${data[data.length - 1]?.flag} ${data[data.length - 1]?.country}`, sub: `${data[data.length - 1]?.renewablePercent.toFixed(1)}%` },
          { label: "Global avg", value: `${(data.reduce((s, c) => s + c.renewablePercent, 0) / data.length).toFixed(1)}%`, sub: `${data.length} countries` },
          { label: "≥50% renewable", value: `${data.filter((c) => c.renewablePercent >= 50).length}`, sub: "countries" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl bg-black/30 border border-white/10 p-4">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className="text-white font-bold text-sm sm:text-base">{card.value}</p>
            <p className="text-emerald-400 text-xs">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div className="rounded-t-xl bg-black/40 border border-white/10 border-b-0 px-4 py-3 grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <div className="col-span-1 text-center">#</div>
        <button
          className="col-span-4 text-left hover:text-slate-300 transition-colors flex items-center gap-1"
          onClick={() => handleSort("country")}
        >
          Country {sort === "country" && (asc ? "↑" : "↓")}
        </button>
        <button
          className="col-span-4 text-right hover:text-slate-300 transition-colors"
          onClick={() => handleSort("renewablePercent")}
        >
          Renewable % {sort === "renewablePercent" && (asc ? "↑" : "↓")}
        </button>
        <div className="col-span-2 text-right hidden sm:block">Status</div>
        <div className="col-span-1 text-right hidden sm:block">↕</div>
      </div>

      {/* Rows */}
      <div className="rounded-b-xl border border-white/10 overflow-hidden divide-y divide-white/5">
        {sorted.map((country, idx) => {
          const rank = sort === "renewablePercent" && !asc ? idx + 1 : data.indexOf(country) + 1;
          const isExpanded = expanded === country.code;
          const hasBreakdown = country.breakdown && Object.keys(country.breakdown).length > 0;

          return (
            <div key={country.code} className="bg-black/20 hover:bg-white/5 transition-colors">
              <button
                className="w-full px-4 py-3.5 grid grid-cols-12 gap-2 items-center text-left"
                onClick={() => setExpanded(isExpanded ? null : country.code)}
              >
                <div className="col-span-1 flex justify-center">
                  <RankBadge rank={rank} />
                </div>

                <div className="col-span-4 flex items-center gap-2.5">
                  <span className="text-xl leading-none">{country.flag}</span>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">{country.country}</p>
                    <p className="text-slate-500 text-xs">{country.code}</p>
                  </div>
                </div>

                <div className="col-span-4">
                  <div className="flex justify-end items-center gap-2 mb-1">
                    <span className={`text-sm font-bold font-mono ${getScoreColor(country.renewablePercent)}`}>
                      {country.renewablePercent.toFixed(1)}%
                    </span>
                  </div>
                  <BarChart percent={country.renewablePercent} color={getBarColor(country.renewablePercent)} />
                </div>

                <div className="col-span-2 flex justify-end hidden sm:flex">
                  <SourceBadge source={country.source} />
                </div>

                <div className="col-span-1 flex justify-end text-slate-600 text-xs">
                  {isExpanded ? "▲" : "▼"}
                </div>
              </button>

              {/* Breakdown panel */}
              {isExpanded && hasBreakdown && (
                <div className="px-4 pb-4 pt-1 bg-slate-900/50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {Object.entries(country.breakdown!).map(([src, val]) => (
                      <div key={src} className="bg-black/30 rounded-lg p-2.5 text-center">
                        <p className="text-slate-400 text-xs capitalize">{src}</p>
                        <p className="text-white font-mono text-sm font-bold">{(val as number).toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Source: {country.source === "live" ? "Electricity Maps (real-time)" : country.source === "recent" ? "Energy-Charts.info / ENTSO-E" : "Our World in Data (annual avg)"}
                    {country.source !== "annual" && ` · ${new Date(country.updatedAt).toLocaleString()}`}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
