export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) {
  const normalized = clamp((value - inMin) / (inMax - inMin))
  return mix(outMin, outMax, normalized)
}
