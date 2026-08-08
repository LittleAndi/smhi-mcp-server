import { z } from 'zod';
import { getCurrentWeather } from '../smhi-client.js';

export const getCurrentWeatherSchema = z.object({
  latitude: z.number().min(-90).max(90).describe('Latitude of the location (-90 to 90)'),
  longitude: z.number().min(-180).max(180).describe('Longitude of the location (-180 to 180)'),
});

export type GetCurrentWeatherInput = z.infer<typeof getCurrentWeatherSchema>;

export async function getCurrentWeatherTool(input: GetCurrentWeatherInput) {
  const weather = await getCurrentWeather(input.latitude, input.longitude);

  return {
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
    },
    current: weather,
  };
}
