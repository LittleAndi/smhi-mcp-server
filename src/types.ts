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
