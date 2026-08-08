import { z } from 'zod';
import { getWeatherAnalysis } from '../smhi-client.js';

export const getWeatherAnalysisSchema = z.object({
  latitude: z.number().min(-90).max(90).describe('Latitude of the location (-90 to 90)'),
  longitude: z.number().min(-180).max(180).describe('Longitude of the location (-180 to 180)'),
  hours: z.number().min(1).max(24).default(24).describe('Number of most recent hours to return (1-24, default 24)'),
});

export type GetWeatherAnalysisInput = z.infer<typeof getWeatherAnalysisSchema>;

export async function getWeatherAnalysisTool(input: GetWeatherAnalysisInput) {
  const analysis = await getWeatherAnalysis(input.latitude, input.longitude, input.hours);

  return {
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
    },
    hours: input.hours,
    analysis,
  };
}
