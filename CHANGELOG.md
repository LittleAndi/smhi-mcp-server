# Changelog

## [1.2.0](https://github.com/LittleAndi/smhi-mcp-server/compare/v1.1.0...v1.2.0) (2026-08-08)


### Features

* add get_weather_warnings tool for active SMHI alerts ([#7](https://github.com/LittleAndi/smhi-mcp-server/issues/7)) ([9e76b3d](https://github.com/LittleAndi/smhi-mcp-server/commit/9e76b3d1ebc362f96471bb705920e13fdebb202f))

## [1.1.0](https://github.com/LittleAndi/smhi-mcp-server/compare/v1.0.0...v1.1.0) (2026-08-08)


### Features

* add get_weather_warnings tool for active SMHI alerts ([#7](https://github.com/LittleAndi/smhi-mcp-server/issues/7)) ([9e76b3d](https://github.com/LittleAndi/smhi-mcp-server/commit/9e76b3d1ebc362f96471bb705920e13fdebb202f))

## [1.0.0](https://github.com/LittleAndi/smhi-mcp-server/releases/tag/v1.0.0) (2026-08-08)

### Features

- `get_forecast` - full ~10-day forecast via SMHI's `snow1g` point-forecast API
- `get_current_weather`, `get_hourly_forecast`, `get_daily_summary` - processed forecast views
- `get_fire_risk` - wildfire/forest fire risk forecast via SMHI's `fwif1g` API
- `get_radar_image` - latest Swedish precipitation radar composite

From here on, releases are generated automatically by [release-please](https://github.com/googleapis/release-please) from [Conventional Commits](https://www.conventionalcommits.org/) on `main`.
