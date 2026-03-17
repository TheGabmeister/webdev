import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { WeatherScene } from './components/WeatherScene'
import { formatLocationDate, formatLocationTime, formatRefreshTime } from './time'
import {
  DEFAULT_TIMEZONE,
  FALLBACK_LOCATION,
  fetchWeatherSnapshot,
  resolvePreferredLocation,
  type LocationState,
  type WeatherSnapshot,
  type WeatherTheme,
} from './weather'
import './App.css'

type LoadStatus = 'loading' | 'ready' | 'error'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

const themeNarration: Record<WeatherTheme, string> = {
  sunny: 'Bright daylight with warm color and clear visibility.',
  rainy: 'Rain bands are passing through with darker cloud cover.',
  cloudy: 'Soft cloud cover is muting the light across the skyline.',
  foggy: 'Dense haze is hanging low and flattening the horizon.',
  snowy: 'Snow is drifting through the air with a colder glow.',
  night: 'The sky is calm, dark, and lit by the evening atmosphere.',
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  return 'Unable to load the weather right now.'
}

function App() {
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [location, setLocation] = useState<LocationState | null>(null)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const requestIdRef = useRef(0)

  const activeTheme = weather?.theme ?? 'cloudy'
  const activeTimezone = location?.timezone ?? DEFAULT_TIMEZONE
  const formattedTime = formatLocationTime(nowMs, activeTimezone)
  const formattedDate = formatLocationDate(nowMs, activeTimezone)
  const updatedAt = weather ? formatRefreshTime(weather.fetchedAt, activeTimezone) : null

  const runWeatherLoad = async (resolveLocation: boolean) => {
    const requestId = ++requestIdRef.current
    const hasSnapshot = weather !== null

    if (hasSnapshot) {
      setIsRefreshing(true)
    } else {
      setStatus('loading')
    }

    setErrorMessage(null)

    let targetLocation = location

    if (resolveLocation || targetLocation === null) {
      targetLocation = await resolvePreferredLocation()

      if (requestId !== requestIdRef.current) {
        return
      }
    }

    if (targetLocation === null) {
      targetLocation = { ...FALLBACK_LOCATION }
    }

    try {
      const weatherResult = await fetchWeatherSnapshot(targetLocation)

      if (requestId !== requestIdRef.current) {
        return
      }

      setLocation({
        ...targetLocation,
        timezone: weatherResult.timezone,
      })
      setWeather(weatherResult.snapshot)
      setStatus('ready')
    } catch (primaryError) {
      if (targetLocation.source === 'geolocation') {
        try {
          const fallbackResult = await fetchWeatherSnapshot(FALLBACK_LOCATION)

          if (requestId !== requestIdRef.current) {
            return
          }

          setLocation({
            ...FALLBACK_LOCATION,
            timezone: fallbackResult.timezone,
          })
          setWeather(fallbackResult.snapshot)
          setStatus('ready')
          setErrorMessage('Your local weather was unavailable, so Manila is shown instead.')
        } catch (fallbackError) {
          if (requestId !== requestIdRef.current) {
            return
          }

          if (weather !== null) {
            setStatus('ready')
            setErrorMessage(
              `${getErrorMessage(fallbackError)} Showing the latest successful weather.`,
            )
          } else {
            setStatus('error')
            setErrorMessage(getErrorMessage(fallbackError))
          }
        }
      } else if (requestId === requestIdRef.current) {
        if (weather !== null) {
          setStatus('ready')
          setErrorMessage(
            `${getErrorMessage(primaryError)} Showing the latest successful weather.`,
          )
        } else {
          setStatus('error')
          setErrorMessage(getErrorMessage(primaryError))
        }
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsRefreshing(false)
      }
    }
  }

  const loadWeather = useEffectEvent(runWeatherLoad)

  useEffect(() => {
    void loadWeather(true)
  }, [])

  useEffect(() => {
    const tickId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(tickId)
    }
  }, [])

  useEffect(() => {
    const refreshId = window.setInterval(() => {
      void loadWeather(false)
    }, REFRESH_INTERVAL_MS)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadWeather(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      requestIdRef.current += 1
      window.clearInterval(refreshId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const handleRefresh = () => {
    void runWeatherLoad(location === null)
  }

  const sourceLabel =
    location?.source === 'geolocation' ? 'Browser geolocation' : 'Fallback city'
  const locationSummary =
    location === null
      ? 'Checking browser location, then falling back to Manila if needed.'
      : location.source === 'geolocation'
        ? 'Live weather for your current coordinates.'
        : 'Using the built-in Manila fallback when local access is unavailable.'

  return (
    <div className={`app theme--${activeTheme}`}>
      <div className="app-noise" aria-hidden="true" />
      <WeatherScene theme={activeTheme} />

      <main className="shell">
        <section className="weather-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Weather Atmosphere</p>
              <p className="deck">{locationSummary}</p>
            </div>
            <button
              className="refresh-button"
              type="button"
              onClick={handleRefresh}
              disabled={status === 'loading' || isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {status === 'loading' && weather === null ? (
            <div className="state-panel">
              <p className="status-chip">Preparing your forecast</p>
              <h1 className="state-title">Locating the weather scene...</h1>
              <p className="state-copy">
                The app checks browser geolocation first and falls back to Manila
                when permission is denied or unavailable.
              </p>
            </div>
          ) : null}

          {status === 'error' && weather === null ? (
            <div className="state-panel state-panel--error">
              <p className="status-chip">Weather unavailable</p>
              <h1 className="state-title">The live forecast could not be loaded.</h1>
              <p className="state-copy">
                {errorMessage ?? 'Try again in a moment.'}
              </p>
              <button className="retry-button" type="button" onClick={handleRefresh}>
                Try again
              </button>
            </div>
          ) : null}

          {weather !== null ? (
            <>
              <div className="clock-block">
                <p className="date-pill">{formattedDate}</p>
                <h1 className="time-display">{formattedTime}</h1>
              </div>

              <div className="conditions-row">
                <p className="temperature-display">
                  {Math.round(weather.temperature)}
                  <span>&deg;C</span>
                </p>

                <div className="condition-copy">
                  <p className="condition-name">{weather.label}</p>
                  <p className="condition-detail">
                    {themeNarration[weather.theme]}
                  </p>
                </div>
              </div>

              <div className="meta-grid">
                <div className="meta-card">
                  <span className="meta-label">Location</span>
                  <strong>{location?.label ?? FALLBACK_LOCATION.label}</strong>
                </div>
                <div className="meta-card">
                  <span className="meta-label">Source</span>
                  <strong>{sourceLabel}</strong>
                </div>
                <div className="meta-card">
                  <span className="meta-label">Updated</span>
                  <strong>{updatedAt ?? 'Just now'}</strong>
                </div>
              </div>

              {errorMessage !== null ? (
                <p className="inline-alert" role="status">
                  {errorMessage}
                </p>
              ) : null}
            </>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default App
