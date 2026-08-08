import { z } from 'zod';
import { getWeatherWarnings } from '../smhi-client.js';

export const getWeatherWarningsSchema = z.object({
  language: z
    .enum(['sv', 'en'])
    .default('en')
    .describe('Language for warning text: "en" (English) or "sv" (Swedish)'),
  minSeverity: z
    .enum(['RED', 'ORANGE', 'YELLOW', 'MESSAGE'])
    .optional()
    .describe(
      'Only return warnings at or above this severity (RED > ORANGE > YELLOW > MESSAGE). Omit to return all active warnings.'
    ),
  county: z
    .string()
    .optional()
    .describe(
      'Only return warnings affecting this county or area (case-insensitive substring match against the warning\'s area name and affected counties), e.g. "Stockholm" or "Gotland"'
    ),
});

export type GetWeatherWarningsInput = z.infer<typeof getWeatherWarningsSchema>;

export async function getWeatherWarningsTool(input: GetWeatherWarningsInput) {
  const warnings = await getWeatherWarnings(input.language, input.minSeverity, input.county);

  return {
    count: warnings.length,
    warnings,
  };
}
