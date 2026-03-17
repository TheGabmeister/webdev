export type WeatherTheme =
  | 'sunny'
  | 'rainy'
  | 'cloudy'
  | 'foggy'
  | 'snowy'
  | 'night'

export type LocationSource = 'geolocation' | 'fallback'

export type LocationState = {
  latitude: number
  longitude: number
  label: string
  source: LocationSource
  timezone?: string
}

export type WeatherSnapshot = {
  temperature: number
  weatherCode: number
  label: string
  isDay: boolean
  theme: WeatherTheme
  fetchedAt: number
}

type ForecastApiResponse = {
  timezone?: string
  current?: {
    temperature_2m?: number
    weather_code?: number
    is_day?: number
  }
}

export const DEFAULT_TIMEZONE = 'Asia/Manila'

export const FALLBACK_LOCATION: LocationState = {
  latitude: 14.5995,
  longitude: 120.9842,
  label: 'Manila, Philippines',
  source: 'fallback',
  timezone: DEFAULT_TIMEZONE,
}

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

export async function resolvePreferredLocation(
  timeoutMs = 5000,
): Promise<LocationState> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return { ...FALLBACK_LOCATION }
  }

  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: timeoutMs,
      maximumAge: 10 * 60 * 1000,
    })

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      label: 'Your location',
      source: 'geolocation',
    }
  } catch {
    return { ...FALLBACK_LOCATION }
  }
}

export function deriveWeatherTheme(
  weatherCode: number,
  isDay: boolean,
): WeatherTheme {
  if (weatherCode === 0 && !isDay) {
    return 'night'
  }

  if (weatherCode === 0 && isDay) {
    return 'sunny'
  }

  if (weatherCode === 1) {
    return isDay ? 'sunny' : 'night'
  }

  if ([45, 48].includes(weatherCode)) {
    return 'foggy'
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return 'snowy'
  }

  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
      weatherCode,
    )
  ) {
    return 'rainy'
  }

  return 'cloudy'
}

export function describeWeatherCode(weatherCode: number): string {
  const labels: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    56: 'Freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Heavy freezing rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Rain showers',
    81: 'Heavy showers',
    82: 'Violent showers',
    85: 'Snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Severe thunderstorm',
  }

  return labels[weatherCode] ?? 'Changing conditions'
}

function isValidResponse(
  data: ForecastApiResponse,
): data is {
  timezone: string
  current: {
    temperature_2m: number
    weather_code: number
    is_day: number
  }
} {
  return (
    typeof data.timezone === 'string' &&
    data.current !== undefined &&
    typeof data.current.temperature_2m === 'number' &&
    typeof data.current.weather_code === 'number' &&
    typeof data.current.is_day === 'number'
  )
}

export async function fetchWeatherSnapshot(location: LocationState): Promise<{
  timezone: string
  snapshot: WeatherSnapshot
}> {
  const query = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    current: 'temperature_2m,weather_code,is_day',
    timezone: 'auto',
    temperature_unit: 'celsius',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`)

  if (!response.ok) {
    throw new Error('The weather service is temporarily unavailable.')
  }

  const data = (await response.json()) as ForecastApiResponse

  if (!isValidResponse(data)) {
    throw new Error('The weather service returned incomplete data.')
  }

  const isDay = data.current.is_day === 1

  return {
    timezone: data.timezone,
    snapshot: {
      temperature: data.current.temperature_2m,
      weatherCode: data.current.weather_code,
      label: describeWeatherCode(data.current.weather_code),
      isDay,
      theme: deriveWeatherTheme(data.current.weather_code, isDay),
      fetchedAt: Date.now(),
    },
  }
}
