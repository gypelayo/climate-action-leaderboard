export interface CountryRenewable {
  country: string;
  code: string;
  flag: string;
  renewablePercent: number;
  source: "live" | "recent" | "annual";
  updatedAt: string;
  breakdown?: { [key: string]: number | undefined };
}

export interface CountryCarbon {
  country: string;
  code: string;
  flag: string;
  co2PerCapita: number;
  year: number;
  source: string;
}

export interface CountryCycling {
  country: string;
  code: string;
  flag: string;
  modalShare: number;
  source: string;
  year: number;
}

export interface CountryForest {
  country: string;
  code: string;
  flag: string;
  forestPercent: number;
  forestKm2: number;
  source: string;
  year: number;
}

export interface CountryCarbonIntensity {
  country: string;
  code: string;
  flag: string;
  gCO2perKwh: number;        // grams CO₂ per kWh
  source: "live" | "recent" | "estimated";
  updatedAt: string;
}

export interface CountryAirQuality {
  country: string;
  code: string;
  flag: string;
  pm25: number;              // µg/m³ annual mean PM2.5
  source: string;
  year: number;
}

export interface CountryWildfire {
  country: string;
  code: string;
  flag: string;
  fireDensity: number;       // fire detections per 100k km² of land
  fireCount: number;         // absolute fire detections (7-day when live, annual otherwise)
  periodDays: number;        // 7 = live NASA FIRMS, 365 = annual baseline
  source: string;
  updatedAt: string;
}

export interface LeaderboardData {
  renewable:       CountryRenewable[];
  carbon:          CountryCarbon[];
  cycling:         CountryCycling[];
  forest:          CountryForest[];
  carbonIntensity: CountryCarbonIntensity[];
  airQuality:      CountryAirQuality[];
  wildfire:        CountryWildfire[];
  lastFetched: string;
}
