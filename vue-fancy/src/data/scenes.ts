import type { SceneDefinition, SceneId } from '../types/scenes'

export const sceneDefinitions: SceneDefinition[] = [
  {
    id: 'intro',
    index: 1,
    title: 'Vue In Motion',
    theme: 'Kinetic editorial introduction',
    summary:
      'A luminous opening that sets the motion language, the progress rail, and the pacing of the exhibit.',
    kicker: 'Scene Zero',
    enter: 'Type locks in, grids wake, the rail finds its rhythm.',
    exit: 'The system narrows into a reactive field you can directly bend.',
    supportsInteraction: false,
    reducedMotionStrategy: 'Shift to calmer fades, shorter parallax, and static diagram emphasis.',
    reviewHint: 'Scroll-driven transforms stay in CSS/WAAPI while the scene state remains reactive.',
    accent: '#7ae7ff',
  },
  {
    id: 'reactive-field',
    index: 2,
    title: 'Reactive Field',
    theme: 'State orchestration under motion',
    summary:
      'A single control surface mutates a compact state model that drives synchronized labels, counters, layout, and SVG/DOM motion.',
    kicker: 'Scene One',
    enter: 'Signal and density uncouple, then realign across the field.',
    exit: 'The field resolves into a cleaner, sharper geometry for SVG work.',
    supportsInteraction: true,
    reducedMotionStrategy: 'Keep the same state response but reduce particle count and remove layered drift.',
    reviewHint: 'Computed values, view state, and visual geometry all derive from the same reactive source.',
    accent: '#6cf5c2',
  },
  {
    id: 'morph-engine',
    index: 3,
    title: 'Morph Engine',
    theme: 'SVG path reveal and derived motion',
    summary:
      'Scroll progress reshapes paths, reveals masked surfaces, and stages precision motion without a third-party timeline runtime.',
    kicker: 'Scene Two',
    enter: 'The field flattens into a waveform and the stroke starts to write itself.',
    exit: 'The line detaches from the plane and becomes layered orbital depth.',
    supportsInteraction: false,
    reducedMotionStrategy: 'Preserve the drawn-line narrative with minimal path drift and a simpler reveal.',
    reviewHint: 'The wave geometry is generated from shared math helpers and scene progress.',
    accent: '#ffd38a',
  },
  {
    id: 'overlay-orbit',
    index: 4,
    title: 'Overlay Orbit',
    theme: 'Layering, teleportation, and focus',
    summary:
      'A scene that proves Vue can coordinate depth, overlays, and focal state without breaking the single-page shell.',
    kicker: 'Scene Three',
    enter: 'Orbit paths open up and one layer breaks away into a live overlay.',
    exit: 'The overlay collapses back into the system before the finale recombines every motif.',
    supportsInteraction: true,
    reducedMotionStrategy: 'Keep the same layered relationship but replace orbit drift with stable positions.',
    reviewHint: 'A teleported overlay mirrors scene state while the main stage keeps native scroll flow.',
    accent: '#fdb0ff',
  },
  {
    id: 'adaptive-finale',
    index: 5,
    title: 'Adaptive Finale',
    theme: 'Capability-aware closure',
    summary:
      'The closing scene reflects the active motion tier, recombines earlier motifs, and closes the exhibit without dropping the narrative thread.',
    kicker: 'Scene Four',
    enter: 'Previous scenes fold into a single adaptive composition.',
    exit: 'The system hands navigation back with every scene still directly addressable.',
    supportsInteraction: true,
    reducedMotionStrategy: 'Present the same summary with quiet scale changes and static ring structure.',
    reviewHint: 'Motion tier, scene routing, and review mode stay observable without polluting the default UI.',
    accent: '#96a8ff',
  },
]

export const sceneIds = sceneDefinitions.map((scene) => scene.id) as SceneId[]
