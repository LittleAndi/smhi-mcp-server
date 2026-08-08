import { describe, it, expect } from 'vitest';
import { getWeatherDescription, getPrecipitationCategory, WEATHER_SYMBOLS } from '../weather-symbols.js';

describe('Weather Symbols', () => {
  describe('getWeatherDescription', () => {
    it('returns correct description for valid symbols', () => {
      expect(getWeatherDescription(1)).toBe('Clear sky');
      expect(getWeatherDescription(15)).toBe('Light snow showers');
      expect(getWeatherDescription(27)).toBe('Heavy snowfall');
    });

    it('returns a fallback with the code for unmapped symbols', () => {
      expect(getWeatherDescription(0)).toBe('Unknown (code 0)');
      expect(getWeatherDescription(28)).toBe('Unknown (code 28)');
      expect(getWeatherDescription(-1)).toBe('Unknown (code -1)');
    });
  });

  describe('getPrecipitationCategory', () => {
    it('returns correct category names', () => {
      expect(getPrecipitationCategory(0)).toBe('No precipitation');
      expect(getPrecipitationCategory(1)).toBe('Snow');
      expect(getPrecipitationCategory(3)).toBe('Rain');
    });

    it('returns a fallback with the code for unmapped categories', () => {
      expect(getPrecipitationCategory(7)).toBe('Unknown (code 7)');
      expect(getPrecipitationCategory(-1)).toBe('Unknown (code -1)');
    });
  });

  describe('WEATHER_SYMBOLS constant', () => {
    it('has all 27 weather symbols defined', () => {
      expect(Object.keys(WEATHER_SYMBOLS)).toHaveLength(27);
      for (let i = 1; i <= 27; i++) {
        expect(WEATHER_SYMBOLS[i]).toBeDefined();
      }
    });
  });
});
