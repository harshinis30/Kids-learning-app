/**
 * scoring.js — Writing Module · Level 1
 *
 * Feedback messages and progression gating.
 * Accuracy *computation* lives in accuracy.js (separate module).
 *
 * @module scoring
 */

/**
 * Return a feedback message and emoji based on accuracy percentage.
 *
 * @param {number} accuracy - Integer 0–100
 * @returns {{ message: string, emoji: string }}
 */
export function getFeedback(accuracy) {
  if (accuracy >= 90) {
    return { message: 'Excellent! Perfect stroke!', emoji: '🏆' };
  }
  if (accuracy >= 70) {
    return { message: 'Great job! Milo is moving well!', emoji: '🎉' };
  }
  if (accuracy >= 40) {
    return { message: "Nice try! You're getting better!", emoji: '🌟' };
  }
  return { message: 'Good attempt! Keep trying!', emoji: '💪' };
}

/**
 * Returns true if the player has earned enough accuracy to advance
 * to the next story moment (60% threshold).
 *
 * @param {number} accuracy - Integer 0–100
 * @returns {boolean}
 */
export function canProgress(accuracy) {
  return accuracy >= 60;
}

/** Backward-compat threshold (normalized 0–1 equivalent of 60%) */
export const SUCCESS_THRESHOLD = 0.6;
