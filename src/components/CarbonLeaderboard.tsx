"use client";

import type { CountryCarbon } from "@/types";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-slate-400 font-mono text-sm w-6 text-center">{rank}</span>;
}

function getBarColor(co2: number) {
  if (co2 <= 1) return "bg-gradient-to-r from-emerald-500 to-teal-400";
  if (co2 <= 3) return "bg-gradient-to-r from-teal-500 to-cyan-400";
  if (co2 <= 6) return "bg-gradient-to-r from-yellow-500 to-amber-400";
  if (co2 <= 10) return "bg-gradient-to-r from-orange-500 to-amber-500";
  return "bg-gradient-to-r from-red-600 to-rose-500";
}

function getScoreColor(co2: number) {
  if (co2 <= 1) return "text-emerald-400";
  if (co2 <= 3) return "text-teal-400";
  if (co2 <= 6) return "text-yellow-400";
  if (co2 <= 10) return "text-orange-400";
  return "text-red-400";
}

// Paris Agreement target: ~2t CO2 per capita by 2050
const PARIS_TARGET = 2.0;
const MAX_DISPLAY = 35; // tonnes for bar scale

export default function CarbonLeaderboard({ data }: { data: CountryCarbon[] }) {
  if (data.length === 0)
    return <p className="text-center text-slate-500 py-16">No results found.</p>;

  const avg = data.reduce((s, c) => s + c.co2PerCapita, 0) / data.length;
  const underTarget = data.filter((c) => c.co2PerCapita <= PARIS_TARGET).length;
  const worst = [...data].sort((a, b) => b.co2PerCapita - a.co2PerCapita)[0];

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Lowest footprint", value: `${data[0]?.flag} ${data[0]?.country}`, sub: `${data[0]?.co2PerCapita} t CO₂/person` },
          { label: "Highest footprint", value: `${worst?.flag} ${worst?.country}`, sub: `${worst?.co2PerCapita} t CO₂/person` },
          { label: "Global avg", value: `${avg.toFixed(1)} t`, sub: "tonnes CO₂ / person / yr" },
          { label: "≤2t (Paris path)", value: `${underTarget}`, sub: `of ${data.length} countries` },
        ].map((card) => (
          <div key={card.label} className="rounded-xl bg-black/30 border border-white/10 p-4">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className="text-white font-bold text-sm sm:text-base">{card.value}</p>
            <p className="text-emerald-400 text-xs">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Paris target callout */}
      <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-900/20 border border-emerald-500/20 text-sm text-emerald-300">
        <span className="text-lg">🎯</span>
        <span>
          Paris Agreement pathway: <strong>≤2 tonnes CO₂ per person per year by 2050</strong>.
          Only <strong>{underTarget} of {data.length}</strong> tracked countries are already there.
        </span>
      </div>

      {/* Table header */}
      <div className="rounded-t-xl bg-black/40 border border-white/10 border-b-0 px-4 py-3 grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-4">Country</div>
        <div className="col-span-5 text-right">CO₂ per capita (t/yr)</div>
        <div className="col-span-2 text-right">Year</div>
      </div>

      {/* Rows */}
      <div className="rounded-b-xl border border-white/10 overflow-hidden divide-y divide-white/5">
        {data.map((country, idx) => {
          const atParis = country.co2PerCapita <= PARIS_TARGET;
          return (
            <div
              key={country.code}
              className={`px-4 py-3.5 grid grid-cols-12 gap-2 items-center bg-black/20 hover:bg-white/5 transition-colors ${
                atParis ? "border-l-2 border-emerald-500/50" : ""
              }`}
            >
              <div className="col-span-1 flex justify-center">
                <RankBadge rank={idx + 1} />
              </div>

              <div className="col-span-4 flex items-center gap-2.5">
                <span className="text-xl leading-none">{country.flag}</span>
                <div>
                  <p className="text-white text-sm font-medium leading-tight">{country.country}</p>
                  <p className="text-slate-500 text-xs">{country.code}</p>
                </div>
              </div>

              <div className="col-span-5">
                <div className="flex justify-end items-center gap-2 mb-1">
                  <span className={`text-sm font-bold font-mono ${getScoreColor(country.co2PerCapita)}`}>
                    {country.co2PerCapita.toFixed(1)} t
                  </span>
                  {atParis && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                      ✓ Paris
                    </span>
                  )}
                </div>
                {/* Bar: scaled so 35t = full width */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getBarColor(country.co2PerCapita)}`}
                    style={{ width: `${Math.min(100, (country.co2PerCapita / MAX_DISPLAY) * 100)}%` }}
                  />
                  {/* Paris target marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-emerald-400/60"
                    style={{ left: `${(PARIS_TARGET / MAX_DISPLAY) * 100}%` }}
                    title="Paris target (2t)"
                  />
                </div>
              </div>

              <div className="col-span-2 text-right text-xs text-slate-500">{country.year}</div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-600 mt-3 text-center">
        Source: Global Carbon Project · Our World in Data (2022 data, latest available). Green bar marker = 2t Paris target.
      </p>
    </div>
  );
}
