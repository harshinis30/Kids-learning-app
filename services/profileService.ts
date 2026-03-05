import AsyncStorage from '@react-native-async-storage/async-storage';

export type AgeGroup = 'toddler' | 'explorer'; // 2-4 | 5-7

export interface ChildProfile {
    id: string;
    name: string;
    ageGroup: AgeGroup;
    avatarColor: string; // hex color for avatar
    createdAt: string;
    currentStage: number;
    totalStars: number;
    currentStreak: number;
    lastPlayedDate: string;
}

const PROFILES_KEY = '@kids_app_profiles';
const ACTIVE_PROFILE_KEY = '@kids_app_active_profile';

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

class ProfileService {
    async getAllProfiles(): Promise<ChildProfile[]> {
        try {
            const data = await AsyncStorage.getItem(PROFILES_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async getActiveProfile(): Promise<ChildProfile | null> {
        try {
            const activeId = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
            if (!activeId) return null;
            const profiles = await this.getAllProfiles();
            return profiles.find(p => p.id === activeId) || null;
        } catch {
            return null;
        }
    }

    async createProfile(name: string, ageGroup: AgeGroup): Promise<ChildProfile> {
        const profiles = await this.getAllProfiles();
        const colorIndex = profiles.length % AVATAR_COLORS.length;
        const profile: ChildProfile = {
            id: Date.now().toString(),
            name: name.trim(),
            ageGroup,
            avatarColor: AVATAR_COLORS[colorIndex],
            createdAt: new Date().toISOString(),
            currentStage: 1,
            totalStars: 0,
            currentStreak: 0,
            lastPlayedDate: new Date().toISOString(),
        };
        profiles.push(profile);
        await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
        return profile;
    }

    async updateProfile(updated: ChildProfile): Promise<void> {
        const profiles = await this.getAllProfiles();
        const idx = profiles.findIndex(p => p.id === updated.id);
        if (idx >= 0) {
            profiles[idx] = updated;
            await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        }
    }

    async switchProfile(id: string): Promise<void> {
        await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, id);
    }

    async addStars(profileId: string, stars: number): Promise<void> {
        const profiles = await this.getAllProfiles();
        const idx = profiles.findIndex(p => p.id === profileId);
        if (idx >= 0) {
            profiles[idx].totalStars += stars;
            // Update streak
            const today = new Date().toDateString();
            const last = new Date(profiles[idx].lastPlayedDate).toDateString();
            if (today !== last) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                profiles[idx].currentStreak = yesterday.toDateString() === last
                    ? profiles[idx].currentStreak + 1
                    : 1;
                profiles[idx].lastPlayedDate = new Date().toISOString();
            }
            await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        }
    }

    async advanceStage(profileId: string): Promise<void> {
        const profiles = await this.getAllProfiles();
        const idx = profiles.findIndex(p => p.id === profileId);
        if (idx >= 0 && profiles[idx].currentStage < 4) {
            profiles[idx].currentStage += 1;
            await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
        }
    }

    async hasAnyProfile(): Promise<boolean> {
        const profiles = await this.getAllProfiles();
        return profiles.length > 0;
    }

    async deleteProfile(id: string): Promise<void> {
        const profiles = await this.getAllProfiles();
        const filtered = profiles.filter(p => p.id !== id);
        await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(filtered));
        const activeId = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
        if (activeId === id) {
            const next = filtered[0];
            if (next) {
                await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, next.id);
            } else {
                await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
            }
        }
    }
}

export const profileService = new ProfileService();
