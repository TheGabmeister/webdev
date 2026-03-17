import { describe, expect, it } from 'vitest'
import { deriveWeatherTheme } from './weather'

describe('deriveWeatherTheme', () => {
  it('maps clear daytime weather to sunny', () => {
    expect(deriveWeatherTheme(0, true)).toBe('sunny')
  })

  it('maps clear nighttime weather to night', () => {
    expect(deriveWeatherTheme(0, false)).toBe('night')
  })

  it('maps rain and storms to rainy', () => {
    expect(deriveWeatherTheme(63, true)).toBe('rainy')
    expect(deriveWeatherTheme(95, true)).toBe('rainy')
  })

  it('maps cloudy codes to cloudy', () => {
    expect(deriveWeatherTheme(3, true)).toBe('cloudy')
  })

  it('maps fog codes to foggy', () => {
    expect(deriveWeatherTheme(45, true)).toBe('foggy')
  })

  it('maps snow codes to snowy', () => {
    expect(deriveWeatherTheme(75, true)).toBe('snowy')
  })
})
