import { z } from 'zod';
import { getFireRisk } from '../smhi-client.js';

export const getFireRiskSchema = z.object({
  latitude: z.number().min(-90).max(90).describe('Latitude of the location (-90 to 90)'),
  longitude: z.number().min(-180).max(180).describe('Longitude of the location (-180 to 180)'),
  period: z
    .enum(['daily', 'hourly'])
    .default('daily')
    .describe('Forecast granularity: "daily" for ~6 days ahead (afternoon fire risk), "hourly" for the next 48 hours'),
});

export type GetFireRiskInput = z.infer<typeof getFireRiskSchema>;

export async function getFireRiskTool(input: GetFireRiskInput) {
  const forecast = await getFireRisk(input.latitude, input.longitude, input.period);

  return {
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
    },
    period: input.period,
    forecast,
  };
}
