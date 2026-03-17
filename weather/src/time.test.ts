import { describe, expect, it } from 'vitest'
import { formatLocationTime } from './time'

describe('formatLocationTime', () => {
  it('formats the live clock using the provided timezone', () => {
    const timestamp = Date.UTC(2026, 2, 17, 0, 5, 9)

    expect(formatLocationTime(timestamp, 'Asia/Manila')).toBe('8:05:09 AM')
  })
})
