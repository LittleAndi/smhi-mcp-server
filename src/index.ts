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
} from './tools/index.js';
import { SMHIClientError } from './smhi-client.js';

const COVERAGE_NOTE =
  'Coverage: Sweden, Norway, Finland, Denmark, Estonia, and parts of Latvia/Lithuania.';

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
          `Get the full ~10-day weather forecast for a location. Returns all time series data with detailed parameters. ${COVERAGE_NOTE}`,
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
          `Get current weather conditions for a location. Returns temperature, wind, humidity, precipitation, and weather description. ${COVERAGE_NOTE}`,
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
          `Get hourly weather forecast for the next 1-48 hours. Returns temperature, wind, precipitation, and conditions for each hour. ${COVERAGE_NOTE}`,
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
          `Get daily weather summary for the next 1-10 days. Returns high/low temperatures, dominant weather conditions, and precipitation totals. ${COVERAGE_NOTE}`,
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
          `Get wildfire/forest fire risk forecast (Canadian FWI system) for a location. Returns fire risk class, ` +
          `underlying fire-behavior indices (FWI, ISI, BUI, FFMC, DMC, DC), grass fire risk, and forest dryness. ` +
          `Calibrated for Swedish forest and grass fuels. ${COVERAGE_NOTE}`,
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
          'now, not a prediction. Returns the image along with its valid time. Coverage: Sweden only.',
        inputSchema: {
          type: 'object',
          properties: {},
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
