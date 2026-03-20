export type MotionTier = 'full' | 'lite' | 'calm'

export type SceneId =
  | 'intro'
  | 'reactive-field'
  | 'morph-engine'
  | 'overlay-orbit'
  | 'adaptive-finale'

export interface SceneDefinition {
  id: SceneId
  index: number
  title: string
  theme: string
  summary: string
  kicker: string
  enter: string
  exit: string
  supportsInteraction: boolean
  reducedMotionStrategy: string
  reviewHint: string
  accent: string
}

export interface SceneComponentProps {
  definition: SceneDefinition
  progress: number
  isActive: boolean
  motionTier: MotionTier
  reviewMode: boolean
}
