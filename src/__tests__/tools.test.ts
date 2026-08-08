import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getForecast, getForecastSchema } from '../tools/get-forecast.js';
import { getCurrentWeatherTool, getCurrentWeatherSchema } from '../tools/get-current-weather.js';
import { getHourlyForecastTool, getHourlyForecastSchema } from '../tools/get-hourly-forecast.js';
import { getDailySummaryTool, getDailySummarySchema } from '../tools/get-daily-summary.js';
import { getFireRiskTool, getFireRiskSchema } from '../tools/get-fire-risk.js';
import { getRadarImageTool, getRadarImageSchema } from '../tools/get-radar-image.js';
import { getWeatherWarningsTool, getWeatherWarningsSchema } from '../tools/get-weather-warnings.js';
import { getWeatherAnalysisTool, getWeatherAnalysisSchema } from '../tools/get-weather-analysis.js';
import forecastFixture from './fixtures/forecast-response.json';
import fireRiskFixture from './fixtures/fire-risk-response.json';
import radarCompFixture from './fixtures/radar-comp-response.json';
import warningsFixture from './fixtures/warnings-response.json';
import weatherAnalysisFixture from './fixtures/weather-analysis-response.json';

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

  describe('getFireRiskTool', () => {
    beforeEach(() => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fireRiskFixture),
      });
      vi.stubGlobal('fetch', mockFetch);
    });

    it('validates input schema with defaults', () => {
      const parsed = getFireRiskSchema.parse({ latitude: 59, longitude: 18 });
      expect(parsed.period).toBe('daily');
    });

    it('rejects an invalid period', () => {
      expect(() => getFireRiskSchema.parse({ latitude: 59, longitude: 18, period: 'weekly' })).toThrow();
    });

    it('returns fire risk forecast array', async () => {
      const result = await getFireRiskTool({ latitude: 59.3293, longitude: 18.0686, period: 'daily' });

      expect(result.location.latitude).toBe(59.3293);
      expect(result.period).toBe('daily');
      expect(result.forecast).toBeInstanceOf(Array);
      expect(result.forecast[0].fireRiskDescription).toBe('Very high risk');
    });
  });

  describe('getRadarImageTool', () => {
    beforeEach(() => {
      const fakePngBytes = new Uint8Array([137, 80, 78, 71]).buffer;
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(radarCompFixture),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(fakePngBytes),
        });
      vi.stubGlobal('fetch', mockFetch);
    });

    it('validates input schema', () => {
      expect(() => getRadarImageSchema.parse({})).not.toThrow();
    });

    it('returns the latest radar composite image', async () => {
      const result = await getRadarImageTool({});

      expect(result.area).toBe('sweden');
      expect(result.product).toBe('comp');
      expect(result.validTime).toBe('2026-08-08 15:50');
      expect(result.mimeType).toBe('image/png');
      expect(result.imageBase64.length).toBeGreaterThan(0);
    });
  });

  describe('getWeatherWarningsTool', () => {
    beforeEach(() => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(warningsFixture),
      });
      vi.stubGlobal('fetch', mockFetch);
    });

    it('validates input schema with defaults', () => {
      const parsed = getWeatherWarningsSchema.parse({});
      expect(parsed.language).toBe('en');
    });

    it('rejects an invalid minSeverity', () => {
      expect(() => getWeatherWarningsSchema.parse({ minSeverity: 'PURPLE' })).toThrow();
    });

    it('returns active warnings with a count', async () => {
      const result = await getWeatherWarningsTool({ language: 'en' });

      expect(result.count).toBe(3);
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.warnings[0].event).toBe('Wind');
    });

    it('applies minSeverity and county filters', async () => {
      const result = await getWeatherWarningsTool({ language: 'en', minSeverity: 'MESSAGE', county: 'Gotland' });

      expect(result.count).toBe(1);
      expect(result.warnings[0].areaName).toBe('Gotland');
    });
  });

  describe('getWeatherAnalysisTool', () => {
    beforeEach(() => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(weatherAnalysisFixture),
      });
      vi.stubGlobal('fetch', mockFetch);
    });

    it('validates input schema with defaults', () => {
      const parsed = getWeatherAnalysisSchema.parse({ latitude: 59, longitude: 18 });
      expect(parsed.hours).toBe(24);
    });

    it('validates hours range', () => {
      expect(() => getWeatherAnalysisSchema.parse({ latitude: 59, longitude: 18, hours: 0 })).toThrow();
      expect(() => getWeatherAnalysisSchema.parse({ latitude: 59, longitude: 18, hours: 25 })).toThrow();
      expect(() => getWeatherAnalysisSchema.parse({ latitude: 59, longitude: 18, hours: 24 })).not.toThrow();
    });

    it('returns weather analysis array', async () => {
      const result = await getWeatherAnalysisTool({ latitude: 59.3293, longitude: 18.0686, hours: 24 });

      expect(result.location.latitude).toBe(59.3293);
      expect(result.hours).toBe(24);
      expect(result.analysis).toBeInstanceOf(Array);
      expect(result.analysis[0].weatherDescription).toBeDefined();
    });
  });
});
