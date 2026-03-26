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
                        if (onAnimationEnd) onAnimationEnd();
                        resolve();
                    },
                    onStopped: () => {
                        this.isSpeaking = false;
                        this.stopAnimation();
                        if (onAnimationEnd) onAnimationEnd();
                        resolve();
                    },
                    onError: (error) => {
                        // Resolve (not reject) to prevent app crash
                        console.warn('TTS error (non-fatal):', error);
                        this.isSpeaking = false;
                        this.stopAnimation();
                        if (onAnimationEnd) onAnimationEnd();
                        resolve();
                    },
                });
            } catch (error) {
                console.warn('TTS exception (non-fatal):', error);
                this.isSpeaking = false;
                this.stopAnimation();
                if (onAnimationEnd) onAnimationEnd();
                resolve();
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

    /**
     * Speak syllable by word
     */
    async speakSyllableByWord(
        word: string,
        onSyllable: (index: number) => void,
        options?: TTSOptions
    ): Promise<void> {
        const syllables = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi) || [word];
        
        for (let i = 0; i < syllables.length; i++) {
            onSyllable(i);
            await this.speak(syllables[i], { rate: 0.45, ...options });
            // add a tiny pause between syllables
            await new Promise(r => setTimeout(r, 200));
        }
        onSyllable(-1); // reset selection
        await new Promise(r => setTimeout(r, 400));
        await this.speak(word, { rate: 0.65, ...options });
    }

    /**
     * Celebrate correct pronunciation with phoneme-specific praise
     */
    async celebrateSuccessForPhoneme(targetPhonemes: string[], options?: TTSOptions): Promise<void> {
        const PHONEME_PRAISE: Record<string, string[]> = {
            'θ': ['Great job with that "th" sound!', 'Perfect tongue placement!'],
            'ð': ['Awesome "th" sound!', 'That was a beautiful "th"!'],
            'ʃ': ['Perfect "sh" sound!', 'I heard that "sh" perfectly!'],
            'tʃ': ['Crisp "ch" sound!', 'Like a choo-choo train, great "ch"!'],
            'r': ['Wonderful "r" sound!', 'That "r" sounded strong!'],
            'l': ['Lovely "l" sound!', 'Beautiful "l"!'],
            's': ['Super "s" sound!', 'Like a snake, perfect "s"!'],
            'z': ['Zippy "z" sound!', 'Great buzzing "z"!'],
        };

        const target = targetPhonemes && targetPhonemes.length > 0 ? targetPhonemes[0] : '*';
        const praises = PHONEME_PRAISE[target] || [
            'Hurray! You did it!',
            'Excellent! Great job!',
            'Wonderful! You said it perfectly!',
            'Amazing! You are so smart!',
        ];
        
        const message = praises[Math.floor(Math.random() * praises.length)];
        await this.speak(message, { rate: 0.8, pitch: 1.2, ...options });
    }
}

export const ttsService = new TextToSpeechService();
