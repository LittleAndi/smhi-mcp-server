import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getForecast, getForecastSchema } from '../tools/get-forecast.js';
import { getCurrentWeatherTool, getCurrentWeatherSchema } from '../tools/get-current-weather.js';
import { getHourlyForecastTool, getHourlyForecastSchema } from '../tools/get-hourly-forecast.js';
import { getDailySummaryTool, getDailySummarySchema } from '../tools/get-daily-summary.js';
import forecastFixture from './fixtures/forecast-response.json';

describe('MCP Tools', () => {
  beforeEach(() => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(forecastFixture),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getForecast', () => {
    it('validates input schema', () => {
      expect(() => getForecastSchema.parse({ latitude: 59, longitude: 18 })).not.toThrow();
      expect(() => getForecastSchema.parse({ latitude: 91, longitude: 18 })).toThrow();
      expect(() => getForecastSchema.parse({ latitude: 59 })).toThrow();
    });

    it('returns complete forecast structure', async () => {
      const result = await getForecast({ latitude: 59.3293, longitude: 18.0686 });

      expect(result.referenceTime).toBeDefined();
      expect(result.location.latitude).toBe(59.3293);
      expect(result.timeSeries).toBeInstanceOf(Array);
      expect(result.timeSeries[0].parameters.air_temperature).toBe(-2.5);
    });
  });

  describe('getCurrentWeatherTool', () => {
    it('validates input schema', () => {
      expect(() => getCurrentWeatherSchema.parse({ latitude: 59, longitude: 18 })).not.toThrow();
      expect(() => getCurrentWeatherSchema.parse({ latitude: -91, longitude: 18 })).toThrow();
    });

    it('returns current weather with location', async () => {
      const result = await getCurrentWeatherTool({ latitude: 59.3293, longitude: 18.0686 });

      expect(result.location.latitude).toBe(59.3293);
      expect(result.current.temperature).toBeDefined();
      expect(result.current.weatherDescription).toBeDefined();
    });
  });

  describe('getHourlyForecastTool', () => {
    it('validates input schema with defaults', () => {
      const parsed = getHourlyForecastSchema.parse({ latitude: 59, longitude: 18 });
      expect(parsed.hours).toBe(24);
    });

    it('validates hours range', () => {
      expect(() => getHourlyForecastSchema.parse({ latitude: 59, longitude: 18, hours: 0 })).toThrow();
      expect(() => getHourlyForecastSchema.parse({ latitude: 59, longitude: 18, hours: 49 })).toThrow();
      expect(() => getHourlyForecastSchema.parse({ latitude: 59, longitude: 18, hours: 48 })).not.toThrow();
    });

    it('returns hourly forecast array', async () => {
      const result = await getHourlyForecastTool({ latitude: 59.3293, longitude: 18.0686, hours: 24 });

      expect(result.location.latitude).toBe(59.3293);
      expect(result.hours).toBe(24);
      expect(result.forecast).toBeInstanceOf(Array);
    });
  });

  describe('getDailySummaryTool', () => {
    it('validates input schema with defaults', () => {
      const parsed = getDailySummarySchema.parse({ latitude: 59, longitude: 18 });
      expect(parsed.days).toBe(7);
    });

    it('validates days range', () => {
      expect(() => getDailySummarySchema.parse({ latitude: 59, longitude: 18, days: 0 })).toThrow();
      expect(() => getDailySummarySchema.parse({ latitude: 59, longitude: 18, days: 11 })).toThrow();
      expect(() => getDailySummarySchema.parse({ latitude: 59, longitude: 18, days: 10 })).not.toThrow();
    });

    it('returns daily summary array', async () => {
      const result = await getDailySummaryTool({ latitude: 59.3293, longitude: 18.0686, days: 7 });

      expect(result.location.latitude).toBe(59.3293);
      expect(result.days).toBe(7);
      expect(result.summary).toBeInstanceOf(Array);
      if (result.summary.length > 0) {
        expect(result.summary[0].date).toBeDefined();
        expect(result.summary[0].highTemp).toBeDefined();
        expect(result.summary[0].lowTemp).toBeDefined();
      }
    });
  });
});
