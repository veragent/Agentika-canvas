/**
 * agentika-canvas: Canonical SceneBundle contract
 *
 * A SceneBundle is the single, authoritative shape returned by every scene
 * factory (Studio default scene, pack scenes, CLI-generated scenes).
 * Declared once here so generated/pack scene code stops duplicating the
 * interface locally.
 */

import { CanvasVideoEngine } from './Engine';
import { SceneGraph } from './SceneGraph';
import { Camera } from './Camera';

export interface SceneBundle {
  engine: CanvasVideoEngine;
  sceneGraph: SceneGraph;
  camera: Camera;
  totalFrames: number;
}
