import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchForecast, getCurrentWeather, getHourlyForecast, getDailySummary, fetchFireRisk, getFireRisk, fetchRadarComposite, SMHIClientError } from '../smhi-client.js';
import forecastFixture from './fixtures/forecast-response.json';
import fireRiskFixture from './fixtures/fire-risk-response.json';
import radarCompFixture from './fixtures/radar-comp-response.json';

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

  describe('fetchFireRisk', () => {
    it('fetches from the fwif1g category with the given period', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fireRiskFixture),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await fetchFireRisk(59.3293, 18.0686, 'daily');

      expect(result.referenceTime).toBe('2026-08-06T12:00:00Z');
      expect(result.timeSeries).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category/fwif1g/version/1/daily/geotype/point/lon/18.068600/lat/59.329300')
      );
    });

    it('defaults to the daily period', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fireRiskFixture),
      });
      vi.stubGlobal('fetch', mockFetch);

      await fetchFireRisk(59.3293, 18.0686);

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/daily/geotype/point/'));
    });

    it('throws on coordinates outside coverage area', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(fetchFireRisk(40.7128, -74.006)).rejects.toThrow('outside SMHI fire risk forecast coverage area');
    });
  });

  describe('getFireRisk', () => {
    it('resolves fire risk classes and splits out precipitation fields', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fireRiskFixture),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await getFireRisk(59.3293, 18.0686, 'daily');

      expect(result).toHaveLength(2);
      expect(result[0].fireRiskClass).toBe(5);
      expect(result[0].fireRiskDescription).toBe('Very high risk');
      expect(result[0].fwi).toBe(23.0);
      expect(result[0].grassFireClass).toBe(-1);
      expect(result[0].grassFireDescription).toBe('Data missing or outside season');
      expect(result[0].forestDrynessClass).toBe(5);
      expect(result[0].forestDrynessDescription).toBe('Very dry');
      expect(result[0].precipitation).toEqual({ prec1d: 0.0, prec2d: 0.1 });

      expect(result[1].fireRiskClass).toBe(6);
      expect(result[1].fireRiskDescription).toBe('Extremely high risk');
      expect(result[1].grassFireClass).toBe(4);
      expect(result[1].grassFireDescription).toBe('Moderate');
    });
  });

  describe('fetchRadarComposite', () => {
    it('fetches metadata then downloads the latest PNG', async () => {
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

      const result = await fetchRadarComposite();

      expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('area/sweden/product/comp.json'));
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://opendata-download-radar.smhi.se/api/version/latest/area/sweden/product/comp/latest.png'
      );
      expect(result.area).toBe('sweden');
      expect(result.product).toBe('comp');
      expect(result.validTime).toBe('2026-08-08 15:50');
      expect(result.mimeType).toBe('image/png');
      expect(result.imageBase64).toBe(Buffer.from(fakePngBytes).toString('base64'));
    });

    it('throws when metadata fetch fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(fetchRadarComposite()).rejects.toThrow('SMHI radar API error: 503');
    });

    it('throws when no PNG file is listed', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...radarCompFixture, lastFiles: [] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(fetchRadarComposite()).rejects.toThrow('No radar composite image currently available');
    });
  });
});
