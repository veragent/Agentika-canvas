/**
 * agentika-canvas: Deterministic Timeline & Interpolation Engine
 * Eliminates setTimeout / real-time clock drift. Every animation property is a
 * pure mathematical function of frame number (i) and fps.
 */

export type EasingFunction = (t: number) => number;

export interface Point2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface Rect2D extends Point2D, Size2D {}

export const clamp = (val: number, min: number, max: number): number => {
  return Math.min(Math.max(val, min), max);
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

/**
 * Standard Easing Functions for Natural Hand & Motion Curves
 */
export const Easing = {
  linear: (t: number): number => t,

  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => --t * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - --t * t * t * t,
  easeInOutQuart: (t: number): number =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,

  easeInExpo: (t: number): number => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),

  /**
   * Smooth ease-out back for natural UI window bounce
   */
  easeOutBack: (t: number, s = 1.70158): number => {
    return --t * t * ((s + 1) * t + s) + 1;
  },

  easeInOutBack: (t: number, s = 1.70158): number => {
    const k = s * 1.525;
    if ((t *= 2) < 1) return 0.5 * (t * t * ((k + 1) * t - k));
    return 0.5 * ((t -= 2) * t * ((k + 1) * t + k) + 2);
  },

  /**
   * Human curve: Smooth cubic bezier representation for cursor movements
   */
  humanSmooth: (t: number): number => {
    // Hermite smoothstep / S-curve
    return t * t * (3 - 2 * t);
  },
};

/**
 * Primary deterministic interpolation function
 * @param frame Current frame number (0, 1, 2, ...)
 * @param frameRange [startFrame, endFrame]
 * @param valueRange [startValue, endValue]
 * @param easing Easing function (defaults to linear)
 */
export function interpolate(
  frame: number,
  frameRange: [number, number],
  valueRange: [number, number],
  easing: EasingFunction = Easing.linear
): number {
  const [startFrame, endFrame] = frameRange;
  const [startVal, endVal] = valueRange;

  if (startFrame === endFrame) return endVal;
  if (frame <= startFrame) return startVal;
  if (frame >= endFrame) return endVal;

  const rawProgress = (frame - startFrame) / (endFrame - startFrame);
  const easedProgress = easing(clamp(rawProgress, 0, 1));
  return lerp(startVal, endVal, easedProgress);
}

/**
 * Interpolate 2D position (e.g. Mouse cursor coordinates)
 */
export function interpolatePoint(
  frame: number,
  frameRange: [number, number],
  startPoint: Point2D,
  endPoint: Point2D,
  easing: EasingFunction = Easing.humanSmooth
): Point2D {
  const [startFrame, endFrame] = frameRange;
  if (frame <= startFrame) return { ...startPoint };
  if (frame >= endFrame) return { ...endPoint };

  const rawProgress = (frame - startFrame) / (endFrame - startFrame);
  const t = easing(clamp(rawProgress, 0, 1));

  return {
    x: lerp(startPoint.x, endPoint.x, t),
    y: lerp(startPoint.y, endPoint.y, t),
  };
}

/**
 * Helper to compute microsecond timestamp from frame and FPS
 */
export function frameToTimestampUs(frame: number, fps: number): number {
  return Math.round((frame * 1_000_000) / fps);
}

/**
 * Helper to compute frame number from seconds
 */
export function secondsToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}
