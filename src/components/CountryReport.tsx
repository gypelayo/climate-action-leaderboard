"use client";
import type { LeaderboardData } from "@/types";
import { X } from "lucide-react";

type TabId = "renewable" | "carbon" | "cycling" | "forest" | "carbonIntensity" | "airQuality" | "wildfire";

const BOARDS: { id: TabId; icon: string; label: string; unit: string; getValue: (d: LeaderboardData, code: string) => { rank: number; value: string; total: number; better: boolean } | null }[] = [
  {
    id: "renewable", icon: "⚡", label: "Renewable Energy", unit: "% clean",
    getValue: (d, code) => {
      const i = d.renewable.findIndex(c => c.code === code);
      if (i < 0) return null;
      return { rank: i + 1, value: `${d.renewable[i].renewablePercent.toFixed(1)}%`, total: d.renewable.length, better: i < d.renewable.length / 2 };
    },
  },
  {
    id: "carbon", icon: "🌿", label: "Carbon Footprint", unit: "t CO₂/cap",
    getValue: (d, code) => {
      const i = d.carbon.findIndex(c => c.code === code);
      if (i < 0) return null;
      return { rank: i + 1, value: `${d.carbon[i].co2PerCapita} t`, total: d.carbon.length, better: i < d.carbon.length / 2 };
    },
  },
  {
    id: "cycling", icon: "🚴", label: "Cycling", unit: "% trips by bike",
    getValue: (d, code) => {
      const i = d.cycling.findIndex(c => c.code === code);
      if (i < 0) return null;
      return { rank: i + 1, value: `${d.cycling[i].modalShare.toFixed(1)}%`, total: d.cycling.length, better: i < d.cycling.length / 2 };
    },
  },
  {
    id: "forest", icon: "🌳", label: "Forest Cover", unit: "% of land",
    getValue: (d, code) => {
      const i = d.forest.findIndex(c => c.code === code);
      if (i < 0) return null;
      return { rank: i + 1, value: `${d.forest[i].forestPercent.toFixed(1)}%`, total: d.forest.length, better: i < d.forest.length / 2 };
    },
  },
  {
    id: "carbonIntensity", icon: "🏭", label: "Grid CO₂ Intensity", unit: "g CO₂/kWh",
    getValue: (d, code) => {
      const i = d.carbonIntensity.findIndex(c => c.code === code);
      if (i < 0) return null;
      return { rank: i + 1, value: `${d.carbonIntensity[i].gCO2perKwh} g`, total: d.carbonIntensity.length, better: i < d.carbonIntensity.length / 2 };
    },
  },
  {
    id: "airQuality", icon: "🌬️", label: "Air Quality", unit: "PM2.5 µg/m³",
    getValue: (d, code) => {
      const i = d.airQuality.findIndex(c => c.code === code);
      if (i < 0) return null;
      return { rank: i + 1, value: `${d.airQuality[i].pm25.toFixed(1)} µg`, total: d.airQuality.length, better: i < d.airQuality.length / 2 };
    },
  },
  {
    id: "wildfire", icon: "🔥", label: "Wildfires", unit: "fire density",
    getValue: (d, code) => {
      const i = d.wildfire.findIndex(c => c.code === code);
      if (i < 0) return null;
      return { rank: i + 1, value: `${d.wildfire[i].fireDensity.toLocaleString()}/100k km²`, total: d.wildfire.length, better: i >= d.wildfire.length / 2 };
    },
  },
];

interface Props {
  code: string;
  flag: string;
  name: string;
  data: LeaderboardData;
  onClose: () => void;
  onTabSwitch: (tab: TabId) => void;
}

export default function CountryReport({ code, flag, name, data, onClose, onTabSwitch }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-sm animate-fade-in overflow-y-auto"
        style={{
          background: "rgba(2,8,24,0.97)",
          borderLeft: "1px solid rgba(120,200,255,0.15)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(2,8,24,0.98)" }}>
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{flag}</span>
            <div>
              <h2 className="text-base font-bold title-gradient">{name}</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{code} · Climate profile</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-all" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Boards */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          {BOARDS.map(board => {
            const result = board.getValue(data, code);
            if (!result) return (
              <div key={board.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{board.icon}</span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{board.label}</span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Not in this leaderboard</p>
              </div>
            );

            const pct = result.rank / result.total;
            const color = result.better
              ? pct < 0.1 ? "#34d399" : pct < 0.25 ? "#2dd4bf" : "#22d3ee"
              : pct > 0.9 ? "#f87171" : pct > 0.75 ? "#fb923c" : "#22d3ee";

            return (
              <button
                key={board.id}
                onClick={() => { onTabSwitch(board.id); onClose(); }}
                className="rounded-xl p-4 text-left transition-all hover:scale-[1.01]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{board.icon}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{board.label}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>
                    #{result.rank} of {result.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg" style={{ color }}>{result.value}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {result.better ? "↑ above median" : "↓ below median"} · tap to view →
                  </span>
                </div>
                {/* Mini rank bar */}
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${((result.total - result.rank + 1) / result.total) * 100}%`,
                      background: color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
