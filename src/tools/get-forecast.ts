import { z } from 'zod';
import { fetchForecast } from '../smhi-client.js';

export const getForecastSchema = z.object({
  latitude: z.number().min(-90).max(90).describe('Latitude of the location (-90 to 90)'),
  longitude: z.number().min(-180).max(180).describe('Longitude of the location (-180 to 180)'),
});

export type GetForecastInput = z.infer<typeof getForecastSchema>;

export async function getForecast(input: GetForecastInput) {
  const forecast = await fetchForecast(input.latitude, input.longitude);

  return {
    referenceTime: forecast.referenceTime,
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
    },
    timeSeries: forecast.timeSeries.map(ts => ({
      validTime: ts.time,
      parameters: ts.data,
    })),
  };
}
