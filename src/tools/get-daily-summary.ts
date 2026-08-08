import { z } from 'zod';
import { getDailySummary } from '../smhi-client.js';

export const getDailySummarySchema = z.object({
  latitude: z.number().min(-90).max(90).describe('Latitude of the location (-90 to 90)'),
  longitude: z.number().min(-180).max(180).describe('Longitude of the location (-180 to 180)'),
  days: z.number().min(1).max(10).default(7).describe('Number of days to summarize (1-10, default 7)'),
});

export type GetDailySummaryInput = z.infer<typeof getDailySummarySchema>;

export async function getDailySummaryTool(input: GetDailySummaryInput) {
  const summary = await getDailySummary(input.latitude, input.longitude, input.days);

  return {
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
    },
    days: input.days,
    summary,
  };
}
