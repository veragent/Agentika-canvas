/**
 * agentika-canvas: Cutaway 3D Engine Types
 * Integrates Nyxera0x/cutaway principles into agentika-canvas programmatic video pipeline.
 * Clean-room TypeScript adaptation for 100% in-browser Canvas + WebGL rendering.
 */

import * as THREE from 'three';

export type CutawaySlot = 'OPTICS' | 'SHELL' | 'MECHANISM' | 'SERVO' | 'CHASSIS' | 'CORE';

export interface CutawayPartDef {
  id: string;
  name: string;
  slot: CutawaySlot;
  description?: string;
  explodeDirection: THREE.Vector3;
  explodeDistance: number;
  highlightColor?: string;
}

export interface CutawayPoseState {
  /** 0.0 (assembled) -> 1.0 (fully exploded / disassembled) */
  explodeFactor: number;
  /** Individual slot overrides: slot -> 0.0..1.0 */
  slotFactors?: Partial<Record<CutawaySlot, number>>;
  /** Yaw/pitch/roll rotation in radians */
  rotation: { x: number; y: number; z: number };
  /** Pulse / glow intensity (0.0 .. 2.0) for internal LEDs/coils */
  glowIntensity: number;
  /** Active highlighted slot if any */
  activeSlot?: CutawaySlot | null;
}

export interface CutawayTelemetry {
  activePartName: string;
  partCount: number;
  explodePercent: number;
  coreTempCelsius: number;
  servoTorqueNm: number;
  diagnosticsStatus: 'NOMINAL' | 'DISASSEMBLING' | 'MAINTENANCE' | 'EXPLODED';
}

export interface CutawayCameraTrack {
  target: THREE.Vector3;
  distance: number;
  azimuthDeg: number;
  elevationDeg: number;
  fov?: number;
}
