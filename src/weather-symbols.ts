/**
 * SMHI weather symbol code mapping.
 * SNOW1G's `symbol_code` uses the same 1-27 scale SMHI has published across its
 * forecast APIs (previously `Wsymb2` on pmp3g). Only codes 1-6 were observed in
 * live summer data during development; codes 7-27 are carried over from SMHI's
 * documented scale and not yet empirically verified against snow1g.
 */

export const WEATHER_SYMBOLS: Record<number, string> = {
  1: 'Clear sky',
  2: 'Nearly clear sky',
  3: 'Variable cloudiness',
  4: 'Halfclear sky',
  5: 'Cloudy sky',
  6: 'Overcast',
  7: 'Fog',
  8: 'Light rain showers',
  9: 'Moderate rain showers',
  10: 'Heavy rain showers',
  11: 'Thunderstorm',
  12: 'Light sleet showers',
  13: 'Moderate sleet showers',
  14: 'Heavy sleet showers',
  15: 'Light snow showers',
  16: 'Moderate snow showers',
  17: 'Heavy snow showers',
  18: 'Light rain',
  19: 'Moderate rain',
  20: 'Heavy rain',
  21: 'Thunder',
  22: 'Light sleet',
  23: 'Moderate sleet',
  24: 'Heavy sleet',
  25: 'Light snowfall',
  26: 'Moderate snowfall',
  27: 'Heavy snowfall',
};

export function getWeatherDescription(symbolCode: number): string {
  return WEATHER_SYMBOLS[symbolCode] ?? `Unknown (code ${symbolCode})`;
}

/**
 * Precipitation type at surface (`predominant_precipitation_type_at_surface`).
 * Mapping carried over from SMHI's equivalent pmp3g `pcat` scale; only codes 0-1
 * were observed in live summer data (no precipitation), so codes 2-6 are unverified.
 */
export const PRECIPITATION_CATEGORIES: Record<number, string> = {
  0: 'No precipitation',
  1: 'Snow',
  2: 'Snow and rain',
  3: 'Rain',
  4: 'Drizzle',
  5: 'Freezing rain',
  6: 'Freezing drizzle',
};

export function getPrecipitationCategory(code: number): string {
  return PRECIPITATION_CATEGORIES[code] ?? `Unknown (code ${code})`;
}
