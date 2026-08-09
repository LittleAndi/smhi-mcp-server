#!/usr/bin/env node

/**
 * SMHI MCP Server
 * Exposes Swedish Meteorological and Hydrological Institute weather data as MCP tools
 */

import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import type { z } from 'zod';

import {
  getForecast,
  getForecastSchema,
  getCurrentWeatherTool,
  getCurrentWeatherSchema,
  getHourlyForecastTool,
  getHourlyForecastSchema,
  getDailySummaryTool,
  getDailySummarySchema,
  getFireRiskTool,
  getFireRiskSchema,
  getRadarImageTool,
  getRadarImageSchema,
  getWeatherWarningsTool,
  getWeatherWarningsSchema,
  getWeatherAnalysisTool,
  getWeatherAnalysisSchema,
} from './tools/index.js';

const COVERAGE_NOTE =
  'Coverage: Sweden, Norway, Finland, Denmark, Estonia, and parts of Latvia/Lithuania.';

const ERROR_NOTE =
  'Returns an error result (isError: true) if coordinates are out of range or the SMHI API is unreachable.';

const READONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const server = new McpServer({
  name: 'smhi-mcp-server',
  version: '1.0.0',
});

/** Wraps a tool handler so any thrown error (e.g. SMHIClientError) surfaces as `Error: <message>` in an isError result. */
function withErrorHandling<Input, Output>(handler: (input: Input) => Promise<Output>) {
  return async (input: Input) => {
    try {
      const result = await handler(input);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}

server.registerTool(
  'get_forecast',
  {
    description:
      `Get the full ~10-day weather forecast for a location, with every raw SMHI parameter at native time ` +
      `resolution (hourly for the first days, then 3/6-hourly further out) — including fields not exposed by ` +
      `the other forecast tools, such as cloud layers and precipitation min/max/median. Prefer ` +
      `get_current_weather for a single now-reading, get_hourly_forecast for an hour-by-hour view, or ` +
      `get_daily_summary for a multi-day high/low overview; use this tool when you need the complete unprocessed ` +
      `dataset. Temperatures in °C, wind speed in m/s, pressure in hPa, precipitation in mm, humidity/cloud ` +
      `cover/probabilities in %. ${ERROR_NOTE} ${COVERAGE_NOTE}`,
    inputSchema: getForecastSchema,
    annotations: {
      title: 'Get Full Weather Forecast',
      ...READONLY_ANNOTATIONS,
    },
  },
  withErrorHandling(getForecast)
);

server.registerTool(
  'get_current_weather',
  {
    description:
      `Get current weather conditions (the nearest forecast time step) for a location: temperature, wind, ` +
      `humidity, precipitation, and a human-readable weather description. Use this for a quick "what's the ` +
      `weather like right now" snapshot; use get_hourly_forecast for future hours, get_daily_summary or ` +
      `get_forecast for a multi-day outlook. Temperature in °C, wind speed in m/s, pressure in hPa, ` +
      `precipitation in mm, humidity/cloud cover/probabilities in %. ${ERROR_NOTE} ${COVERAGE_NOTE}`,
    inputSchema: getCurrentWeatherSchema,
    annotations: {
      title: 'Get Current Weather',
      ...READONLY_ANNOTATIONS,
    },
  },
  withErrorHandling(getCurrentWeatherTool)
);

server.registerTool(
  'get_hourly_forecast',
  {
    description:
      `Get an hour-by-hour weather forecast for the next 1-48 hours (default 24): temperature, wind, ` +
      `precipitation, and conditions per hour. Use this to answer questions like "will it rain in the next ` +
      `few hours"; use get_current_weather for a single now-reading, get_daily_summary for a multi-day ` +
      `high/low overview, or get_forecast for the complete raw dataset. Temperature in °C, wind speed in m/s, ` +
      `precipitation in mm, probabilities in %. ${ERROR_NOTE} ${COVERAGE_NOTE}`,
    inputSchema: getHourlyForecastSchema,
    annotations: {
      title: 'Get Hourly Forecast',
      ...READONLY_ANNOTATIONS,
    },
  },
  withErrorHandling(getHourlyForecastTool)
);

server.registerTool(
  'get_daily_summary',
  {
    description:
      `Get a daily weather summary for the next 1-10 days (default 7): high/low temperature, dominant weather ` +
      `condition, precipitation total, and max wind speed per day. Use this for a multi-day outlook at a ` +
      `glance; use get_hourly_forecast or get_forecast when you need hour-level detail instead. Temperature in ` +
      `°C, wind speed in m/s, precipitation in mm. ${ERROR_NOTE} ${COVERAGE_NOTE}`,
    inputSchema: getDailySummarySchema,
    annotations: {
      title: 'Get Daily Weather Summary',
      ...READONLY_ANNOTATIONS,
    },
  },
  withErrorHandling(getDailySummaryTool)
);

server.registerTool(
  'get_fire_risk',
  {
    description:
      `Get a wildfire/forest fire risk forecast for a location, based on the Canadian Fire Weather Index (FWI) ` +
      `system as run by SMHI and calibrated for Swedish forest and grass fuels. Use this instead of the ` +
      `general forecast tools when the question is specifically about fire danger. Returns a fire risk class ` +
      `(1-6) plus the underlying FWI/ISI/BUI/FFMC/DMC/DC indices (unitless index values, not raw weather ` +
      `readings), grass fire risk class, and forest dryness class (daily period only). Also includes ` +
      `temperature (°C), wind speed (m/s), humidity (%), and multi-day precipitation sums (mm). ${ERROR_NOTE} ${COVERAGE_NOTE}`,
    inputSchema: getFireRiskSchema,
    annotations: {
      title: 'Get Wildfire Risk Forecast',
      ...READONLY_ANNOTATIONS,
    },
  },
  withErrorHandling(getFireRiskTool)
);

server.registerTool(
  'get_radar_image',
  {
    description:
      'Get the latest Swedish precipitation radar composite (mosaic of all Swedish radar stations), updated ' +
      'roughly every 5 minutes. Unlike the forecast tools, this shows observed precipitation happening right ' +
      'now, not a prediction — use the forecast tools instead if the question is about future weather. Takes ' +
      'no parameters. Returns a PNG image plus its area, product name, and validTime/updated timestamps. ' +
      'Returns an error result (isError: true) if the SMHI radar API is unreachable. Coverage: Sweden only.',
    inputSchema: getRadarImageSchema,
    annotations: {
      title: 'Get Precipitation Radar Image',
      ...READONLY_ANNOTATIONS,
    },
  },
  async (input: z.infer<typeof getRadarImageSchema>) => {
    try {
      const result = await getRadarImageTool(input);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { area: result.area, product: result.product, validTime: result.validTime, updated: result.updated },
              null,
              2
            ),
          },
          { type: 'image' as const, data: result.imageBase64, mimeType: result.mimeType },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'get_weather_warnings',
  {
    description:
      'Get currently active official SMHI weather warnings/alerts for Sweden (impact-based warnings for ' +
      'wind, rain, snow, thunder, high temperatures, flooding, fire risk, and more). Not coordinate-based — ' +
      'returns all active warnings, each tagged with the county/area it affects, so filter by county name ' +
      'and/or minimum severity to narrow results. Severity levels from most to least severe: RED > ORANGE > ' +
      'YELLOW > MESSAGE. Use this for "is there a storm warning" type questions; use the forecast tools for ' +
      'general future conditions and get_fire_risk for the underlying fire danger index. Returns an error ' +
      'result (isError: true) if the SMHI warnings API is unreachable. Coverage: Sweden only.',
    inputSchema: getWeatherWarningsSchema,
    annotations: {
      title: 'Get Active Weather Warnings',
      ...READONLY_ANNOTATIONS,
    },
  },
  withErrorHandling(getWeatherWarningsTool)
);

server.registerTool(
  'get_weather_analysis',
  {
    description:
      `Get the past ~24 hours of gridded meteorological analysis for a location, from SMHI's Mesan2gv3 API — a ` +
      `"best current estimate" of conditions (observations blended with a short-range model on a ~2.5 km grid), ` +
      `not a forecast. Use this for nowcasting ("what's actually happening right now" at a point without a ` +
      `nearby observation station), verifying how a past forecast turned out, or "what was the weather really ` +
      `like" lookups; use the forecast tools instead for future conditions. Returns hourly entries (most recent ` +
      `first) with temperature (°C, plus min/max at some hours), dew point, wet-bulb temperature, wind (m/s), ` +
      `pressure (hPa, sea-level and station), visibility (km), cloud cover layers and base/top altitude (%, m), ` +
      `precipitation over the last 1/3/12/24h (mm, later windows only populated at some hours), snow depth ` +
      `change (cm), and a human-readable weather description. ${ERROR_NOTE} ${COVERAGE_NOTE}`,
    inputSchema: getWeatherAnalysisSchema,
    annotations: {
      title: 'Get Meteorological Analysis',
      ...READONLY_ANNOTATIONS,
    },
  },
  withErrorHandling(getWeatherAnalysisTool)
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SMHI MCP server running on stdio');
}

main().catch(console.error);
