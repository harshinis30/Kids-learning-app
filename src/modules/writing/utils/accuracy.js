/**
 * accuracy.js — Writing Module · Level 1
 *
 * Modular accuracy computation for path-tracing activities.
 * Completely independent of any feedback or progression logic.
 *
 * @module accuracy
 */

/**
 * Interpolate N evenly-spaced sample points along a polyline
 * defined by `waypoints` (normalized 0–1 coordinates).
 *
 * @param {Array<{x: number, y: number}>} waypoints
 * @param {number} sampleCount
 * @returns {Array<{x: number, y: number}>}
 */
function samplePath(waypoints, sampleCount = 40) {
  if (waypoints.length === 0) return [];
  if (waypoints.length === 1) {
    return Array.from({ length: sampleCount }, () => ({ ...waypoints[0] }));
  }

  // Compute total polyline length
  const segments = [];
  let totalLen = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x;
    const dy = waypoints[i].y - waypoints[i - 1].y;
    const len = Math.hypot(dx, dy);
    segments.push(len);
    totalLen += len;
  }

  const samples = [];
  const step = totalLen / (sampleCount - 1);
  let targetDist = 0;
  let covered = 0;
  let segIdx = 0;

  samples.push({ ...waypoints[0] });

  for (let s = 1; s < sampleCount - 1; s++) {
    targetDist = s * step;
    while (segIdx < segments.length - 1 && covered + segments[segIdx] < targetDist) {
      covered += segments[segIdx];
      segIdx++;
    }
    const segLen = segments[segIdx];
    const t = segLen > 0 ? (targetDist - covered) / segLen : 0;
    const p0 = waypoints[segIdx];
    const p1 = waypoints[segIdx + 1];
    samples.push({
      x: p0.x + t * (p1.x - p0.x),
      y: p0.y + t * (p1.y - p0.y),
    });
  }

  samples.push({ ...waypoints[waypoints.length - 1] });
  return samples;
}

/**
 * Nearest pixel distance from a sample point to any drawn point.
 *
 * @param {{ x: number, y: number }} sample  - normalized 0–1
 * @param {Array<{x: number, y: number}>} drawn - normalized 0–1
 * @param {number} W - screen width in pixels
 * @param {number} H - screen height in pixels
 * @returns {number} distance in pixels
 */
function nearestDistance(sample, drawn, W, H) {
  let minDist = Infinity;
  for (const pt of drawn) {
    const d = Math.hypot((sample.x - pt.x) * W, (sample.y - pt.y) * H);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Compute path-tracing accuracy as a 0–100 integer.
 *
 * Algorithm:
 *  1. Sample the expected path into `SAMPLE_COUNT` evenly-spaced points.
 *  2. For each sample, find the nearest drawn point (pixel distance).
 *  3. Average those distances.
 *  4. Map: distance 0 → 100%, distance ≥ tolerance → 0%.
 *
 * Tolerance is generous (20% of screen diagonal) so young children
 * who are close but not perfect still score reasonably.
 *
 * @param {Array<{x: number, y: number}>} drawnPoints  - Normalized (0–1)
 * @param {Array<{x: number, y: number}>} expectedPath - Normalized (0–1) waypoints
 * @param {{ width: number, height: number }} dimensions - Screen pixel size
 * @returns {number} Integer accuracy 0–100
 */
export function computeAccuracy(drawnPoints, expectedPath, dimensions, options = { toleranceMultiplier: 1.0 }) {
  if (!drawnPoints || drawnPoints.length < 3) return 0;
  if (!expectedPath || expectedPath.length < 2) return 0;

  const { width: W, height: H } = dimensions;
  const SAMPLE_COUNT = 40;
  const TOLERANCE_PX = Math.hypot(W, H) * 0.20 * (options.toleranceMultiplier || 1.0);

  const samples = samplePath(expectedPath, SAMPLE_COUNT);

  let totalDist = 0;
  for (const sample of samples) {
    totalDist += nearestDistance(sample, drawnPoints, W, H);
  }
  const avgDist = totalDist / samples.length;

  // Linear mapping: 0 px → 100%, TOLERANCE_PX → 0%
  const rawScore = Math.max(0, 1 - avgDist / TOLERANCE_PX);
  return Math.round(rawScore * 100);
}
