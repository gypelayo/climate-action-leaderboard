export interface CountryRenewable {
  country: string;
  code: string;
  flag: string;
  renewablePercent: number;
  source: "live" | "recent" | "annual";
  updatedAt: string;
  breakdown?: {
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
}

export interface CountryCycling {
  country: string;
  code: string;
  flag: string;
  modalShare: number; // % of daily trips made by bicycle
  source: string;
  year: number;
}

export interface CountryForest {
  country: string;
  code: string;
  flag: string;
  forestPercent: number; // % of total land area covered by forest
  forestKm2: number;     // absolute forest area in sq km
  source: string;
  year: number;
}

export interface LeaderboardData {
  renewable: CountryRenewable[];
  carbon:    CountryCarbon[];
  cycling:   CountryCycling[];
  forest:    CountryForest[];
  lastFetched: string;
}
