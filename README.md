# SMHI MCP Server

MCP server for Swedish Meteorological and Hydrological Institute (SMHI) weather data, built on SMHI's current `snow1g` point-forecast API.

> SMHI retired its older `pmp3g` forecast API on 2026-03-31 in favor of `snow1g`. This project is a fresh implementation against the current API.

## Features

- **get_forecast** - Full ~10-day forecast with all parameters
- **get_current_weather** - Current conditions (temperature, wind, precipitation)
- **get_hourly_forecast** - Next 1-48 hours hourly
- **get_daily_summary** - Daily high/low for up to 10 days
- **get_fire_risk** - Wildfire/forest fire risk forecast (Canadian FWI system)

## Coverage

Sweden, Norway, Finland, Denmark, Estonia, and parts of Latvia/Lithuania.

## Installation

### Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "smhi": {
      "command": "node",
      "args": ["/path/to/smhi-mcp-server/dist/index.js"]
    }
  }
}
```

### Build from source

```bash
npm install
npm run build
```

## Usage Examples

### Get current weather in Stockholm

```
Tool: get_current_weather
Input: { "latitude": 59.3293, "longitude": 18.0686 }
```

### Get weekly forecast for Gothenburg

```
Tool: get_daily_summary
Input: { "latitude": 57.7089, "longitude": 11.9746, "days": 7 }
```

### Check if it will rain in Oslo

```
Tool: get_hourly_forecast
Input: { "latitude": 59.9139, "longitude": 10.7522, "hours": 12 }
```

### Check wildfire risk near Norrköping

```
Tool: get_fire_risk
Input: { "latitude": 58.5877, "longitude": 16.1924, "period": "daily" }
```

## API Reference

### get_forecast

Get complete ~10-day forecast with all SMHI parameters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| latitude | number | Yes | -90 to 90 |
| longitude | number | Yes | -180 to 180 |

### get_current_weather

Get current weather conditions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| latitude | number | Yes | -90 to 90 |
| longitude | number | Yes | -180 to 180 |

Returns: temperature, humidity, wind, pressure, visibility, cloud cover, precipitation, weather description.

### get_hourly_forecast

Get hourly forecast.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| latitude | number | Yes | - | -90 to 90 |
| longitude | number | Yes | - | -180 to 180 |
| hours | number | No | 24 | 1-48 |

### get_daily_summary

Get daily weather summary.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| latitude | number | Yes | - | -90 to 90 |
| longitude | number | Yes | - | -180 to 180 |
| days | number | No | 7 | 1-10 |

Returns: date, high/low temperature, dominant weather, precipitation sum, max wind speed.

### get_fire_risk

Get wildfire/forest fire risk forecast, based on the Canadian Fire Weather Index (FWI) system as run by SMHI (`fwif1g` API). Calibrated for Swedish forest and grass fuels.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| latitude | number | Yes | - | -90 to 90 |
| longitude | number | Yes | - | -180 to 180 |
| period | string | No | daily | `daily` (~6 days ahead, afternoon fire risk) or `hourly` (next 48 hours) |

Returns per time step: fire risk class (1-6) and description, the underlying FWI/ISI/BUI/FFMC/DMC/DC indices, grass fire risk class, forest dryness class (`daily` only), temperature/wind/humidity, and multi-day precipitation sums.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Data Source

Data provided by [SMHI Open Data](https://opendata.smhi.se/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## License

MIT
