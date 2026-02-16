import * as Speech from 'expo-speech';
import { generateLipSyncAnimation, LipSyncAnimation } from './lipSyncService';

export interface TTSOptions {
    language?: string;
    pitch?: number;
    rate?: number;
    onAnimationStart?: (animation: LipSyncAnimation) => void;
    onAnimationUpdate?: (currentTime: number) => void;
    onAnimationEnd?: () => void;
}

class TextToSpeechService {
    private isSpeaking: boolean = false;
    private animationTimer: ReturnType<typeof setInterval> | null = null;

    /**
     * Speak text with child-friendly voice settings
     */
    async speak(text: string, options: TTSOptions = {}): Promise<void> {
        const {
            language = 'en-US',
            pitch = 1.0,
            rate = 0.7, // Slower for kids to understand
            onAnimationStart,
            onAnimationUpdate,
            onAnimationEnd,
        } = options;

        return new Promise((resolve, reject) => {
            try {
                this.isSpeaking = true;

                // Generate lip-sync animation
                const animation = generateLipSyncAnimation(text, rate);

                // Notify animation start
                if (onAnimationStart) {
                    onAnimationStart(animation);
                }

                // Start animation timer
                const startTime = Date.now();
                this.animationTimer = setInterval(() => {
                    const elapsed = (Date.now() - startTime) / 1000;
                    if (onAnimationUpdate) {
                        onAnimationUpdate(elapsed);
                    }

                    if (elapsed >= animation.duration) {
                        this.stopAnimation();
                    }
                }, 1000 / 60); // 60 FPS updates

                Speech.speak(text, {
                    language,
                    pitch,
                    rate,
                    onDone: () => {
                        this.isSpeaking = false;
                        this.stopAnimation();
                        if (onAnimationEnd) {
                            onAnimationEnd();
                        }
                        resolve();
                    },
                    onError: (error) => {
                        this.isSpeaking = false;
                        this.stopAnimation();
                        if (onAnimationEnd) {
                            onAnimationEnd();
                        }
                        reject(error);
                    },
                });
            } catch (error) {
                this.isSpeaking = false;
                this.stopAnimation();
                reject(error);
            }
        });
    }

    /**
     * Stop animation timer
     */
    private stopAnimation(): void {
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
    }

    /**
     * Stop current speech
     */
    stop(): void {
        Speech.stop();
        this.isSpeaking = false;
        this.stopAnimation();
    }

    /**
     * Check if currently speaking
     */
    getSpeakingStatus(): boolean {
        return this.isSpeaking;
    }

    /**
     * Speak word pronunciation instruction
     */
    async speakWordIntroduction(word: string, options?: TTSOptions): Promise<void> {
        await this.speak(`This is ${word}. ${word}.`, options);
    }

    /**
     * Ask child to repeat
     */
    async askToRepeat(word: string, options?: TTSOptions): Promise<void> {
        await this.speak(`Now you try! Say ${word}.`, options);
    }

    /**
     * Celebrate correct pronunciation
     */
    async celebrateSuccess(options?: TTSOptions): Promise<void> {
        const celebrations = [
            'Hurray! You did it!',
            'Excellent! Great job!',
            'Wonderful! You said it perfectly!',
            'Amazing! You are so smart!',
        ];
        const message = celebrations[Math.floor(Math.random() * celebrations.length)];
        await this.speak(message, { rate: 0.8, pitch: 1.2, ...options });
    }

    /**
     * Provide encouraging feedback
     */
    async encourageRetry(correction?: string, options?: TTSOptions): Promise<void> {
        let message = 'Good try! Let\'s try again.';
        if (correction) {
            message = `Good try! ${correction} Let's practice together.`;
        }
        await this.speak(message, options);
    }

    /**
     * Provide specific pronunciation tip
     */
    async givePronunciationTip(tip: string, options?: TTSOptions): Promise<void> {
        await this.speak(tip, { rate: 0.6, ...options }); // Even slower for instructions
    }
}

export const ttsService = new TextToSpeechService();
