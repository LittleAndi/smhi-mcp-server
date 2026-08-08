#!/usr/bin/env node

/**
 * SMHI MCP Server
 * Exposes Swedish Meteorological and Hydrological Institute weather data as MCP tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

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
} from './tools/index.js';
import { SMHIClientError } from './smhi-client.js';

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

const server = new Server(
  {
    name: 'smhi-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_forecast',
        description:
          `Get the full ~10-day weather forecast for a location, with every raw SMHI parameter at native time ` +
          `resolution (hourly for the first days, then 3/6-hourly further out) — including fields not exposed by ` +
          `the other forecast tools, such as cloud layers and precipitation min/max/median. Prefer ` +
          `get_current_weather for a single now-reading, get_hourly_forecast for an hour-by-hour view, or ` +
          `get_daily_summary for a multi-day high/low overview; use this tool when you need the complete unprocessed ` +
          `dataset. Temperatures in °C, wind speed in m/s, pressure in hPa, precipitation in mm, humidity/cloud ` +
          `cover/probabilities in %. ${ERROR_NOTE} ${COVERAGE_NOTE}`,
        annotations: {
          title: 'Get Full Weather Forecast',
          ...READONLY_ANNOTATIONS,
        },
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location (-90 to 90)',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location (-180 to 180)',
              minimum: -180,
              maximum: 180,
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'get_current_weather',
        description:
          `Get current weather conditions (the nearest forecast time step) for a location: temperature, wind, ` +
          `humidity, precipitation, and a human-readable weather description. Use this for a quick "what's the ` +
          `weather like right now" snapshot; use get_hourly_forecast for future hours, get_daily_summary or ` +
          `get_forecast for a multi-day outlook. Temperature in °C, wind speed in m/s, pressure in hPa, ` +
          `precipitation in mm, humidity/cloud cover/probabilities in %. ${ERROR_NOTE} ${COVERAGE_NOTE}`,
        annotations: {
          title: 'Get Current Weather',
          ...READONLY_ANNOTATIONS,
        },
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location (-90 to 90)',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location (-180 to 180)',
              minimum: -180,
              maximum: 180,
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'get_hourly_forecast',
        description:
          `Get an hour-by-hour weather forecast for the next 1-48 hours (default 24): temperature, wind, ` +
          `precipitation, and conditions per hour. Use this to answer questions like "will it rain in the next ` +
          `few hours"; use get_current_weather for a single now-reading, get_daily_summary for a multi-day ` +
          `high/low overview, or get_forecast for the complete raw dataset. Temperature in °C, wind speed in m/s, ` +
          `precipitation in mm, probabilities in %. ${ERROR_NOTE} ${COVERAGE_NOTE}`,
        annotations: {
          title: 'Get Hourly Forecast',
          ...READONLY_ANNOTATIONS,
        },
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location (-90 to 90)',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location (-180 to 180)',
              minimum: -180,
              maximum: 180,
            },
            hours: {
              type: 'number',
              description: 'Number of hours to forecast (1-48, default 24)',
              minimum: 1,
              maximum: 48,
              default: 24,
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'get_daily_summary',
        description:
          `Get a daily weather summary for the next 1-10 days (default 7): high/low temperature, dominant weather ` +
          `condition, precipitation total, and max wind speed per day. Use this for a multi-day outlook at a ` +
          `glance; use get_hourly_forecast or get_forecast when you need hour-level detail instead. Temperature in ` +
          `°C, wind speed in m/s, precipitation in mm. ${ERROR_NOTE} ${COVERAGE_NOTE}`,
        annotations: {
          title: 'Get Daily Weather Summary',
          ...READONLY_ANNOTATIONS,
        },
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location (-90 to 90)',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location (-180 to 180)',
              minimum: -180,
              maximum: 180,
            },
            days: {
              type: 'number',
              description: 'Number of days to summarize (1-10, default 7)',
              minimum: 1,
              maximum: 10,
              default: 7,
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'get_fire_risk',
        description:
          `Get a wildfire/forest fire risk forecast for a location, based on the Canadian Fire Weather Index (FWI) ` +
          `system as run by SMHI and calibrated for Swedish forest and grass fuels. Use this instead of the ` +
          `general forecast tools when the question is specifically about fire danger. Returns a fire risk class ` +
          `(1-6) plus the underlying FWI/ISI/BUI/FFMC/DMC/DC indices (unitless index values, not raw weather ` +
          `readings), grass fire risk class, and forest dryness class (daily period only). Also includes ` +
          `temperature (°C), wind speed (m/s), humidity (%), and multi-day precipitation sums (mm). ${ERROR_NOTE} ${COVERAGE_NOTE}`,
        annotations: {
          title: 'Get Wildfire Risk Forecast',
          ...READONLY_ANNOTATIONS,
        },
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location (-90 to 90)',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location (-180 to 180)',
              minimum: -180,
              maximum: 180,
            },
            period: {
              type: 'string',
              enum: ['daily', 'hourly'],
              description: 'Forecast granularity: "daily" for ~6 days ahead (afternoon fire risk), "hourly" for the next 48 hours',
              default: 'daily',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'get_radar_image',
        description:
          'Get the latest Swedish precipitation radar composite (mosaic of all Swedish radar stations), updated ' +
          'roughly every 5 minutes. Unlike the forecast tools, this shows observed precipitation happening right ' +
          'now, not a prediction — use the forecast tools instead if the question is about future weather. Takes ' +
          'no parameters. Returns a PNG image plus its area, product name, and validTime/updated timestamps. ' +
          'Returns an error result (isError: true) if the SMHI radar API is unreachable. Coverage: Sweden only.',
        annotations: {
          title: 'Get Precipitation Radar Image',
          ...READONLY_ANNOTATIONS,
        },
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_weather_warnings',
        description:
          'Get currently active official SMHI weather warnings/alerts for Sweden (impact-based warnings for ' +
          'wind, rain, snow, thunder, high temperatures, flooding, fire risk, and more). Not coordinate-based — ' +
          'returns all active warnings, each tagged with the county/area it affects, so filter by county name ' +
          'and/or minimum severity to narrow results. Severity levels from most to least severe: RED > ORANGE > ' +
          'YELLOW > MESSAGE. Use this for "is there a storm warning" type questions; use the forecast tools for ' +
          'general future conditions and get_fire_risk for the underlying fire danger index. Returns an error ' +
          'result (isError: true) if the SMHI warnings API is unreachable. Coverage: Sweden only.',
        annotations: {
          title: 'Get Active Weather Warnings',
          ...READONLY_ANNOTATIONS,
        },
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              enum: ['sv', 'en'],
              description: 'Language for warning text: "en" (English) or "sv" (Swedish)',
              default: 'en',
            },
            minSeverity: {
              type: 'string',
              enum: ['RED', 'ORANGE', 'YELLOW', 'MESSAGE'],
              description:
                'Only return warnings at or above this severity (RED > ORANGE > YELLOW > MESSAGE). Omit to return all active warnings.',
            },
            county: {
              type: 'string',
              description:
                'Only return warnings affecting this county or area (case-insensitive substring match), e.g. "Stockholm" or "Gotland"',
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_forecast': {
        const input = getForecastSchema.parse(args);
        const result = await getForecast(input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_current_weather': {
        const input = getCurrentWeatherSchema.parse(args);
        const result = await getCurrentWeatherTool(input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_hourly_forecast': {
        const input = getHourlyForecastSchema.parse(args);
        const result = await getHourlyForecastTool(input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_daily_summary': {
        const input = getDailySummarySchema.parse(args);
        const result = await getDailySummaryTool(input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_fire_risk': {
        const input = getFireRiskSchema.parse(args);
        const result = await getFireRiskTool(input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_radar_image': {
        const input = getRadarImageSchema.parse(args ?? {});
        const result = await getRadarImageTool(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { area: result.area, product: result.product, validTime: result.validTime, updated: result.updated },
                null,
                2
              ),
            },
            { type: 'image', data: result.imageBase64, mimeType: result.mimeType },
          ],
        };
      }

      case 'get_weather_warnings': {
        const input = getWeatherWarningsSchema.parse(args ?? {});
        const result = await getWeatherWarningsTool(input);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message =
      error instanceof SMHIClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error';

    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SMHI MCP server running on stdio');
}

main().catch(console.error);
