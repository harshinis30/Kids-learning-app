/**
 * Lip Sync Service
 * Converts text to viseme animations for realistic lip-sync
 */

export type VisemeType =
    | 'sil'   // Silence/neutral
    | 'AA'    // "ah" sound (father, hot)
    | 'E'     // "eh" sound (bed, said)
    | 'I'     // "ee" sound (bee, see)
    | 'O'     // "oh" sound (boat, show)
    | 'U'     // "oo" sound (boot, blue)
    | 'M'     // Lips closed (mom, boom)
    | 'F'     // Teeth on lower lip (fun, very)
    | 'L'     // Tongue to teeth (love, hello)
    | 'W'     // Lips rounded (wow, quick)
    | 'TH'    // Tongue between teeth (think, this)
    | 'S'     // Teeth together (see, kiss)
    | 'R';    // Lips slightly rounded (red, car)

export interface VisemeKeyframe {
    time: number;        // Time in seconds
    viseme: VisemeType;
    duration: number;    // Duration of this viseme
    blendWeights: {      // Blendshape weights for this viseme
        jawOpen?: number;
        mouthSmile?: number;
        mouthFunnel?: number;
        mouthPucker?: number;
        mouthRollLower?: number;
        mouthRollUpper?: number;
        [key: string]: number | undefined;
    };
}

export interface LipSyncAnimation {
    keyframes: VisemeKeyframe[];
    duration: number;
}

/**
 * Viseme definitions with blendshape weights
 * These map to common facial blendshape names
 */
const VISEME_BLENDSHAPES: Record<VisemeType, VisemeKeyframe['blendWeights']> = {
    sil: {
        jawOpen: 0,
        mouthSmile: 0,
        mouthFunnel: 0,
        mouthPucker: 0,
    },
    AA: {
        jawOpen: 0.7,
        mouthSmile: 0,
        mouthFunnel: 0.3,
        mouthPucker: 0,
    },
    E: {
        jawOpen: 0.4,
        mouthSmile: 0.6,
        mouthFunnel: 0,
        mouthPucker: 0,
    },
    I: {
        jawOpen: 0.2,
        mouthSmile: 0.8,
        mouthFunnel: 0,
        mouthPucker: 0,
    },
    O: {
        jawOpen: 0.6,
        mouthSmile: 0,
        mouthFunnel: 0.7,
        mouthPucker: 0.3,
    },
    U: {
        jawOpen: 0.3,
        mouthSmile: 0,
        mouthFunnel: 0.5,
        mouthPucker: 0.8,
    },
    M: {
        jawOpen: 0,
        mouthSmile: 0,
        mouthFunnel: 0,
        mouthPucker: 0.2,
        mouthRollLower: 0.3,
        mouthRollUpper: 0.3,
    },
    F: {
        jawOpen: 0.2,
        mouthSmile: 0,
        mouthFunnel: 0,
        mouthPucker: 0,
        mouthRollLower: 0.6,
    },
    L: {
        jawOpen: 0.3,
        mouthSmile: 0.2,
        mouthFunnel: 0,
        mouthPucker: 0,
    },
    W: {
        jawOpen: 0.2,
        mouthSmile: 0,
        mouthFunnel: 0.4,
        mouthPucker: 0.7,
    },
    TH: {
        jawOpen: 0.3,
        mouthSmile: 0.1,
        mouthFunnel: 0,
        mouthPucker: 0,
    },
    S: {
        jawOpen: 0.1,
        mouthSmile: 0.3,
        mouthFunnel: 0,
        mouthPucker: 0,
    },
    R: {
        jawOpen: 0.3,
        mouthSmile: 0,
        mouthFunnel: 0.2,
        mouthPucker: 0.4,
    },
};

import { RiTa } from 'rita';

/**
 * Phoneme-to-viseme mapping
 * Maps ARPAbet phonemes (from RiTa) to mouth shapes
 */
function textToVisemes(text: string): VisemeType[] {
    const visemes: VisemeType[] = [];
    const words = text.split(/\s+/);

    for (const word of words) {
        if (!word) continue;

        // Add silence between words
        if (visemes.length > 0) {
            visemes.push('sil');
        }

        // Remove punctuation
        const cleanWord = word.replace(/[.,!?]/g, '');
        if (!cleanWord) continue;

        try {
            // Get phonemes using RiTa (returns ARPAbet format like "ae p ah l")
            const phonesStr = RiTa.phones(cleanWord);
            if (phonesStr) {
                const phones = phonesStr.split('-');

                for (const phone of phones) {
                    const cleanPhone = phone.replace(/[0-9]/g, '').toLowerCase();

                    switch (cleanPhone) {
                        // Vowels
                        case 'aa':
                        case 'ao':
                        case 'ah':
                            visemes.push('AA');
                            break;
                        case 'ae':
                        case 'eh':
                        case 'ay':
                        case 'ey':
                            visemes.push('E');
                            break;
                        case 'iy':
                        case 'ih':
                            visemes.push('I');
                            break;
                        case 'ow':
                        case 'aw':
                        case 'oy':
                            visemes.push('O');
                            break;
                        case 'uw':
                        case 'uh':
                            visemes.push('U');
                            break;

                        // Consonants
                        case 'm':
                        case 'b':
                        case 'p':
                            visemes.push('M');
                            break;
                        case 'f':
                        case 'v':
                            visemes.push('F');
                            break;
                        case 'l':
                        case 'n':
                        case 'ng':
                        case 'd':
                        case 't':
                            visemes.push('L');
                            break;
                        case 'w':
                        case 'r':
                        case 'er':
                        case 'y':
                            visemes.push('W');
                            break;
                        case 'th':
                        case 'dh':
                            visemes.push('TH');
                            break;
                        case 's':
                        case 'z':
                        case 'sh':
                        case 'zh':
                        case 'ch':
                        case 'jh':
                            visemes.push('S');
                            break;
                        case 'k':
                        case 'g':
                        case 'hh':
                            visemes.push('sil'); // Guttural, slight open
                            break;
                        default:
                            visemes.push('sil');
                    }
                }
            } else {
                // Fallback for unknown words (basic guess)
                visemes.push('AA');
                visemes.push('M');
            }
        } catch (e) {
            console.warn('Phoneme error for word:', word, e);
            visemes.push('sil');
        }
    }

    // End with silence
    visemes.push('sil');

    return visemes;
}

/**
 * Generate lip-sync animation from text
 * @param text The text to convert to animation
 * @param speechRate Speech rate (0.5 = slow, 1.0 = normal, 1.5 = fast)
 * @returns Animation with keyframes
 */
export function generateLipSyncAnimation(
    text: string,
    speechRate: number = 0.7
): LipSyncAnimation {
    const visemes = textToVisemes(text);

    // Base duration per viseme (in seconds)
    const baseDuration = 0.15 / speechRate;
    const silenceDuration = 0.1 / speechRate;

    const keyframes: VisemeKeyframe[] = [];
    let currentTime = 0;

    for (const viseme of visemes) {
        const duration = viseme === 'sil' ? silenceDuration : baseDuration;

        keyframes.push({
            time: currentTime,
            viseme,
            duration,
            blendWeights: VISEME_BLENDSHAPES[viseme],
        });

        currentTime += duration;
    }

    return {
        keyframes,
        duration: currentTime,
    };
}

/**
 * Get interpolated blendshape weights at a specific time
 * @param animation The lip-sync animation
 * @param time Current time in seconds
 * @returns Interpolated blendshape weights
 */
export function getBlendWeightsAtTime(
    animation: LipSyncAnimation,
    time: number
): VisemeKeyframe['blendWeights'] {
    if (time >= animation.duration) {
        // Return neutral position
        return VISEME_BLENDSHAPES.sil;
    }

    // Find current and next keyframes
    let currentKeyframe: VisemeKeyframe | null = null;
    let nextKeyframe: VisemeKeyframe | null = null;

    for (let i = 0; i < animation.keyframes.length; i++) {
        const kf = animation.keyframes[i];
        if (time >= kf.time && time < kf.time + kf.duration) {
            currentKeyframe = kf;
            nextKeyframe = animation.keyframes[i + 1] || null;
            break;
        }
    }

    if (!currentKeyframe) {
        return VISEME_BLENDSHAPES.sil;
    }

    // If no next keyframe or we're early in current keyframe, use current weights
    if (!nextKeyframe) {
        return currentKeyframe.blendWeights;
    }

    // Calculate interpolation factor (ease in/out for smooth transitions)
    const keyframeProgress = (time - currentKeyframe.time) / currentKeyframe.duration;

    // Use ease-in-out for smooth transitions
    const t = keyframeProgress < 0.5
        ? 2 * keyframeProgress * keyframeProgress
        : 1 - Math.pow(-2 * keyframeProgress + 2, 2) / 2;

    // Interpolate between current and next
    const interpolated: VisemeKeyframe['blendWeights'] = {};
    const allKeys = new Set([
        ...Object.keys(currentKeyframe.blendWeights),
        ...Object.keys(nextKeyframe.blendWeights),
    ]);

    for (const key of allKeys) {
        const current = currentKeyframe.blendWeights[key] || 0;
        const next = nextKeyframe.blendWeights[key] || 0;
        interpolated[key] = current + (next - current) * t;
    }

    return interpolated;
}

/**
 * Easing function for smooth interpolation
 */
function easeInOutCubic(t: number): number {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
