import { sceneDefinitions, sceneIds } from '../data/scenes'
import type { SceneDefinition, SceneId } from '../types/scenes'

const sceneMap = Object.fromEntries(
  sceneDefinitions.map((scene) => [scene.id, scene]),
) as Record<SceneId, SceneDefinition>

export function useSceneRegistry() {
  return {
    scenes: sceneDefinitions,
    sceneIds,
    sceneMap,
  }
}
