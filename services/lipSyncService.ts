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

/**
 * Simple phoneme-to-viseme mapping
 * Maps common letter patterns to mouth shapes
 */
function textToVisemes(text: string): VisemeType[] {
    const visemes: VisemeType[] = [];
    const words = text.toLowerCase().split(/\s+/);

    for (const word of words) {
        if (!word) continue;

        // Add silence between words
        if (visemes.length > 0) {
            visemes.push('sil');
        }

        // Simple rule-based phoneme mapping
        let i = 0;
        while (i < word.length) {
            const char = word[i];
            const nextChar = word[i + 1];
            const prevChar = i > 0 ? word[i - 1] : '';

            // Two-character patterns
            if (char === 't' && nextChar === 'h') {
                visemes.push('TH');
                i += 2;
                continue;
            }

            if (char === 'o' && nextChar === 'o') {
                visemes.push('U');
                i += 2;
                continue;
            }

            if (char === 'e' && nextChar === 'e') {
                visemes.push('I');
                i += 2;
                continue;
            }

            // Single character mapping
            switch (char) {
                case 'a':
                    // "a" can be AA or E depending on context
                    if (nextChar === 'y' || nextChar === 'i') {
                        visemes.push('E');
                    } else {
                        visemes.push('AA');
                    }
                    break;
                case 'e':
                    visemes.push('E');
                    break;
                case 'i':
                    visemes.push('I');
                    break;
                case 'o':
                    visemes.push('O');
                    break;
                case 'u':
                    visemes.push('U');
                    break;
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
                    visemes.push('L');
                    break;
                case 'w':
                    visemes.push('W');
                    break;
                case 's':
                case 'z':
                case 'c':
                    visemes.push('S');
                    break;
                case 'r':
                    visemes.push('R');
                    break;
                default:
                    // Consonants that don't have specific mouth shapes
                    // Use a neutral/slight open mouth
                    if (prevChar && 'aeiou'.includes(prevChar)) {
                        // Don't add extra viseme, extend previous vowel
                    } else {
                        visemes.push('sil');
                    }
            }

            i++;
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
