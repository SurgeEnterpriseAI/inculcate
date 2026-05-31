/** Synthetic monthly living-cost estimates (USD) by country, for planning only. */
const MONTHLY: Record<string, number> = {
  "United States": 1500,
  "United Kingdom": 1400,
  Canada: 1200,
  Australia: 1500,
  Singapore: 1300,
  Switzerland: 1800,
  Germany: 1100,
  Netherlands: 1200,
  Ireland: 1300,
  France: 1100,
  Sweden: 1100,
  "New Zealand": 1200,
  Italy: 1000,
  Spain: 1000,
  "United Arab Emirates": 1300,
  Japan: 1200,
};

export function monthlyLivingCost(country: string): number {
  return MONTHLY[country] ?? 1000;
}

/** Total first-year estimate: tuition + 12 months living. */
export function annualEstimate(tuitionUsd: number | null, country: string): number {
  return (tuitionUsd ?? 0) + monthlyLivingCost(country) * 12;
}
