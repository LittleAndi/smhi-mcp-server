/**
 * SMHI FWIF1G fire risk class mappings.
 * Each index/class scale is documented at
 * https://opendata.smhi.se/metfcst/fwif/parameters
 */

export const FIRE_RISK_CLASSES: Record<number, string> = {
  [-1]: 'Data missing',
  1: 'Very low risk',
  2: 'Low risk',
  3: 'Moderate risk',
  4: 'High risk',
  5: 'Very high risk',
  6: 'Extremely high risk',
};

export function getFireRiskClass(classId: number): string {
  return FIRE_RISK_CLASSES[classId] ?? `Unknown (class ${classId})`;
}

/**
 * grassfire: risk classes for dead grass from the previous year.
 * Classes 1-2 are seasonal states rather than risk levels (snow cover / season over).
 */
export const GRASS_FIRE_CLASSES: Record<number, string> = {
  [-1]: 'Data missing or outside season',
  1: 'Snow cover',
  2: 'Grass fire season over',
  3: 'Low',
  4: 'Moderate',
  5: 'High',
  6: 'Very high',
};

export function getGrassFireClass(classId: number): string {
  return GRASS_FIRE_CLASSES[classId] ?? `Unknown (class ${classId})`;
}

/**
 * forestdry: fuel-drying classes for forest fuel water content (daily forecast only).
 */
export const FOREST_DRYNESS_CLASSES: Record<number, string> = {
  [-1]: 'Data missing',
  1: 'Very wet',
  2: 'Wet',
  3: 'Moderately wet',
  4: 'Dry',
  5: 'Very dry',
  6: 'Extremely dry',
};

export function getForestDrynessClass(classId: number): string {
  return FOREST_DRYNESS_CLASSES[classId] ?? `Unknown (class ${classId})`;
}
