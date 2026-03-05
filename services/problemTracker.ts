import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PhonemeRecord {
    phoneme: string;
    attempts: number;
    totalAccuracy: number; // sum of all accuracy scores
    lastAttempt: string;
}

export interface ProblemArea {
    phoneme: string;
    averageAccuracy: number;
    attempts: number;
    label: string; // human-readable label e.g. "th sound"
}

const PHONEME_LABELS: Record<string, string> = {
    'θ': '"th" sound (thin)',
    'ð': '"th" sound (the)',
    'ʃ': '"sh" sound',
    'tʃ': '"ch" sound',
    'ŋ': '"ng" sound',
    'r': '"r" sound',
    'l': '"l" sound',
    'v': '"v" sound',
    'ɜː': '"er" sound',
    'aɪ': '"igh" sound',
    'ɔɪ': '"oi" sound',
    'æ': '"a" sound (cat)',
    'ɑː': '"ah" sound',
    'iː': '"ee" sound',
    'uː': '"oo" sound',
    'oʊ': '"oh" sound',
    'eɪ': '"ay" sound',
    'b': '"b" sound',
    'm': '"m" sound',
    'd': '"d" sound',
    'p': '"p" sound',
    'n': '"n" sound',
    't': '"t" sound',
    'k': '"k" sound',
    's': '"s" sound',
    'f': '"f" sound',
    'h': '"h" sound',
    'ɡ': '"g" sound',
    'w': '"w" sound',
    'j': '"y" sound',
};

class ProblemTrackerService {
    private getKey(profileId: string) {
        return `@problem_tracker_${profileId}`;
    }

    async getPhonemeRecords(profileId: string): Promise<PhonemeRecord[]> {
        try {
            const data = await AsyncStorage.getItem(this.getKey(profileId));
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async recordPhonemeAttempt(
        profileId: string,
        phonemes: string[],
        accuracy: number
    ): Promise<void> {
        const records = await this.getPhonemeRecords(profileId);

        for (const phoneme of phonemes) {
            const existing = records.find(r => r.phoneme === phoneme);
            if (existing) {
                existing.attempts += 1;
                existing.totalAccuracy += accuracy;
                existing.lastAttempt = new Date().toISOString();
            } else {
                records.push({
                    phoneme,
                    attempts: 1,
                    totalAccuracy: accuracy,
                    lastAttempt: new Date().toISOString(),
                });
            }
        }

        await AsyncStorage.setItem(this.getKey(profileId), JSON.stringify(records));
    }

    async getProblemAreas(profileId: string, minAttempts = 2): Promise<ProblemArea[]> {
        const records = await this.getPhonemeRecords(profileId);

        const problems: ProblemArea[] = records
            .filter(r => r.attempts >= minAttempts)
            .map(r => ({
                phoneme: r.phoneme,
                averageAccuracy: r.totalAccuracy / r.attempts,
                attempts: r.attempts,
                label: PHONEME_LABELS[r.phoneme] || `"${r.phoneme}" sound`,
            }))
            .filter(p => p.averageAccuracy < 70) // Below 70% is a problem area
            .sort((a, b) => a.averageAccuracy - b.averageAccuracy); // Worst first

        return problems.slice(0, 5); // Top 5 problem areas
    }

    async getStrongestSounds(profileId: string, minAttempts = 2): Promise<ProblemArea[]> {
        const records = await this.getPhonemeRecords(profileId);

        return records
            .filter(r => r.attempts >= minAttempts)
            .map(r => ({
                phoneme: r.phoneme,
                averageAccuracy: r.totalAccuracy / r.attempts,
                attempts: r.attempts,
                label: PHONEME_LABELS[r.phoneme] || `"${r.phoneme}" sound`,
            }))
            .filter(p => p.averageAccuracy >= 80)
            .sort((a, b) => b.averageAccuracy - a.averageAccuracy)
            .slice(0, 3);
    }

    async clearRecords(profileId: string): Promise<void> {
        await AsyncStorage.removeItem(this.getKey(profileId));
    }
}

export const problemTracker = new ProblemTrackerService();
