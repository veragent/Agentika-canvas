/**
 * agentika-canvas: Cutaway Checklist Verification Engine
 * Implements Nyxera0x/cutaway checklist methodology (docs/CHECKLIST.md):
 * Evaluates visual mechanical criteria (Dark mechanism ratio >= 0.8, part density,
 * proportion tolerances, multi-camera transitions) before allowing video export.
 */

export interface CutawayCheckItem {
  id: string;
  category: 'proportions' | 'materials' | 'mechanism' | 'cinematography';
  description: string;
  expectedShareOrValue: string;
  status: 'passed' | 'partial' | 'failed';
  feedback: string;
}

export interface CutawayVerificationReport {
  timestamp: string;
  totalChecks: number;
  passedChecks: number;
  readinessScorePercent: number;
  approvedForFilming: boolean;
  checks: CutawayCheckItem[];
  recommendations: string[];
}

export class CutawayVerifier {
  /**
   * Evaluates procedural 3D model and animation parameters against Cutaway doctrine
   */
  public static verifyModel(options: {
    darkMechanismRatio: number; // must be >= 0.8 according to cutaway rule #3
    distinctPartCount: number;  // must have >= 5 separately disassembling modules
    hasIndividualCameras: boolean; // each beat has dedicated camera
    clamshellPanelGaps: boolean; // plates broken into curved shells with visible gaps
  }): CutawayVerificationReport {
    const checks: CutawayCheckItem[] = [
      {
        id: 'chk-dark-density',
        category: 'materials',
        description: 'Dark mechanism density ratio (graphite/chassis vs white shell)',
        expectedShareOrValue: '>= 0.80',
        status: options.darkMechanismRatio >= 0.8 ? 'passed' : options.darkMechanismRatio >= 0.65 ? 'partial' : 'failed',
        feedback: options.darkMechanismRatio >= 0.8
          ? 'Passed: Dense mechanical core matches reference contrast'
          : 'Warning: Core appears too white/flat. Increase exposed graphite mechanisms',
      },
      {
        id: 'chk-part-breakdown',
        category: 'mechanism',
        description: 'Independent disassembling part groups with named anchors',
        expectedShareOrValue: '>= 5 modular parts',
        status: options.distinctPartCount >= 5 ? 'passed' : 'failed',
        feedback: `Found ${options.distinctPartCount} articulated part groups`,
      },
      {
        id: 'chk-shell-segmentation',
        category: 'proportions',
        description: 'Curved shell plates with visible gap revealing internal gears',
        expectedShareOrValue: 'Non-monolithic segmented panels',
        status: options.clamshellPanelGaps ? 'passed' : 'failed',
        feedback: options.clamshellPanelGaps
          ? 'Segmented clamshell cowls prevent monolithic toy look'
          : 'Failed: Smooth monolithic shell reads as a toy',
      },
      {
        id: 'chk-cinematography',
        category: 'cinematography',
        description: 'Beat-synced dynamic camera pushing into active exploded components',
        expectedShareOrValue: 'Dynamic camera azimuth/elevation orbit',
        status: options.hasIndividualCameras ? 'passed' : 'failed',
        feedback: options.hasIndividualCameras
          ? 'Dedicated angle & elevation per action sequence'
          : 'Warning: Camera is static or parked during action beats',
      },
    ];

    const passedCount = checks.filter((c) => c.status === 'passed').length;
    const score = Math.round((passedCount / checks.length) * 100);
    const approved = score >= 75 && checks[0].status !== 'failed';

    const recommendations: string[] = [];
    if (!approved) {
      recommendations.push('Refine shell plate cuts to expose internal quantum reactor and gearboxes');
    }
    if (options.darkMechanismRatio < 0.8) {
      recommendations.push('Add darker graphite and steel textures to internal drive rods');
    }

    return {
      timestamp: new Date().toISOString(),
      totalChecks: checks.length,
      passedChecks: passedCount,
      readinessScorePercent: score,
      approvedForFilming: approved,
      checks,
      recommendations,
    };
  }
}
