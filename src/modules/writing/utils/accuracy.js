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
 * Compute path-tracing accuracy as a 0–100 integer using
 * BIDIRECTIONAL path matching.
 *
 * Two scores are combined:
 *
 *  A) COVERAGE — "Did the user draw near every part of the expected path?"
 *     Sample the expected path, find nearest drawn point for each sample.
 *     Scribbles score well here (they cover everything).
 *
 *  B) PRECISION — "Did the user STAY on the expected path?"
 *     Sample the drawn path, find nearest expected-path point for each sample.
 *     Scribbles score BADLY here (most drawn points are far from the path).
 *
 * Final score = (coverageScore + precisionScore) / 2
 *
 * Tolerance is 6% of screen diagonal — tight enough that off-path
 * drawing is penalized, but forgiving for young children's motor skills.
 *
 * @param {Array<{x: number, y: number}>} drawnPoints  - Normalized (0–1)
 * @param {Array<{x: number, y: number}>} expectedPath - Normalized (0–1) waypoints
 * @param {{ width: number, height: number }} dimensions - Pixel dimensions
 * @returns {number} Integer accuracy 0–100
 */
export function computeAccuracy(drawnPoints, expectedPath, dimensions, options = { toleranceMultiplier: 1.0 }) {
  if (!drawnPoints || drawnPoints.length < 3) return 0;
  if (!expectedPath || expectedPath.length < 2) return 0;

  const { width: W, height: H } = dimensions;
  const SAMPLE_COUNT = 50;
  const TOLERANCE_PX = Math.hypot(W, H) * 0.06 * (options.toleranceMultiplier || 1.0);

  // Sample both paths into evenly-spaced points
  const expectedSamples = samplePath(expectedPath, SAMPLE_COUNT);
  const drawnSamples = samplePath(drawnPoints, SAMPLE_COUNT);

  // A) COVERAGE: for each expected sample, nearest drawn point
  let coverageDist = 0;
  for (const sample of expectedSamples) {
    coverageDist += nearestDistance(sample, drawnSamples, W, H);
  }
  const avgCoverage = coverageDist / expectedSamples.length;
  const coverageScore = Math.max(0, 1 - avgCoverage / TOLERANCE_PX);

  // B) PRECISION: for each drawn sample, nearest expected-path point
  let precisionDist = 0;
  for (const sample of drawnSamples) {
    precisionDist += nearestDistance(sample, expectedSamples, W, H);
  }
  const avgPrecision = precisionDist / drawnSamples.length;
  const precisionScore = Math.max(0, 1 - avgPrecision / TOLERANCE_PX);

  // Combine both scores equally
  const finalScore = (coverageScore + precisionScore) / 2;
  return Math.round(finalScore * 100);
}
