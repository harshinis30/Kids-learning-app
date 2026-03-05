/**
 * audioService.ts
 * Manages sound effects using expo-av.
 * Pre-loads assets for low-latency playback in games.
 */
import { Audio } from 'expo-av';

const SOUNDS: Record<string, any> = {
    BOSS_HIT: require('../assets/sounds/punch.mp3'),
    BOSS_DEFEAT: require('../assets/sounds/defeat.mp3'),
    BOSS_ESCAPE: require('../assets/sounds/teleportation.mp3'),
    PET_HAPPY: require('../assets/sounds/pet_happy.mp3'),
    PET_SAD: require('../assets/sounds/pet_sad.mp3'),
    PET_EVOLVE: require('../assets/sounds/transform.mp3'),
    VICTORY: require('../assets/sounds/you_win.mp3'),
    STARS: require('../assets/sounds/ding.mp3'),
};
const soundObjects: Record<string, Audio.Sound> = {};

/**
 * Loads all sounds into memory. Call this once at app startup.
 */
export async function initAudioService() {
    try {
        const loadPromises = Object.entries(SOUNDS).map(async ([key, asset]) => {
            const { sound } = await Audio.Sound.createAsync(asset);
            soundObjects[key] = sound;
        });
        await Promise.all(loadPromises);
        console.log('[AudioService] All sounds loaded successfully');
    } catch (error) {
        console.error('[AudioService] Error loading sounds:', error);
    }
}

/**
 * Plays a pre-loaded sound.
 */
export async function playSound(key: keyof typeof SOUNDS) {
    try {
        const sound = soundObjects[key];
        if (sound) {
            await sound.replayAsync();
        } else {
            // Fallback load if not pre-loaded
            const { sound: newSound } = await Audio.Sound.createAsync(SOUNDS[key]);
            await newSound.playAsync();
        }
    } catch (error) {
        console.warn(`[AudioService] Could not play sound ${key}:`, error);
    }
}

/**
 * Cleanup sounds when not needed.
 */
export async function unloadAllSounds() {
    for (const key in soundObjects) {
        await soundObjects[key].unloadAsync();
    }
}
