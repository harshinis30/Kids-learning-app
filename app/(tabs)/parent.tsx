import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { STAGE_NAMES } from '../../data/curriculum';
import { getPetName, savePetName } from '../../services/petService';
import { ProblemArea, problemTracker } from '../../services/problemTracker';
import { ChildProfile, profileService } from '../../services/profileService';
import { progressTracker, SessionRecord } from '../../services/progressTracker';

const PARENT_PIN = '1234'; // Default PIN — in production, make this configurable

const ACHIEVEMENT_INFO: Record<string, { emoji: string; label: string }> = {
    first_word: { emoji: '🌱', label: 'First Word' },
    five_words: { emoji: '🌟', label: '5 Words' },
    ten_words: { emoji: '🏆', label: '10 Words' },
    first_star: { emoji: '⭐', label: 'First Star' },
    ten_stars: { emoji: '💫', label: '10 Stars' },
    fifty_stars: { emoji: '🎖️', label: '50 Stars' },
    three_day_streak: { emoji: '🔥', label: '3-Day Streak' },
};

export default function ParentDashboard() {
    const [pinInput, setPinInput] = useState('');
    const [unlocked, setUnlocked] = useState(false);
    const [pinError, setPinError] = useState(false);
    const [profiles, setProfiles] = useState<ChildProfile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<ChildProfile | null>(null);
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [problems, setProblems] = useState<ProblemArea[]>([]);
    const [achievements, setAchievements] = useState<string[]>([]);
    const [petNameInput, setPetNameInput] = useState('');
    const [petNameSaved, setPetNameSaved] = useState(false);

    const handlePinSubmit = () => {
        if (pinInput === PARENT_PIN) {
            setUnlocked(true);
            loadProfiles();
        } else {
            setPinError(true);
            setPinInput('');
            setTimeout(() => setPinError(false), 1500);
        }
    };

    const loadProfiles = async () => {
        const all = await profileService.getAllProfiles();
        setProfiles(all);
        if (all.length > 0) selectProfile(all[0]);
    };

    const selectProfile = async (p: ChildProfile) => {
        setSelectedProfile(p);
        setPetNameSaved(false);
        const [s, probs, achs, pName] = await Promise.all([
            progressTracker.getRecentSessions(p.id, 10),
            problemTracker.getProblemAreas(p.id),
            progressTracker.getAchievements(p.id),
            getPetName(p.id),
        ]);
        setSessions(s);
        setProblems(probs);
        setAchievements(achs);
        setPetNameInput(pName);
    };

    const handleDeleteProfile = (p: ChildProfile) => {
        Alert.alert(
            'Delete Profile',
            `Are you sure you want to delete ${p.name}'s profile? All progress will be lost.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        await profileService.deleteProfile(p.id);
                        await loadProfiles();
                    }
                }
            ]
        );
    };

    const totalSessionStars = sessions.reduce((sum, s) => sum + s.starsEarned, 0);
    const totalSessionItems = sessions.reduce((sum, s) => sum + s.itemsAttempted, 0);

    // ── PIN Screen ─────────────────────────────────────────────────────────
    if (!unlocked) {
        return (
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
                <SafeAreaView style={styles.safe}>
                    <View style={styles.pinContainer}>
                        <Text style={styles.lockEmoji}>🔒</Text>
                        <Text style={styles.pinTitle}>Parent Dashboard</Text>
                        <Text style={styles.pinSub}>Enter your 4-digit PIN to continue</Text>
                        <TextInput
                            style={[styles.pinInput, pinError && styles.pinInputError]}
                            value={pinInput}
                            onChangeText={setPinInput}
                            keyboardType="number-pad"
                            maxLength={4}
                            secureTextEntry
                            placeholder="• • • •"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            autoFocus
                            onSubmitEditing={handlePinSubmit}
                        />
                        {pinError && <Text style={styles.pinErrorText}>Incorrect PIN. Try again.</Text>}
                        <TouchableOpacity
                            style={[styles.pinBtn, pinInput.length < 4 && styles.pinBtnDisabled]}
                            onPress={handlePinSubmit}
                            disabled={pinInput.length < 4}
                        >
                            <Text style={styles.pinBtnText}>Unlock →</Text>
                        </TouchableOpacity>
                        <Text style={styles.pinHint}>Default PIN: 1234</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    // ── Dashboard ──────────────────────────────────────────────────────────
    return (
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
            <SafeAreaView style={styles.safe}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    <Text style={styles.dashTitle}>👨‍👩‍👧 Parent Dashboard</Text>

                    {/* Profile selector */}
                    <Text style={styles.sectionTitle}>Children</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profilesScroll}>
                        {profiles.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.profileChip, selectedProfile?.id === p.id && styles.profileChipActive]}
                                onPress={() => selectProfile(p)}
                                onLongPress={() => handleDeleteProfile(p)}
                            >
                                <View style={[styles.profileAvatar, { backgroundColor: p.avatarColor }]}>
                                    <Text style={styles.profileAvatarText}>{p.name[0].toUpperCase()}</Text>
                                </View>
                                <Text style={styles.profileChipName}>{p.name}</Text>
                                <Text style={styles.profileChipAge}>{p.ageGroup === 'toddler' ? '2–4' : '5–7'}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {selectedProfile && (
                        <>
                            {/* Profile overview */}
                            <View style={styles.overviewCard}>
                                <LinearGradient
                                    colors={[selectedProfile.avatarColor, selectedProfile.avatarColor + '99']}
                                    style={styles.overviewGradient}
                                >
                                    <View style={styles.overviewRow}>
                                        <View style={styles.overviewStat}>
                                            <Text style={styles.overviewNumber}>{selectedProfile.totalStars}</Text>
                                            <Text style={styles.overviewLabel}>Total Stars ⭐</Text>
                                        </View>
                                        <View style={styles.overviewStat}>
                                            <Text style={styles.overviewNumber}>{selectedProfile.currentStreak}</Text>
                                            <Text style={styles.overviewLabel}>Day Streak 🔥</Text>
                                        </View>
                                        <View style={styles.overviewStat}>
                                            <Text style={styles.overviewNumber}>Stage {selectedProfile.currentStage}</Text>
                                            <Text style={styles.overviewLabel}>{STAGE_NAMES[selectedProfile.currentStage]}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.overviewRow}>
                                        <View style={styles.overviewStat}>
                                            <Text style={styles.overviewNumber}>{totalSessionItems}</Text>
                                            <Text style={styles.overviewLabel}>Words Practiced</Text>
                                        </View>
                                        <View style={styles.overviewStat}>
                                            <Text style={styles.overviewNumber}>{totalSessionStars}</Text>
                                            <Text style={styles.overviewLabel}>Stars This Week</Text>
                                        </View>
                                        <View style={styles.overviewStat}>
                                            <Text style={styles.overviewNumber}>{sessions.length}</Text>
                                            <Text style={styles.overviewLabel}>Sessions</Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>

                            {/* Problem Areas */}
                            <Text style={styles.sectionTitle}>🎯 Needs Practice</Text>
                            {problems.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <Text style={styles.emptyText}>🌟 No problem areas yet! Keep practicing.</Text>
                                </View>
                            ) : (
                                problems.map((p, i) => (
                                    <View key={i} style={styles.problemRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.problemLabel}>{p.label}</Text>
                                            <Text style={styles.problemAttempts}>{p.attempts} attempts</Text>
                                        </View>
                                        <View style={styles.problemBarContainer}>
                                            <View style={styles.problemBar}>
                                                <View style={[styles.problemBarFill, {
                                                    width: `${p.averageAccuracy}%`,
                                                    backgroundColor: p.averageAccuracy < 40 ? '#EF4444' : p.averageAccuracy < 60 ? '#F59E0B' : '#10B981',
                                                }]} />
                                            </View>
                                            <Text style={styles.problemPct}>{Math.round(p.averageAccuracy)}%</Text>
                                        </View>
                                    </View>
                                ))
                            )}

                            {/* Session History */}
                            <Text style={styles.sectionTitle}>📅 Session History</Text>
                            {sessions.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <Text style={styles.emptyText}>No sessions yet. Start learning!</Text>
                                </View>
                            ) : (
                                sessions.map((s, i) => (
                                    <View key={i} style={styles.sessionRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.sessionDate}>
                                                {new Date(s.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                            </Text>
                                            <Text style={styles.sessionMeta}>
                                                Stage {s.stage} · {s.itemsAttempted} words · {Math.round(s.durationSeconds / 60)} min
                                            </Text>
                                        </View>
                                        <View style={styles.sessionStarsBox}>
                                            <Text style={styles.sessionStars}>⭐ {s.starsEarned}</Text>
                                        </View>
                                    </View>
                                ))
                            )}

                            {/* Achievements */}
                            <Text style={styles.sectionTitle}>🏆 Achievements</Text>
                            {achievements.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <Text style={styles.emptyText}>No achievements yet. Keep going!</Text>
                                </View>
                            ) : (
                                <View style={styles.achievementsGrid}>
                                    {achievements.map((id, i) => {
                                        const info = ACHIEVEMENT_INFO[id] || { emoji: '🎖️', label: id };
                                        return (
                                            <View key={i} style={styles.achievementBadge}>
                                                <Text style={styles.achievementEmoji}>{info.emoji}</Text>
                                                <Text style={styles.achievementLabel}>{info.label}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Tips for parents */}
                            <Text style={styles.sectionTitle}>💡 Tips for You</Text>
                            <View style={styles.tipsCard}>
                                {problems.length > 0 ? (
                                    <>
                                        <Text style={styles.tipText}>• Practice the {problems[0].label} together at home</Text>
                                        <Text style={styles.tipText}>• Try 5–10 minutes of practice daily for best results</Text>
                                        <Text style={styles.tipText}>• Celebrate every star earned — it builds confidence!</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.tipText}>• Great progress! Keep up the daily practice</Text>
                                        <Text style={styles.tipText}>• Read books together to reinforce new words</Text>
                                        <Text style={styles.tipText}>• Celebrate every achievement, big or small!</Text>
                                    </>
                                )}
                            </View>

                            {/* Pet Naming */}
                            <Text style={styles.sectionTitle}>🐾 Name Your Pet</Text>
                            <View style={styles.petNameCard}>
                                <Text style={styles.petNameLabel}>Give your child's companion a special name:</Text>
                                <View style={styles.petNameRow}>
                                    <TextInput
                                        style={styles.petNameInput}
                                        value={petNameInput}
                                        onChangeText={text => { setPetNameInput(text); setPetNameSaved(false); }}
                                        placeholder="Buddy"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        maxLength={16}
                                    />
                                    <TouchableOpacity
                                        style={[styles.petNameSaveBtn, petNameSaved && styles.petNameSaveBtnDone]}
                                        onPress={async () => {
                                            if (selectedProfile) {
                                                await savePetName(selectedProfile.id, petNameInput);
                                                setPetNameSaved(true);
                                            }
                                        }}
                                    >
                                        <Text style={styles.petNameSaveBtnText}>
                                            {petNameSaved ? '✅ Saved!' : 'Save'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1 },
    scroll: { padding: 20, gap: 12 },

    // PIN
    pinContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
    lockEmoji: { fontSize: 64 },
    pinTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
    pinSub: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
    pinInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 20,
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        width: 200,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        letterSpacing: 12,
    },
    pinInputError: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' },
    pinErrorText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
    pinBtn: {
        backgroundColor: '#FFE066',
        paddingHorizontal: 48,
        paddingVertical: 16,
        borderRadius: 50,
        shadowColor: '#FFE066',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    pinBtnDisabled: { opacity: 0.4 },
    pinBtnText: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' },
    pinHint: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 },

    // Dashboard
    dashTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 8 },

    // Profiles
    profilesScroll: { marginHorizontal: -4 },
    profileChip: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        marginHorizontal: 4,
        minWidth: 80,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: 4,
    },
    profileChipActive: { borderColor: '#FFE066', backgroundColor: 'rgba(255,224,102,0.1)' },
    profileAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    profileAvatarText: { fontSize: 20, fontWeight: '900', color: '#fff' },
    profileChipName: { fontSize: 13, fontWeight: '800', color: '#fff' },
    profileChipAge: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

    // Overview
    overviewCard: { borderRadius: 20, overflow: 'hidden' },
    overviewGradient: { padding: 20, gap: 12 },
    overviewRow: { flexDirection: 'row', justifyContent: 'space-around' },
    overviewStat: { alignItems: 'center', gap: 2 },
    overviewNumber: { fontSize: 22, fontWeight: '900', color: '#fff' },
    overviewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

    // Problems
    problemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: 14,
        gap: 12,
    },
    problemLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
    problemAttempts: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    problemBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    problemBar: { width: 80, height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' },
    problemBarFill: { height: '100%', borderRadius: 4 },
    problemPct: { fontSize: 13, fontWeight: '800', color: '#fff', width: 36, textAlign: 'right' },

    // Sessions
    sessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: 14,
        gap: 12,
    },
    sessionDate: { fontSize: 14, fontWeight: '700', color: '#fff' },
    sessionMeta: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    sessionStarsBox: { backgroundColor: 'rgba(255,224,102,0.15)', borderRadius: 10, padding: 8 },
    sessionStars: { fontSize: 15, fontWeight: '800', color: '#FFE066' },

    // Achievements
    achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    achievementBadge: {
        backgroundColor: 'rgba(255,224,102,0.12)',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        gap: 4,
        minWidth: 80,
        borderWidth: 1,
        borderColor: 'rgba(255,224,102,0.25)',
    },
    achievementEmoji: { fontSize: 28 },
    achievementLabel: { fontSize: 11, color: '#FFE066', fontWeight: '700', textAlign: 'center' },

    // Tips
    tipsCard: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    tipText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },

    // Empty
    emptyCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
    },
    emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },

    // Pet naming
    petNameCard: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,224,102,0.2)',
    },
    petNameLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
    petNameRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    petNameInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    petNameSaveBtn: {
        backgroundColor: '#FFE066',
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    petNameSaveBtnDone: { backgroundColor: 'rgba(16,185,129,0.8)' },
    petNameSaveBtnText: { fontSize: 14, fontWeight: '900', color: '#1a1a2e' },
});
