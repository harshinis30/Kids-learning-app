import * as Speech from 'expo-speech';

export interface TTSOptions {
    language?: string;
    pitch?: number;
    rate?: number;
}

class TextToSpeechService {
    private isSpeaking: boolean = false;

    /**
     * Speak text with child-friendly voice settings
     */
    async speak(text: string, options: TTSOptions = {}): Promise<void> {
        const {
            language = 'en-US',
            pitch = 1.0,
            rate = 0.7, // Slower for kids to understand
        } = options;

        return new Promise((resolve, reject) => {
            try {
                this.isSpeaking = true;

                Speech.speak(text, {
                    language,
                    pitch,
                    rate,
                    onDone: () => {
                        this.isSpeaking = false;
                        resolve();
                    },
                    onError: (error) => {
                        this.isSpeaking = false;
                        reject(error);
                    },
                });
            } catch (error) {
                this.isSpeaking = false;
                reject(error);
            }
        });
    }

    /**
     * Stop current speech
     */
    stop(): void {
        Speech.stop();
        this.isSpeaking = false;
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
    async speakWordIntroduction(word: string): Promise<void> {
        await this.speak(`This is ${word}. ${word}.`);
    }

    /**
     * Ask child to repeat
     */
    async askToRepeat(word: string): Promise<void> {
        await this.speak(`Now you try! Say ${word}.`);
    }

    /**
     * Celebrate correct pronunciation
     */
    async celebrateSuccess(): Promise<void> {
        const celebrations = [
            'Hurray! You did it!',
            'Excellent! Great job!',
            'Wonderful! You said it perfectly!',
            'Amazing! You are so smart!',
        ];
        const message = celebrations[Math.floor(Math.random() * celebrations.length)];
        await this.speak(message, { rate: 0.8, pitch: 1.2 });
    }

    /**
     * Provide encouraging feedback
     */
    async encourageRetry(correction?: string): Promise<void> {
        let message = 'Good try! Let\'s try again.';
        if (correction) {
            message = `Good try! ${correction} Let's practice together.`;
        }
        await this.speak(message);
    }

    /**
     * Provide specific pronunciation tip
     */
    async givePronunciationTip(tip: string): Promise<void> {
        await this.speak(tip, { rate: 0.6 }); // Even slower for instructions
    }
}

export const ttsService = new TextToSpeechService();
