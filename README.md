# 🌍 Climate Action Leaderboard

A real-time world leaderboard tracking climate action metrics across countries.

**Live at:** [climate-action-leaderboard](https://github.com/gypelayo/climate-action-leaderboard)

## Features

### ⚡ Renewable Energy Leaderboard
Real-time % of electricity generation from renewable sources (solar, wind, hydro, geothermal, biomass). Updated every 15 minutes where live data is available.

| Data Tier | Source | Freshness |
|-----------|--------|-----------|
| 🟢 **Live** | [Electricity Maps API](https://www.electricitymaps.com/) | ~15 min (free token required) |
| 🟡 **Recent** | [Energy-Charts.info](https://api.energy-charts.info/) (Fraunhofer ISE / ENTSO-E) | ~15 min, no key needed — European grids |
| ⚪ **Annual** | [Our World in Data](https://ourworldindata.org/renewable-energy) | Latest annual averages (2022–2023) |

### 🌿 Per Capita Carbon Footprint Leaderboard
Annual CO₂ emissions per person in tonnes. Ranked best → worst. Paris Agreement pathway target (≤2t/person) is highlighted.

**Source:** [Global Carbon Project](https://www.globalcarbonproject.org/) via [Our World in Data](https://ourworldindata.org/co2-emissions) (2022 data, latest published).

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # add your Electricity Maps token (optional)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: Electricity Maps API (free tier)

Get a free token at [api-portal.electricitymaps.com](https://api-portal.electricitymaps.com/) and set it in `.env.local`:

```
ELECTRICITY_MAPS_TOKEN=your_token_here
```

Without it, the app still works using:
- **Energy-Charts.info** — free, no key, ENTSO-E data for 17 European countries in near real-time
- **Baseline data** — 70+ countries with annual averages

## Tech Stack

- **Next.js 15** (App Router, React Server Components, route handlers)
- **TypeScript** + **Tailwind CSS v4**
- **Lucide React** icons
- Server-side data fetching with `revalidate` (ISR) — renewable refreshes every 15 min, carbon every 24h

## Data Coverage

- **70+ countries** for renewable energy
- **60+ countries** for per capita carbon footprint
- Auto-refresh every 15 minutes in the browser

## Contributing

PRs welcome! Ideas:
- [ ] Add more real-time sources (Open Power System Data, EIA API)
- [ ] Historical trend charts per country
- [ ] Electricity Map embedded live map
- [ ] Country comparison mode
- [ ] Share / embed individual country cards

---

Built by [@gypelayo](https://github.com/gypelayo) · Data: Electricity Maps, Fraunhofer ISE, Our World in Data, Global Carbon Project
