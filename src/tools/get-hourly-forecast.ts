import { z } from 'zod';
import { getHourlyForecast } from '../smhi-client.js';

export const getHourlyForecastSchema = z.object({
  latitude: z.number().min(-90).max(90).describe('Latitude of the location (-90 to 90)'),
  longitude: z.number().min(-180).max(180).describe('Longitude of the location (-180 to 180)'),
  hours: z.number().min(1).max(48).default(24).describe('Number of hours to forecast (1-48, default 24)'),
});

export type GetHourlyForecastInput = z.infer<typeof getHourlyForecastSchema>;

export async function getHourlyForecastTool(input: GetHourlyForecastInput) {
  const hourly = await getHourlyForecast(input.latitude, input.longitude, input.hours);

  return {
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
    },
    hours: input.hours,
    forecast: hourly,
  };
}
