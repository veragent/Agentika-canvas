/**
 * agentika-canvas: Procedural Robotic Cutaway 3D Model
 * Inspired by Nyxera0x/cutaway (wasp, piranha, tarantula mechanisms).
 * Procedurally generates a robotic machine composed of:
 * - Chassis backbone & central battery core (CORE)
 * - Articulated optic sensor turret & lenses (OPTICS)
 * - Interlocking gearboxes & drive pistons (MECHANISM)
 * - Actuator joints & micro-servos (SERVO)
 * - Aerodynamic protective clamshell panels (SHELL)
 *
 * Exposes pure .pose(state) contract with smooth exploded disassembly.
 */

import * as THREE from 'three';
import { CutawayPartDef, CutawayPoseState, CutawayTelemetry } from './types';
import { CutawayMaterialFactory, CutawayPalette, CUTAWAY_DEFAULT_PALETTE } from '../../effects/CutawayMaterials';

export class ProceduralRobotModel {
  public readonly rootGroup: THREE.Group = new THREE.Group();
  public readonly parts: Map<string, { group: THREE.Group; def: CutawayPartDef; initialPos: THREE.Vector3 }> = new Map();
  private materials: ReturnType<typeof CutawayMaterialFactory.createKitMaterials>;

  constructor(pal: CutawayPalette = CUTAWAY_DEFAULT_PALETTE) {
    this.materials = CutawayMaterialFactory.createKitMaterials(pal);
    this.buildRobot();
  }

  private registerPart(def: CutawayPartDef, group: THREE.Group) {
    this.parts.set(def.id, {
      group,
      def,
      initialPos: group.position.clone(),
    });
    this.rootGroup.add(group);
  }

  private buildRobot() {
    // 1. CORE / CHASSIS: Internal titanium frame & glowing reactor core
    const coreGroup = new THREE.Group();
    const frameGeo = new THREE.CylinderGeometry(0.38, 0.45, 1.6, 12);
    const frameMesh = new THREE.Mesh(frameGeo, this.materials.graphite);
    frameMesh.rotation.z = Math.PI / 2;
    coreGroup.add(frameMesh);

    // Glowing core reactor rings
    for (let i = -2; i <= 2; i++) {
      const ringGeo = new THREE.TorusGeometry(0.48, 0.04, 12, 24);
      const ringMesh = new THREE.Mesh(ringGeo, this.materials.emissiveCoil);
      ringMesh.position.x = i * 0.28;
      ringMesh.rotation.y = Math.PI / 2;
      coreGroup.add(ringMesh);
    }
    this.registerPart(
      {
        id: 'part-core',
        name: 'Quantum Kinetic Reactor',
        slot: 'CORE',
        description: 'Magnetic containment core driving all micro-actuators',
        explodeDirection: new THREE.Vector3(0, -0.2, 0),
        explodeDistance: 0.4,
      },
      coreGroup
    );

    // 2. OPTICS: Front sensor turret, multi-spectrum camera & primary lens
    const opticsGroup = new THREE.Group();
    opticsGroup.position.set(1.1, 0.2, 0);

    const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.35, 16), this.materials.black);
    turretBase.rotation.z = Math.PI / 2;
    opticsGroup.add(turretBase);

    const lensHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.3, 24), this.materials.accent);
    lensHousing.position.x = 0.22;
    lensHousing.rotation.z = Math.PI / 2;
    opticsGroup.add(lensHousing);

    const mainLens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), this.materials.lens);
    mainLens.position.x = 0.35;
    mainLens.rotation.z = -Math.PI / 2;
    opticsGroup.add(mainLens);

    this.registerPart(
      {
        id: 'part-optics',
        name: 'Hyper-Spectral Optic Turret',
        slot: 'OPTICS',
        description: '60fps LiDAR array and telephoto sensor head',
        explodeDirection: new THREE.Vector3(1.0, 0.4, 0),
        explodeDistance: 1.4,
      },
      opticsGroup
    );

    // 3. MECHANISM: Planetary gearboxes & transmission rods (Dual Left / Right)
    const mechLeft = new THREE.Group();
    mechLeft.position.set(0, 0.3, 0.45);
    for (let g = 0; g < 3; g++) {
      const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.24 - g * 0.05, 0.24 - g * 0.05, 0.12, 16), this.materials.steel);
      gear.position.x = (g - 1) * 0.38;
      gear.rotation.x = Math.PI / 2;
      mechLeft.add(gear);
    }
    this.registerPart(
      {
        id: 'part-mech-left',
        name: 'Port Planetary Transmission',
        slot: 'MECHANISM',
        description: 'Precision gear reduction train for port drive train',
        explodeDirection: new THREE.Vector3(0.1, 0.5, 1.2),
        explodeDistance: 1.2,
      },
      mechLeft
    );

    const mechRight = new THREE.Group();
    mechRight.position.set(0, 0.3, -0.45);
    for (let g = 0; g < 3; g++) {
      const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.24 - g * 0.05, 0.24 - g * 0.05, 0.12, 16), this.materials.steel);
      gear.position.x = (g - 1) * 0.38;
      gear.rotation.x = Math.PI / 2;
      mechRight.add(gear);
    }
    this.registerPart(
      {
        id: 'part-mech-right',
        name: 'Starboard Planetary Transmission',
        slot: 'MECHANISM',
        description: 'Precision gear reduction train for starboard drive train',
        explodeDirection: new THREE.Vector3(0.1, 0.5, -1.2),
        explodeDistance: 1.2,
      },
      mechRight
    );

    // 4. SHELL: Dorsal & Ventral protective aerodynamic cowl plates
    // Top Dorsal Shell
    const dorsalShell = new THREE.Group();
    dorsalShell.position.set(0, 0.65, 0);
    const dorsalCowl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.95), this.materials.shell);
    dorsalShell.add(dorsalCowl);

    // Glass inspection canopy embedded in dorsal shell
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.5), this.materials.glass);
    canopy.position.y = 0.12;
    dorsalShell.add(canopy);

    this.registerPart(
      {
        id: 'part-shell-dorsal',
        name: 'Dorsal Composite Clamshell',
        slot: 'SHELL',
        description: 'Clearcoated polycarbonate outer cowl with inspection port',
        explodeDirection: new THREE.Vector3(0, 1.4, 0),
        explodeDistance: 1.6,
      },
      dorsalShell
    );

    // Ventral Lower Shell
    const ventralShell = new THREE.Group();
    ventralShell.position.set(0, -0.55, 0);
    const ventralCowl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.85), this.materials.shell);
    ventralShell.add(ventralCowl);
    this.registerPart(
      {
        id: 'part-shell-ventral',
        name: 'Ventral Armored Belly Plate',
        slot: 'SHELL',
        description: 'Impact-resistant reinforced keel panel',
        explodeDirection: new THREE.Vector3(0, -1.3, 0),
        explodeDistance: 1.3,
      },
      ventralShell
    );

    // 5. SERVOS: Dual aft thruster / stabilizer servos
    const servoAft = new THREE.Group();
    servoAft.position.set(-1.1, 0, 0);
    const servoHousing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.55), this.materials.black);
    servoAft.add(servoHousing);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.4, 16), this.materials.accent);
    nozzle.position.x = -0.35;
    nozzle.rotation.z = Math.PI / 2;
    servoAft.add(nozzle);

    this.registerPart(
      {
        id: 'part-servo-aft',
        name: 'Aft Vectoring Servo Gimbal',
        slot: 'SERVO',
        description: 'High-torque brushless vectoring actuator',
        explodeDirection: new THREE.Vector3(-1.4, 0, 0),
        explodeDistance: 1.5,
      },
      servoAft
    );
  }

  /**
   * Applies exploded view state and animation parameters cleanly
   */
  public pose(state: CutawayPoseState): CutawayTelemetry {
    // 1. Root orientation
    this.rootGroup.rotation.x = state.rotation.x;
    this.rootGroup.rotation.y = state.rotation.y;
    this.rootGroup.rotation.z = state.rotation.z;

    // 2. Glow coil pulsing
    this.materials.emissiveCoil.emissiveIntensity = 1.5 + state.glowIntensity * 1.5;

    // 3. Explode displacements per part
    let maxExplodedPart = 'Chassis Base';
    let maxDistance = -1;

    for (const [, part] of this.parts.entries()) {
      const slotFactor = state.slotFactors?.[part.def.slot] ?? state.explodeFactor;
      const factor = Math.max(0, Math.min(1, slotFactor));

      const displacement = part.def.explodeDirection.clone().normalize().multiplyScalar(part.def.explodeDistance * factor);
      part.group.position.copy(part.initialPos).add(displacement);

      if (factor > maxDistance) {
        maxDistance = factor;
        maxExplodedPart = part.def.name;
      }
    }

    const explodePercent = Math.round(state.explodeFactor * 100);
    let diagnosticsStatus: CutawayTelemetry['diagnosticsStatus'] = 'NOMINAL';
    if (explodePercent > 75) diagnosticsStatus = 'EXPLODED';
    else if (explodePercent > 20) diagnosticsStatus = 'DISASSEMBLING';

    return {
      activePartName: state.activeSlot ? `Slot: ${state.activeSlot}` : maxExplodedPart,
      partCount: this.parts.size,
      explodePercent,
      coreTempCelsius: Math.round(38.5 + (1.0 - state.explodeFactor) * 24.2),
      servoTorqueNm: Number((4.2 + (1.0 - state.explodeFactor) * 12.8).toFixed(1)),
      diagnosticsStatus,
    };
  }
}
