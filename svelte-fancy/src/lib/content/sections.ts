import type { SectionConfig } from '../types'

export const sections: SectionConfig[] = [
  {
    id: 'hero',
    label: 'Opening',
    eyebrow: 'Aurelia Field / launch sequence',
    title: 'Motion with a thermal edge.',
    body:
      'A fictional control surface for products that need atmosphere, pacing, and hard precision in the same frame.',
    scene: 'hero',
    heightVh: 168,
    accent: '#d6b89a',
    chips: ['Single-route SPA', 'Native scroll choreography', 'Svelte + CSS + SVG']
  },
  {
    id: 'thesis',
    label: 'Credibility',
    eyebrow: 'Why it reads as substance',
    title: 'Built like an instrument, not a slogan.',
    body:
      'The narrative stays restrained: sharp copy, system-level evidence, and motion that behaves like architecture instead of decoration.',
    scene: 'thesis',
    heightVh: 138,
    accent: '#b99774',
    stats: [
      {
        label: 'Signal retention',
        value: '94%',
        note: 'Readers stay oriented through every scroll chapter.'
      },
      {
        label: 'Surface latency',
        value: '18ms',
        note: 'Interaction stays close to the pointer without turning soft.'
      },
      {
        label: 'Scene continuity',
        value: '6/6',
        note: 'Each chapter inherits the same motion grammar.'
      }
    ],
    details: [
      {
        title: 'Editorial pacing',
        body: 'Long sections create room for deliberate reveals instead of compressed hero tricks.',
        meta: 'Scroll-led'
      },
      {
        title: 'Shared primitives',
        body: 'Masks, grids, rings, and light bands recur with different weight rather than changing identity.',
        meta: 'Reusable motion'
      }
    ]
  },
  {
    id: 'takeover',
    label: 'Takeover',
    eyebrow: 'Signature page event',
    title: 'The page folds into one controlled field.',
    body:
      'Navigation stays intact while the layout briefly behaves like a single machine. It should feel authored, not trapped in a timeline engine.',
    scene: 'takeover',
    heightVh: 228,
    accent: '#f0d3b6',
    chips: ['Page-wide overlay', 'Sticky scene core', 'Resize-safe recalculation']
  },
  {
    id: 'proof',
    label: 'Proof',
    eyebrow: 'Direct interaction, kept deliberate',
    title: 'Steer the field. Keep the pacing.',
    body:
      'One controlled interaction is enough. The pointer shifts the beam solve and pressure rings without breaking the authored flow.',
    scene: 'proof',
    heightVh: 158,
    accent: '#d4c09f',
    details: [
      {
        title: 'Cursor steering',
        body: 'The beam core tracks the pointer with tight damping and a fixed editorial frame.',
        meta: 'Input'
      },
      {
        title: 'Pressure response',
        body: 'Energy bands widen or compress based on interaction distance to preserve tension.',
        meta: 'Feedback'
      },
      {
        title: 'Story control',
        body: 'The scene remains bounded inside the chapter so navigation and scroll continuity survive.',
        meta: 'Constraint'
      }
    ]
  },
  {
    id: 'systems',
    label: 'Systems',
    eyebrow: 'Structural detail',
    title: 'Everything resolves into a disciplined stack.',
    body:
      'The later chapters shift from spectacle into construction: control layers, response windows, and the compositional grid underneath the drama.',
    scene: 'systems',
    heightVh: 150,
    accent: '#cab098',
    details: [
      {
        title: 'Coordinate shell',
        body: 'Section-local logic stays close to the scene while shared progress remains thin and reusable.',
        meta: 'Architecture'
      },
      {
        title: 'Progress mapping',
        body: 'Scroll inputs are derived from measured geometry, not from hardcoded magic numbers.',
        meta: 'Runtime'
      },
      {
        title: 'Visual hierarchy',
        body: 'Warm metallic neutrals and sharp typography hold the whole page inside one authored identity.',
        meta: 'Design'
      },
      {
        title: 'Failure posture',
        body: 'If a scene loses some drama under resize, continuity and legibility still win.',
        meta: 'Resilience'
      }
    ]
  },
  {
    id: 'cta',
    label: 'Close',
    eyebrow: 'Closing invitation',
    title: 'Inspect the field, then build past it.',
    body:
      'The showcase ends with a clean handoff: revisit the proof, scan the system, or return to the launch frame and read the motion language again.',
    scene: 'cta',
    heightVh: 118,
    accent: '#f6ddc1',
    cta: {
      primary: 'Re-enter proof',
      secondary: 'Back to opening'
    }
  }
]
