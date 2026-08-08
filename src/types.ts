/**
 * SMHI SNOW1G Open Data API types
 * Endpoint: https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/{lon}/lat/{lat}/data.json
 */

// Raw API response types
export interface SMHIResponse {
  createdTime: string;
  referenceTime: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  timeSeries: SMHITimeSeries[];
}

export interface SMHITimeSeries {
  time: string;
  intervalParametersStartTime: string;
  data: SMHITimeSeriesData;
}

export interface SMHITimeSeriesData {
  air_temperature: number;
  wind_from_direction: number;
  wind_speed: number;
  wind_speed_of_gust: number;
  relative_humidity: number;
  air_pressure_at_mean_sea_level: number;
  visibility_in_air: number;
  thunderstorm_probability: number;
  probability_of_frozen_precipitation: number;
  cloud_area_fraction: number;
  low_type_cloud_area_fraction: number;
  medium_type_cloud_area_fraction: number;
  high_type_cloud_area_fraction: number;
  cloud_base_altitude: number;
  cloud_top_altitude: number;
  precipitation_amount_mean_deterministic: number;
  precipitation_amount_mean: number;
  precipitation_amount_min: number;
  precipitation_amount_max: number;
  precipitation_amount_median: number;
  probability_of_precipitation: number;
  precipitation_frozen_part: number;
  predominant_precipitation_type_at_surface: number;
  symbol_code: number;
}

// Processed weather data types
export interface CurrentWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  pressure: number;
  visibility: number;
  cloudCover: number;
  precipitation: number;
  precipitationProbability: number;
  precipitationCategory: number;
  thunderProbability: number;
  weatherSymbol: number;
  weatherDescription: string;
  validTime: string;
}

export interface HourlyForecast extends CurrentWeather {
  // Same fields as CurrentWeather
}

export interface DailySummary {
  date: string;
  highTemp: number;
  lowTemp: number;
  dominantWeather: string;
  precipitationSum: number;
  maxWindSpeed: number;
}

// Tool input types
export interface CoordinatesInput {
  latitude: number;
  longitude: number;
}

export interface HourlyForecastInput extends CoordinatesInput {
  hours?: number;
}

export interface DailySummaryInput extends CoordinatesInput {
  days?: number;
}

/**
 * SMHI FWIF1G Fire Weather Index Forecast types
 * Endpoint: https://opendata-download-metfcst.smhi.se/api/category/fwif1g/version/1/{daily|hourly}/geotype/point/lon/{lon}/lat/{lat}/data.json
 */
export type FireRiskPeriod = 'daily' | 'hourly';

export interface FWIResponse {
  approvedTime: string;
  referenceTime: string;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  timeSeries: FWITimeSeries[];
}

export interface FWITimeSeries {
  validTime: string;
  parameters: FWIParameter[];
}

export interface FWIParameter {
  name: string;
  levelType: string;
  level: number;
  unit: string;
  values: number[];
}

// Processed fire risk data
export interface FireRisk {
  validTime: string;
  fireRiskClass: number;
  fireRiskDescription: string;
  fwi: number;
  isi: number;
  bui: number;
  ffmc: number;
  dmc: number;
  dc: number;
  grassFireClass?: number;
  grassFireDescription?: string;
  forestDrynessClass?: number;
  forestDrynessDescription?: string;
  temperature: number;
  windDirection: number;
  windSpeed: number;
  humidity: number;
  precipitation: Record<string, number>;
}

export interface FireRiskInput extends CoordinatesInput {
  period?: FireRiskPeriod;
}

/**
 * SMHI Radar Open Data types
 * Endpoint: https://opendata-download-radar.smhi.se/api/version/latest/area/sweden/product/comp.json
 */
export interface RadarFileFormat {
  key: string;
  updated: string;
  link: string;
}

export interface RadarFile {
  key: string;
  valid: string;
  updated: string;
  formats: RadarFileFormat[];
}

export interface RadarProductResponse {
  key: string;
  updated: string;
  timeZone: string;
  lastFiles: RadarFile[];
}

// Processed radar composite image
export interface RadarComposite {
  area: string;
  product: string;
  validTime: string;
  updated: string;
  mimeType: string;
  imageBase64: string;
}

/**
 * SMHI Impact Based Weather Warnings (IBWwarnings) types
 * Endpoint: https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json
 */
export type WarningSeverity = 'RED' | 'ORANGE' | 'YELLOW' | 'MESSAGE';

export interface SMHIWarningTranslated {
  sv: string;
  en: string;
}

export interface SMHIWarningCodedText extends SMHIWarningTranslated {
  code: string;
}

export interface SMHIWarningEvent extends SMHIWarningCodedText {
  mhoClassification?: SMHIWarningCodedText;
}

export interface SMHIWarningLevel extends SMHIWarningTranslated {
  code: WarningSeverity;
}

export interface SMHIAffectedArea extends SMHIWarningTranslated {
  id: number;
}

export interface SMHIWarningDescriptionSection {
  title: SMHIWarningCodedText;
  text: SMHIWarningTranslated;
}

export interface SMHIWarningArea {
  id: number;
  approximateStart: string;
  published: string;
  normalProbability: boolean;
  pushNotice: boolean;
  areaName: SMHIWarningTranslated;
  warningLevel: SMHIWarningLevel;
  eventDescription: SMHIWarningCodedText;
  affectedAreas: SMHIAffectedArea[];
  descriptions: SMHIWarningDescriptionSection[];
  area: {
    type: string;
    geometry: {
      type: string;
      coordinates: unknown;
    };
    properties: Record<string, unknown>;
  };
}

export interface SMHIWarning {
  id: number;
  normalProbability: boolean;
  event: SMHIWarningEvent;
  descriptions: SMHIWarningDescriptionSection[];
  warningAreas: SMHIWarningArea[];
  created: string;
}

export type SMHIWarningsResponse = SMHIWarning[];

// Processed weather warning: one entry per warningArea, in the requested language
export interface WeatherWarning {
  id: number;
  areaId: number;
  event: string;
  eventCode: string;
  severity: string;
  severityCode: WarningSeverity;
  areaName: string;
  affectedCounties: string[];
  descriptions: { title: string; text: string }[];
  approximateStart: string;
  published: string;
}

export type WarningLanguage = 'sv' | 'en';

export interface GetWeatherWarningsInput {
  language?: WarningLanguage;
  minSeverity?: WarningSeverity;
  county?: string;
}

/**
 * SMHI MESAN2G Meteorological Analysis (Mesan2gv3) types
 * Endpoint: https://opendata-download-metanalys.smhi.se/api/category/mesan2g/version/3/geotype/point/lon/{lon}/lat/{lat}/data.json
 * Unlike the forecast APIs, this is a gridded "best current estimate" analysis (observations
 * blended with a short-range model) covering the past ~24 hours, returned newest entry first.
 * Some fields are only populated at synoptic hours (00/06/12/18 UTC and similar), hence optional.
 */
export interface MesanResponse {
  createdTime: string;
  referenceTime: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  timeSeries: MesanTimeSeries[];
}

export interface MesanTimeSeries {
  time: string;
  data: MesanTimeSeriesData;
}

export interface MesanTimeSeriesData {
  air_temperature: number;
  air_temperature_min?: number;
  air_temperature_max?: number;
  dew_point_temperature: number;
  wet_bulb_temperature: number;
  wind_from_direction: number;
  wind_speed: number;
  wind_speed_of_gust: number;
  relative_humidity: number;
  air_pressure: number;
  air_pressure_at_mean_sea_level: number;
  visibility_in_air: number;
  cloud_area_fraction: number;
  low_type_cloud_area_fraction: number;
  medium_type_cloud_area_fraction: number;
  high_type_cloud_area_fraction: number;
  cloud_base_altitude: number;
  cloud_top_altitude: number;
  precipitation_amount_last_1_hours: number;
  precipitation_amount_last_3_hours?: number;
  precipitation_amount_last_12_hours?: number;
  precipitation_amount_last_24_hours?: number;
  precipitation_frozen_part: number;
  predominant_precipitation_type_at_surface: number;
  change_over_time_in_surface_snow_amount_1_hours: number;
  change_over_time_in_surface_snow_amount_3_hours?: number;
  change_over_time_in_surface_snow_amount_12_hours?: number;
  change_over_time_in_surface_snow_amount_24_hours?: number;
  symbol_code: number;
}

// Processed weather analysis data
export interface WeatherAnalysis {
  temperature: number;
  temperatureMin?: number;
  temperatureMax?: number;
  dewPoint: number;
  wetBulbTemperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  pressure: number;
  pressureAtStation: number;
  visibility: number;
  cloudCover: number;
  lowCloudCover: number;
  mediumCloudCover: number;
  highCloudCover: number;
  cloudBaseAltitude: number;
  cloudTopAltitude: number;
  precipitationLast1h: number;
  precipitationLast3h?: number;
  precipitationLast12h?: number;
  precipitationLast24h?: number;
  precipitationCategory: number;
  snowDepthChange1h: number;
  weatherSymbol: number;
  weatherDescription: string;
  validTime: string;
}

export interface WeatherAnalysisInput extends CoordinatesInput {
  hours?: number;
}
