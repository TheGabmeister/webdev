export type SceneType = 'hero' | 'thesis' | 'takeover' | 'proof' | 'systems' | 'cta'

export interface StatCard {
  label: string
  value: string
  note: string
}

export interface DetailCard {
  title: string
  body: string
  meta: string
}

export interface CtaActions {
  primary: string
  secondary: string
}

export interface SectionConfig {
  id: string
  label: string
  eyebrow: string
  title: string
  body: string
  scene: SceneType
  heightVh: number
  accent: string
  chips?: string[]
  stats?: StatCard[]
  details?: DetailCard[]
  cta?: CtaActions
}

export interface SectionMetric {
  start: number
  end: number
  height: number
  progress: number
  viewportProgress: number
  visibility: number
  distance: number
  active: boolean
}

export interface PointerState {
  x: number
  y: number
  active: boolean
}
