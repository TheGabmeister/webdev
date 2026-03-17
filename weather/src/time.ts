export function formatLocationTime(
  timestamp: number | Date,
  timezone: string,
): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(date)
}

export function formatLocationDate(
  timestamp: number | Date,
  timezone: string,
): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  }).format(date)
}

export function formatRefreshTime(
  timestamp: number | Date,
  timezone: string,
): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(date)
}
