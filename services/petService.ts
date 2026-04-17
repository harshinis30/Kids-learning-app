import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PetStage {
    stage: number;
    emoji: string;
    name: string;
    minStars: number;
    maxStars: number | null; // null = infinite
    description: string;
    model3D: number; // require() path to GLB
}

export const PET_STAGES: PetStage[] = [
    { stage: 0, emoji: '🥚', name: 'Mystery Egg', minStars: 0, maxStars: 9, description: 'A mysterious egg that wiggles sometimes...', model3D: require('../assets/models/bird_orange.glb') },
    { stage: 1, emoji: '🐣', name: 'Hatchling', minStars: 10, maxStars: 24, description: 'Just hatched! Blinking at the world.', model3D: require('../assets/models/bird_orange.glb') },
    { stage: 2, emoji: '🐥', name: 'Baby Buddy', minStars: 25, maxStars: 49, description: 'Bouncy and excited to learn!', model3D: require('../assets/models/bird_orange.glb') },
    { stage: 3, emoji: '🦎', name: 'Crystal Lizard', minStars: 50, maxStars: 99, description: 'Glowing with power and magic.', model3D: require('../assets/models/phoenix_bird.glb') },
    { stage: 4, emoji: '🐉', name: 'Sound Dragon', minStars: 100, maxStars: 199, description: 'Wings spread, breathing tiny flames!', model3D: require('../assets/models/phoenix_bird.glb') },
    { stage: 5, emoji: '✨🐉', name: 'Legendary Dragon', minStars: 200, maxStars: null, description: 'A rainbow legend of sound mastery!', model3D: require('../assets/models/tarisland_-_dragon_high_poly.glb') },
];

export type PetEmotion = 'idle' | 'happy' | 'sad' | 'excited' | 'victory' | 'wave' | 'listening';

// Module-level emotion with listener pattern
let currentEmotion: PetEmotion = 'idle';
let emotionResetTimer: ReturnType<typeof setTimeout> | null = null;
const emotionListeners: Set<(e: PetEmotion) => void> = new Set();

export function getPetStage(totalStars: number): PetStage {
    let result = PET_STAGES[0];
    for (const stage of PET_STAGES) {
        if (totalStars >= stage.minStars) {
            result = stage;
        }
    }
    return result;
}

export function getStarsToNextEvolution(totalStars: number): number {
    const current = getPetStage(totalStars);
    const nextStage = PET_STAGES.find(s => s.stage === current.stage + 1);
    if (!nextStage) return 0; // Already at max
    return nextStage.minStars - totalStars;
}

export function triggerEmotion(emotion: PetEmotion): void {
    currentEmotion = emotion;
    emotionListeners.forEach(fn => fn(emotion));

    if (emotionResetTimer) clearTimeout(emotionResetTimer);
    emotionResetTimer = setTimeout(() => {
        currentEmotion = 'idle';
        emotionListeners.forEach(fn => fn('idle'));
        emotionResetTimer = null;
    }, 3000);
}

export function subscribeToEmotion(fn: (e: PetEmotion) => void): () => void {
    emotionListeners.add(fn);
    // Immediately notify current state
    fn(currentEmotion);
    return () => emotionListeners.delete(fn);
}

export async function getPetName(profileId: string): Promise<string> {
    try {
        const name = await AsyncStorage.getItem(`@pet_name_${profileId}`);
        return name ?? 'Buddy';
    } catch {
        return 'Buddy';
    }
}

export async function savePetName(profileId: string, name: string): Promise<void> {
    try {
        await AsyncStorage.setItem(`@pet_name_${profileId}`, name.trim() || 'Buddy');
    } catch {
        // ignore
    }
}
