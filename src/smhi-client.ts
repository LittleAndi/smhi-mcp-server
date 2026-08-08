/**
 * SMHI Open Data API Client (SNOW1G point forecast)
 * Fetches meteorological forecast data for locations in Scandinavia
 */

import { Buffer } from 'node:buffer';
import type {
  SMHIResponse,
  SMHITimeSeries,
  CurrentWeather,
  HourlyForecast,
  DailySummary,
  FWIResponse,
  FWITimeSeries,
  FWIParameter,
  FireRisk,
  FireRiskPeriod,
  RadarProductResponse,
  RadarComposite,
  SMHIWarningsResponse,
  SMHIWarningArea,
  WeatherWarning,
  WarningSeverity,
  WarningLanguage,
  MesanResponse,
  MesanTimeSeries,
  WeatherAnalysis,
} from './types.js';
import { getWeatherDescription } from './weather-symbols.js';
import { getFireRiskClass, getGrassFireClass, getForestDrynessClass } from './fire-risk-classes.js';

const BASE_URL = 'https://opendata-download-metfcst.smhi.se/api';
const CATEGORY = 'snow1g';
const FIRE_RISK_CATEGORY = 'fwif1g';
const VERSION = '1';
const RADAR_BASE_URL = 'https://opendata-download-radar.smhi.se/api/version/latest';
const WARNINGS_URL = 'https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json';
const ANALYSIS_BASE_URL = 'https://opendata-download-metanalys.smhi.se/api';
const ANALYSIS_CATEGORY = 'mesan2g';
const ANALYSIS_VERSION = '3';

const SEVERITY_RANK: Record<WarningSeverity, number> = {
  MESSAGE: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3,
};

export class SMHIClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'SMHIClientError';
  }
}

/**
 * Validates coordinates are within valid ranges
 */
function validateCoordinates(latitude: number, longitude: number): void {
  if (latitude < -90 || latitude > 90) {
    throw new SMHIClientError(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
  }
  if (longitude < -180 || longitude > 180) {
    throw new SMHIClientError(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
  }
}

/**
 * Converts a time series entry to CurrentWeather format
 */
function timeSeriesToWeather(ts: SMHITimeSeries): CurrentWeather {
  const d = ts.data;

  return {
    temperature: d.air_temperature,
    humidity: d.relative_humidity,
    windSpeed: d.wind_speed,
    windDirection: d.wind_from_direction,
    windGust: d.wind_speed_of_gust,
    pressure: d.air_pressure_at_mean_sea_level,
    visibility: d.visibility_in_air,
    cloudCover: d.cloud_area_fraction,
    precipitation: d.precipitation_amount_mean,
    precipitationProbability: d.probability_of_precipitation,
    precipitationCategory: d.predominant_precipitation_type_at_surface,
    thunderProbability: d.thunderstorm_probability,
    weatherSymbol: d.symbol_code,
    weatherDescription: getWeatherDescription(d.symbol_code),
    validTime: ts.time,
  };
}

/**
 * Fetches the raw forecast data from SMHI API
 */
export async function fetchForecast(latitude: number, longitude: number): Promise<SMHIResponse> {
  validateCoordinates(latitude, longitude);

  // SMHI API expects coordinates with specific precision
  const lon = longitude.toFixed(6);
  const lat = latitude.toFixed(6);

  const url = `${BASE_URL}/category/${CATEGORY}/version/${VERSION}/geotype/point/lon/${lon}/lat/${lat}/data.json`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new SMHIClientError(
      `Network error fetching forecast: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new SMHIClientError(
        `Location (${latitude}, ${longitude}) is outside SMHI coverage area. ` +
        'SMHI covers Sweden, Norway, Finland, Denmark, Estonia, and parts of Latvia/Lithuania.',
        404
      );
    }
    throw new SMHIClientError(
      `SMHI API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  return response.json() as Promise<SMHIResponse>;
}

/**
 * Gets the current weather conditions
 */
export async function getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather> {
  const forecast = await fetchForecast(latitude, longitude);

  if (!forecast.timeSeries || forecast.timeSeries.length === 0) {
    throw new SMHIClientError('No forecast data available');
  }

  return timeSeriesToWeather(forecast.timeSeries[0]);
}

/**
 * Gets hourly forecast for the next N hours
 */
export async function getHourlyForecast(
  latitude: number,
  longitude: number,
  hours: number = 24
): Promise<HourlyForecast[]> {
  const forecast = await fetchForecast(latitude, longitude);

  const now = new Date();
  const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return forecast.timeSeries
    .filter(ts => new Date(ts.time) <= cutoff)
    .map(ts => timeSeriesToWeather(ts));
}

/**
 * Gets daily summary for the next N days
 */
export async function getDailySummary(
  latitude: number,
  longitude: number,
  days: number = 7
): Promise<DailySummary[]> {
  const forecast = await fetchForecast(latitude, longitude);

  // Group time series by date
  const byDate = new Map<string, SMHITimeSeries[]>();

  for (const ts of forecast.timeSeries) {
    const date = ts.time.split('T')[0];
    const existing = byDate.get(date) ?? [];
    existing.push(ts);
    byDate.set(date, existing);
  }

  // Convert to daily summaries
  const summaries: DailySummary[] = [];
  const dates = Array.from(byDate.keys()).slice(0, days);

  for (const date of dates) {
    const entries = byDate.get(date)!;

    const temps = entries.map(ts => ts.data.air_temperature);
    const winds = entries.map(ts => ts.data.wind_speed);
    const precips = entries.map(ts => ts.data.precipitation_amount_mean);

    // Get the most common weather symbol for the day (midday preferred)
    const middayEntry = entries.find(ts => ts.time.includes('T12:')) ?? entries[Math.floor(entries.length / 2)];
    const weatherSymbol = middayEntry.data.symbol_code;

    summaries.push({
      date,
      highTemp: Math.max(...temps),
      lowTemp: Math.min(...temps),
      dominantWeather: getWeatherDescription(weatherSymbol),
      precipitationSum: precips.reduce((a, b) => a + b, 0),
      maxWindSpeed: Math.max(...winds),
    });
  }

  return summaries;
}

/**
 * Flattens the FWIF1G parameter array (each entry holds a single-element
 * `values` array for a point request) into a name -> value record.
 */
function fwiParamsToRecord(parameters: FWIParameter[]): Record<string, number> {
  const record: Record<string, number> = {};
  for (const p of parameters) {
    record[p.name] = p.values[0];
  }
  return record;
}

/**
 * Converts a FWIF1G time series entry to FireRisk format.
 * `grassfire` is present in both periods; `forestdry` is daily-only.
 */
function timeSeriesToFireRisk(ts: FWITimeSeries): FireRisk {
  const p = fwiParamsToRecord(ts.parameters);

  const precipitation: Record<string, number> = {};
  for (const [key, value] of Object.entries(p)) {
    if (key.startsWith('prec')) {
      precipitation[key] = value;
    }
  }

  const fireRisk: FireRisk = {
    validTime: ts.validTime,
    fireRiskClass: p.fwiindex,
    fireRiskDescription: getFireRiskClass(p.fwiindex),
    fwi: p.fwi,
    isi: p.isi,
    bui: p.bui,
    ffmc: p.ffmc,
    dmc: p.dmc,
    dc: p.dc,
    temperature: p.t,
    windDirection: p.wd,
    windSpeed: p.ws,
    humidity: p.r,
    precipitation,
  };

  if (p.grassfire !== undefined) {
    fireRisk.grassFireClass = p.grassfire;
    fireRisk.grassFireDescription = getGrassFireClass(p.grassfire);
  }

  if (p.forestdry !== undefined) {
    fireRisk.forestDrynessClass = p.forestdry;
    fireRisk.forestDrynessDescription = getForestDrynessClass(p.forestdry);
  }

  return fireRisk;
}

/**
 * Fetches the raw fire weather index forecast from SMHI's FWIF1G API.
 * `daily` covers ~6 days ahead (afternoon fire risk); `hourly` covers the next 48 hours.
 */
export async function fetchFireRisk(
  latitude: number,
  longitude: number,
  period: FireRiskPeriod = 'daily'
): Promise<FWIResponse> {
  validateCoordinates(latitude, longitude);

  const lon = longitude.toFixed(6);
  const lat = latitude.toFixed(6);

  const url = `${BASE_URL}/category/${FIRE_RISK_CATEGORY}/version/${VERSION}/${period}/geotype/point/lon/${lon}/lat/${lat}/data.json`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new SMHIClientError(
      `Network error fetching fire risk forecast: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new SMHIClientError(
        `Location (${latitude}, ${longitude}) is outside SMHI fire risk forecast coverage area. ` +
        'SMHI covers Sweden, Norway, Finland, Denmark, Estonia, and parts of Latvia/Lithuania.',
        404
      );
    }
    throw new SMHIClientError(
      `SMHI API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  return response.json() as Promise<FWIResponse>;
}

/**
 * Gets the fire weather index forecast with fire/grass/forest-dryness risk classes resolved.
 */
export async function getFireRisk(
  latitude: number,
  longitude: number,
  period: FireRiskPeriod = 'daily'
): Promise<FireRisk[]> {
  const forecast = await fetchFireRisk(latitude, longitude, period);

  if (!forecast.timeSeries || forecast.timeSeries.length === 0) {
    throw new SMHIClientError('No fire risk forecast data available');
  }

  return forecast.timeSeries.map(timeSeriesToFireRisk);
}

/**
 * Fetches the latest Sweden precipitation radar composite (mosaic of all
 * Swedish radar stations) as a base64-encoded PNG.
 */
export async function fetchRadarComposite(): Promise<RadarComposite> {
  const metaUrl = `${RADAR_BASE_URL}/area/sweden/product/comp.json`;

  let metaResponse: Response;
  try {
    metaResponse = await fetch(metaUrl);
  } catch (error) {
    throw new SMHIClientError(
      `Network error fetching radar metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!metaResponse.ok) {
    throw new SMHIClientError(
      `SMHI radar API error: ${metaResponse.status} ${metaResponse.statusText}`,
      metaResponse.status
    );
  }

  const meta = (await metaResponse.json()) as RadarProductResponse;
  const latest = meta.lastFiles?.find(file => file.formats.some(format => format.key === 'png'));
  const pngFormat = latest?.formats.find(format => format.key === 'png');

  if (!latest || !pngFormat) {
    throw new SMHIClientError('No radar composite image currently available');
  }

  let imageResponse: Response;
  try {
    imageResponse = await fetch(pngFormat.link);
  } catch (error) {
    throw new SMHIClientError(
      `Network error fetching radar image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!imageResponse.ok) {
    throw new SMHIClientError(
      `SMHI radar API error: ${imageResponse.status} ${imageResponse.statusText}`,
      imageResponse.status
    );
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  return {
    area: 'sweden',
    product: 'comp',
    validTime: latest.valid,
    updated: latest.updated,
    mimeType: 'image/png',
    imageBase64: buffer.toString('base64'),
  };
}

/**
 * Flattens a single SMHI warning + one of its warningAreas into a WeatherWarning,
 * resolving all sv/en text pairs to the requested language.
 */
function warningAreaToWeatherWarning(
  warningId: number,
  event: { sv: string; en: string; code: string },
  area: SMHIWarningArea,
  language: WarningLanguage
): WeatherWarning {
  return {
    id: warningId,
    areaId: area.id,
    event: event[language],
    eventCode: event.code,
    severity: area.warningLevel[language],
    severityCode: area.warningLevel.code,
    areaName: area.areaName[language],
    affectedCounties: area.affectedAreas.map(a => a[language]),
    descriptions: area.descriptions.map(d => ({
      title: d.title[language],
      text: d.text[language],
    })),
    approximateStart: area.approximateStart,
    published: area.published,
  };
}

/**
 * Fetches the raw active weather warnings from SMHI's IBWwarnings API.
 * Not coordinate-based: returns all currently active warnings for Sweden.
 */
export async function fetchWeatherWarnings(): Promise<SMHIWarningsResponse> {
  let response: Response;
  try {
    response = await fetch(WARNINGS_URL);
  } catch (error) {
    throw new SMHIClientError(
      `Network error fetching weather warnings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    throw new SMHIClientError(
      `SMHI warnings API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  return response.json() as Promise<SMHIWarningsResponse>;
}

/**
 * Gets currently active weather warnings for Sweden, flattened to one entry per
 * warning area and optionally filtered by minimum severity and/or affected county.
 */
export async function getWeatherWarnings(
  language: WarningLanguage = 'en',
  minSeverity?: WarningSeverity,
  county?: string
): Promise<WeatherWarning[]> {
  const warnings = await fetchWeatherWarnings();

  const minRank = minSeverity ? SEVERITY_RANK[minSeverity] : undefined;
  const countyNeedle = county?.toLowerCase();

  const flattened: WeatherWarning[] = [];
  for (const warning of warnings) {
    for (const area of warning.warningAreas) {
      flattened.push(warningAreaToWeatherWarning(warning.id, warning.event, area, language));
    }
  }

  return flattened.filter(w => {
    if (minRank !== undefined && SEVERITY_RANK[w.severityCode] < minRank) {
      return false;
    }
    if (
      countyNeedle &&
      !w.areaName.toLowerCase().includes(countyNeedle) &&
      !w.affectedCounties.some(c => c.toLowerCase().includes(countyNeedle))
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Converts a MESAN2G time series entry to WeatherAnalysis format
 */
function timeSeriesToWeatherAnalysis(ts: MesanTimeSeries): WeatherAnalysis {
  const d = ts.data;

  return {
    temperature: d.air_temperature,
    temperatureMin: d.air_temperature_min,
    temperatureMax: d.air_temperature_max,
    dewPoint: d.dew_point_temperature,
    wetBulbTemperature: d.wet_bulb_temperature,
    humidity: d.relative_humidity,
    windSpeed: d.wind_speed,
    windDirection: d.wind_from_direction,
    windGust: d.wind_speed_of_gust,
    pressure: d.air_pressure_at_mean_sea_level,
    pressureAtStation: d.air_pressure,
    visibility: d.visibility_in_air,
    cloudCover: d.cloud_area_fraction,
    lowCloudCover: d.low_type_cloud_area_fraction,
    mediumCloudCover: d.medium_type_cloud_area_fraction,
    highCloudCover: d.high_type_cloud_area_fraction,
    cloudBaseAltitude: d.cloud_base_altitude,
    cloudTopAltitude: d.cloud_top_altitude,
    precipitationLast1h: d.precipitation_amount_last_1_hours,
    precipitationLast3h: d.precipitation_amount_last_3_hours,
    precipitationLast12h: d.precipitation_amount_last_12_hours,
    precipitationLast24h: d.precipitation_amount_last_24_hours,
    precipitationCategory: d.predominant_precipitation_type_at_surface,
    snowDepthChange1h: d.change_over_time_in_surface_snow_amount_1_hours,
    weatherSymbol: d.symbol_code,
    weatherDescription: getWeatherDescription(d.symbol_code),
    validTime: ts.time,
  };
}

/**
 * Fetches the raw meteorological analysis data from SMHI's MESAN2G (Mesan2gv3) API.
 * Returns the past ~24 hours of gridded "best current estimate" conditions, newest first.
 */
export async function fetchWeatherAnalysis(latitude: number, longitude: number): Promise<MesanResponse> {
  validateCoordinates(latitude, longitude);

  const lon = longitude.toFixed(6);
  const lat = latitude.toFixed(6);

  const url = `${ANALYSIS_BASE_URL}/category/${ANALYSIS_CATEGORY}/version/${ANALYSIS_VERSION}/geotype/point/lon/${lon}/lat/${lat}/data.json`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new SMHIClientError(
      `Network error fetching weather analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new SMHIClientError(
        `Location (${latitude}, ${longitude}) is outside SMHI meteorological analysis coverage area. ` +
        'SMHI covers Sweden, Norway, Finland, Denmark, Estonia, and parts of Latvia/Lithuania.',
        404
      );
    }
    throw new SMHIClientError(
      `SMHI API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  return response.json() as Promise<MesanResponse>;
}

/**
 * Gets the past ~24 hours of meteorological analysis (gridded "best current estimate"
 * conditions), most recent hour first. `hours` caps how many of the most recent entries
 * are returned.
 */
export async function getWeatherAnalysis(
  latitude: number,
  longitude: number,
  hours: number = 24
): Promise<WeatherAnalysis[]> {
  const analysis = await fetchWeatherAnalysis(latitude, longitude);

  if (!analysis.timeSeries || analysis.timeSeries.length === 0) {
    throw new SMHIClientError('No weather analysis data available');
  }

  return analysis.timeSeries.slice(0, hours).map(timeSeriesToWeatherAnalysis);
}
