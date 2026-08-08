import { z } from 'zod';
import { fetchRadarComposite } from '../smhi-client.js';

export const getRadarImageSchema = z.object({});

export type GetRadarImageInput = z.infer<typeof getRadarImageSchema>;

export async function getRadarImageTool(_input: GetRadarImageInput) {
  return fetchRadarComposite();
}
