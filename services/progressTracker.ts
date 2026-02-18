import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionRecord {
    date: string;
    profileId: string;
    itemsAttempted: number;
    starsEarned: number;
    stage: number;
    durationSeconds: number;
}

export interface ItemProgress {
    itemId: string;
    profileId: string;
    attempts: number;
    bestStars: number; // 0-3
    bestAccuracy: number;
    lastAttempt: string;
    accuracyHistory: number[];
}

export interface StageProgress {
    profileId: string;
    stage: number;
    totalStarsEarned: number;
    itemsCompleted: string[]; // item IDs with ≥1 star
    itemsMastered: string[];  // item IDs with 3 stars
    unlockedAt?: string;
    completedAt?: string;
}

class ProgressTrackerService {
    private itemKey(profileId: string, itemId: string) {
        return `@item_progress_${profileId}_${itemId}`;
    }
    private sessionKey(profileId: string) {
        return `@sessions_${profileId}`;
    }
    private stageKey(profileId: string, stage: number) {
        return `@stage_progress_${profileId}_${stage}`;
    }

    // ── Item Progress ──────────────────────────────────────────────────────

    async getItemProgress(profileId: string, itemId: string): Promise<ItemProgress> {
        try {
            const data = await AsyncStorage.getItem(this.itemKey(profileId, itemId));
            if (data) return JSON.parse(data);
        } catch { }
        return {
            itemId,
            profileId,
            attempts: 0,
            bestStars: 0,
            bestAccuracy: 0,
            lastAttempt: new Date().toISOString(),
            accuracyHistory: [],
        };
    }

    async recordItemAttempt(
        profileId: string,
        itemId: string,
        accuracy: number,
        stars: number
    ): Promise<ItemProgress> {
        const progress = await this.getItemProgress(profileId, itemId);
        progress.attempts += 1;
        progress.accuracyHistory.push(accuracy);
        if (progress.accuracyHistory.length > 10) {
            progress.accuracyHistory = progress.accuracyHistory.slice(-10);
        }
        if (accuracy > progress.bestAccuracy) progress.bestAccuracy = accuracy;
        if (stars > progress.bestStars) progress.bestStars = stars;
        progress.lastAttempt = new Date().toISOString();
        await AsyncStorage.setItem(this.itemKey(profileId, itemId), JSON.stringify(progress));
        return progress;
    }

    // ── Stage Progress ─────────────────────────────────────────────────────

    async getStageProgress(profileId: string, stage: number): Promise<StageProgress> {
        try {
            const data = await AsyncStorage.getItem(this.stageKey(profileId, stage));
            if (data) return JSON.parse(data);
        } catch { }
        return {
            profileId,
            stage,
            totalStarsEarned: 0,
            itemsCompleted: [],
            itemsMastered: [],
        };
    }

    async updateStageProgress(
        profileId: string,
        stage: number,
        itemId: string,
        stars: number
    ): Promise<StageProgress> {
        const progress = await this.getStageProgress(profileId, stage);
        if (stars >= 1 && !progress.itemsCompleted.includes(itemId)) {
            progress.itemsCompleted.push(itemId);
        }
        if (stars === 3 && !progress.itemsMastered.includes(itemId)) {
            progress.itemsMastered.push(itemId);
        }
        progress.totalStarsEarned += stars;
        await AsyncStorage.setItem(this.stageKey(profileId, stage), JSON.stringify(progress));
        return progress;
    }

    // ── Session History ────────────────────────────────────────────────────

    async getSessions(profileId: string): Promise<SessionRecord[]> {
        try {
            const data = await AsyncStorage.getItem(this.sessionKey(profileId));
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async saveSession(session: SessionRecord): Promise<void> {
        const sessions = await this.getSessions(session.profileId);
        sessions.push(session);
        // Keep last 30 sessions
        const trimmed = sessions.slice(-30);
        await AsyncStorage.setItem(this.sessionKey(session.profileId), JSON.stringify(trimmed));
    }

    async getRecentSessions(profileId: string, count = 7): Promise<SessionRecord[]> {
        const sessions = await this.getSessions(profileId);
        return sessions.slice(-count).reverse();
    }

    async getTotalStarsForProfile(profileId: string): Promise<number> {
        const sessions = await this.getSessions(profileId);
        return sessions.reduce((sum, s) => sum + s.starsEarned, 0);
    }

    // ── Achievements ───────────────────────────────────────────────────────

    async checkAchievements(profileId: string): Promise<string[]> {
        const sessions = await this.getSessions(profileId);
        const totalStars = sessions.reduce((sum, s) => sum + s.starsEarned, 0);
        const totalItems = sessions.reduce((sum, s) => sum + s.itemsAttempted, 0);

        const earned: string[] = [];
        const key = `@achievements_${profileId}`;
        let existing: string[] = [];
        try {
            const data = await AsyncStorage.getItem(key);
            existing = data ? JSON.parse(data) : [];
        } catch { }

        const check = (id: string, condition: boolean) => {
            if (condition && !existing.includes(id)) {
                earned.push(id);
                existing.push(id);
            }
        };

        check('first_word', totalItems >= 1);
        check('five_words', totalItems >= 5);
        check('ten_words', totalItems >= 10);
        check('first_star', totalStars >= 1);
        check('ten_stars', totalStars >= 10);
        check('fifty_stars', totalStars >= 50);
        check('three_day_streak', sessions.length >= 3);

        if (earned.length > 0) {
            await AsyncStorage.setItem(key, JSON.stringify(existing));
        }
        return earned;
    }

    async getAchievements(profileId: string): Promise<string[]> {
        try {
            const data = await AsyncStorage.getItem(`@achievements_${profileId}`);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async clearAll(profileId: string): Promise<void> {
        // Used for reset
        const sessions = await this.getSessions(profileId);
        await AsyncStorage.removeItem(this.sessionKey(profileId));
        for (const s of sessions) {
            // Can't easily enumerate item keys, but sessions are cleared
        }
    }
}

export const progressTracker = new ProgressTrackerService();
