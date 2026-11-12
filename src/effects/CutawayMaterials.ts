/**
 * agentika-canvas: Cutaway 3D Studio Lighting & Materials
 * Inspired by cutaway parts.js & stage.js:
 * High-contrast mechanical aesthetic: Gloss white shells, dark graphite chassis,
 * high-transmission glass, orange accents, emissive amber/orange coils, and studio lighting.
 */

import * as THREE from 'three';

export interface CutawayPalette {
  white: string;
  orange: string;
  graphite: string;
  black: string;
  steel: string;
  glass: string;
  glow: string;
}

export const CUTAWAY_DEFAULT_PALETTE: CutawayPalette = {
  white: '#f4f2ee',
  orange: '#ff5a1f',
  graphite: '#2f3238',
  black: '#111214',
  steel: '#cdd1d6',
  glass: '#ffffff',
  glow: '#ffa040',
};

export class CutawayMaterialFactory {
  public static createKitMaterials(pal: CutawayPalette = CUTAWAY_DEFAULT_PALETTE) {
    return {
      // Outer shell: glossy automotive-style white plastic with crisp clearcoat
      shell: new THREE.MeshPhysicalMaterial({
        color: pal.white,
        roughness: 0.32,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      }),

      // Inner shell lining: slightly darker matte finish
      shellInner: new THREE.MeshStandardMaterial({
        color: '#dedad4',
        roughness: 0.65,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),

      // Accent trim: vivid aerospace orange
      accent: new THREE.MeshPhysicalMaterial({
        color: pal.orange,
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      }),

      // Internal mechanism: dark gunmetal / graphite
      graphite: new THREE.MeshStandardMaterial({
        color: pal.graphite,
        roughness: 0.35,
        metalness: 0.75,
      }),

      // Machine chassis & screws: deep matte black
      black: new THREE.MeshPhysicalMaterial({
        color: pal.black,
        roughness: 0.28,
        metalness: 0.2,
        clearcoat: 0.7,
        clearcoatRoughness: 0.15,
      }),

      // Precision steel bearings & shafts
      steel: new THREE.MeshStandardMaterial({
        color: pal.steel,
        roughness: 0.18,
        metalness: 0.95,
      }),

      // Lens optics: high refractive index dark dome
      lens: new THREE.MeshPhysicalMaterial({
        color: '#05070a',
        roughness: 0.04,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
      }),

      // Transparent inspection windows: transmission glass
      glass: new THREE.MeshPhysicalMaterial({
        color: pal.glass,
        roughness: 0.05,
        metalness: 0.0,
        transmission: 0.92,
        ior: 1.45,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),

      // Glowing power coils and HUD telemetry elements
      emissiveCoil: new THREE.MeshStandardMaterial({
        color: '#1a0d00',
        emissive: pal.glow,
        emissiveIntensity: 2.8,
        roughness: 0.2,
      }),
    };
  }

  /**
   * Sets up 3-point studio softbox lighting for clean high-contrast product cutaways
   */
  public static setupStudioLighting(scene: THREE.Scene): {
    keyLight: THREE.DirectionalLight;
    fillLight: THREE.DirectionalLight;
    rimLight: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
  } {
    const ambient = new THREE.AmbientLight('#f8f9fa', 0.85);
    scene.add(ambient);

    // Key softbox from top-front-right
    const keyLight = new THREE.DirectionalLight('#ffffff', 1.8);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    // Soft fill from left
    const fillLight = new THREE.DirectionalLight('#c8d3e0', 0.9);
    fillLight.position.set(-5, 2, 3);
    scene.add(fillLight);

    // Crisp rim backlight to outline separated mechanisms
    const rimLight = new THREE.DirectionalLight('#ff9944', 1.2);
    rimLight.position.set(2, 4, -6);
    scene.add(rimLight);

    return { keyLight, fillLight, rimLight, ambient };
  }
}
