# Weather Atmosphere

A single-screen React + TypeScript weather app that uses Open-Meteo for current conditions, tries browser geolocation first, and falls back to Manila when location access is unavailable.

## Features

- Live local clock driven by the active weather timezone
- Current temperature in Celsius
- Human-readable weather condition labels
- Animated weather scenes for sun, rain, clouds, fog, snow, and clear night
- Automatic refresh every 15 minutes and whenever the tab becomes visible again

## Scripts

- `npm install`
- `npm run dev`
- `npm run test`
- `npm run build`

## Data Source

- Forecast API: `https://api.open-meteo.com/v1/forecast`
