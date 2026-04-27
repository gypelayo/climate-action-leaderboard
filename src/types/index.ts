export interface CountryRenewable {
  country: string;
  code: string;
  flag: string;
  renewablePercent: number;
  source: "live" | "recent" | "annual";
  updatedAt: string;
  breakdown?: {
    solar?: number;
    wind?: number;
    hydro?: number;
    nuclear?: number;
    fossil?: number;
    other?: number;
    [key: string]: number | undefined;
  };
}

export interface CountryCarbon {
  country: string;
  code: string;
  flag: string;
  co2PerCapita: number; // tonnes CO2 per person per year
  year: number;
  source: string;
  trend?: "up" | "down" | "stable";
  changePercent?: number;
}

export interface LeaderboardData {
  renewable: CountryRenewable[];
  carbon: CountryCarbon[];
  lastFetched: string;
}
