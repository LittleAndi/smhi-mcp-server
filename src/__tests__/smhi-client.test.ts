import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchForecast, getCurrentWeather, getHourlyForecast, getDailySummary, SMHIClientError } from '../smhi-client.js';
import forecastFixture from './fixtures/forecast-response.json';

describe('SMHI Client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchForecast', () => {
    it('fetches forecast for valid coordinates', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(forecastFixture),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await fetchForecast(59.3293, 18.0686);

      expect(result.referenceTime).toBe('2026-02-04T09:00:00Z');
      expect(result.timeSeries).toHaveLength(4);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category/snow1g/version/1/geotype/point/lon/18.068600/lat/59.329300')
      );
    });

    it('throws on invalid latitude', async () => {
      await expect(fetchForecast(91, 18)).rejects.toThrow('Invalid latitude');
      await expect(fetchForecast(-91, 18)).rejects.toThrow('Invalid latitude');
    });

    it('throws on invalid longitude', async () => {
      await expect(fetchForecast(59, 181)).rejects.toThrow('Invalid longitude');
      await expect(fetchForecast(59, -181)).rejects.toThrow('Invalid longitude');
    });

    it('throws on coordinates outside coverage area', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(fetchForecast(40.7128, -74.006)).rejects.toThrow('outside SMHI coverage area');
    });

    it('handles network errors gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
      vi.stubGlobal('fetch', mockFetch);

      await expect(fetchForecast(59.3293, 18.0686)).rejects.toThrow('Network error');
    });
  });

  describe('getCurrentWeather', () => {
    it('returns simplified current conditions', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(forecastFixture),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await getCurrentWeather(59.3293, 18.0686);

      expect(result.temperature).toBe(-2.5);
      expect(result.windSpeed).toBe(4.2);
      expect(result.humidity).toBe(85);
      expect(result.weatherSymbol).toBe(15);
      expect(result.weatherDescription).toBe('Light snow showers');
      expect(result.validTime).toBe('2026-02-04T11:00:00Z');
    });

    it('maps weather symbol to description', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(forecastFixture),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await getCurrentWeather(59.3293, 18.0686);

      expect(result.weatherDescription).toBe('Light snow showers');
    });
  });

  describe('getHourlyForecast', () => {
    it('returns correct number of hours', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(forecastFixture),
      });
      vi.stubGlobal('fetch', mockFetch);

      // The fixture has entries spanning several hours
      const result = await getHourlyForecast(59.3293, 18.0686, 48);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].temperature).toBe(-2.5);
    });
  });

  describe('getDailySummary', () => {
    it('aggregates daily high/low correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(forecastFixture),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await getDailySummary(59.3293, 18.0686, 7);

      expect(result.length).toBeGreaterThan(0);
      // First day has temps: -2.5, -1.8, -0.5
      expect(result[0].highTemp).toBe(-0.5);
      expect(result[0].lowTemp).toBe(-2.5);
    });

    it('returns correct number of days', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(forecastFixture),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await getDailySummary(59.3293, 18.0686, 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });
});
