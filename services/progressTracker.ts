import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WordProgress {
    wordId: string;
    attempts: number;
    successes: number;
    lastAttempt: string;
    accuracyHistory: number[];
}

export interface UserProgress {
    totalWords: number;
    completedWords: string[];
    currentStreak: number;
    lastPlayedDate: string;
    achievements: string[];
}

class ProgressTrackerService {
    private readonly PROGRESS_KEY = '@pronunciation_progress';
    private readonly WORD_PROGRESS_KEY = '@word_progress_';

    /**
     * Get user's overall progress
     */
    async getUserProgress(): Promise<UserProgress> {
        try {
            const data = await AsyncStorage.getItem(this.PROGRESS_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        }

        // Default progress
        return {
            totalWords: 0,
            completedWords: [],
            currentStreak: 0,
            lastPlayedDate: new Date().toISOString(),
            achievements: [],
        };
    }

    /**
     * Save user's overall progress
     */
    async saveUserProgress(progress: UserProgress): Promise<void> {
        try {
            await AsyncStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    /**
     * Get progress for a specific word
     */
    async getWordProgress(wordId: string): Promise<WordProgress> {
        try {
            const data = await AsyncStorage.getItem(this.WORD_PROGRESS_KEY + wordId);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading word progress:', error);
        }

        // Default word progress
        return {
            wordId,
            attempts: 0,
            successes: 0,
            lastAttempt: new Date().toISOString(),
            accuracyHistory: [],
        };
    }

    /**
     * Record a pronunciation attempt
     */
    async recordAttempt(
        wordId: string,
        accuracy: number,
        isSuccess: boolean
    ): Promise<void> {
        const wordProgress = await this.getWordProgress(wordId);
        const userProgress = await this.getUserProgress();

        // Update word progress
        wordProgress.attempts += 1;
        if (isSuccess) {
            wordProgress.successes += 1;
        }
        wordProgress.accuracyHistory.push(accuracy);
        wordProgress.lastAttempt = new Date().toISOString();

        // Keep only last 10 attempts in history
        if (wordProgress.accuracyHistory.length > 10) {
            wordProgress.accuracyHistory = wordProgress.accuracyHistory.slice(-10);
        }

        // Save word progress
        await AsyncStorage.setItem(
            this.WORD_PROGRESS_KEY + wordId,
            JSON.stringify(wordProgress)
        );

        // Update user progress
        if (isSuccess && !userProgress.completedWords.includes(wordId)) {
            userProgress.completedWords.push(wordId);
            userProgress.totalWords += 1;
        }

        // Update streak
        const today = new Date().toDateString();
        const lastPlayed = new Date(userProgress.lastPlayedDate).toDateString();
        if (today !== lastPlayed) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (yesterday.toDateString() === lastPlayed) {
                userProgress.currentStreak += 1;
            } else {
                userProgress.currentStreak = 1;
            }
            userProgress.lastPlayedDate = new Date().toISOString();
        }

        await this.saveUserProgress(userProgress);
    }

    /**
     * Check and award achievements
     */
    async checkAchievements(): Promise<string[]> {
        const progress = await this.getUserProgress();
        const newAchievements: string[] = [];

        // First word achievement
        if (progress.totalWords >= 1 && !progress.achievements.includes('first_word')) {
            newAchievements.push('first_word');
            progress.achievements.push('first_word');
        }

        // 5 words achievement
        if (progress.totalWords >= 5 && !progress.achievements.includes('five_words')) {
            newAchievements.push('five_words');
            progress.achievements.push('five_words');
        }

        // 10 words achievement
        if (progress.totalWords >= 10 && !progress.achievements.includes('ten_words')) {
            newAchievements.push('ten_words');
            progress.achievements.push('ten_words');
        }

        // 7 day streak
        if (progress.currentStreak >= 7 && !progress.achievements.includes('week_streak')) {
            newAchievements.push('week_streak');
            progress.achievements.push('week_streak');
        }

        if (newAchievements.length > 0) {
            await this.saveUserProgress(progress);
        }

        return newAchievements;
    }

    /**
     * Reset all progress (for testing)
     */
    async resetProgress(): Promise<void> {
        try {
            await AsyncStorage.clear();
        } catch (error) {
            console.error('Error resetting progress:', error);
        }
    }
}

export const progressTracker = new ProgressTrackerService();
