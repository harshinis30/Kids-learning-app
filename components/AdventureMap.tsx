import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { playSound } from '../services/audioService';
import { PetEmotion, subscribeToEmotion } from '../services/petService';
import { ChildProfile } from '../services/profileService';
import { Boss3D } from './Boss3D';
import { PetCompanion } from './PetCompanion';

const { width } = Dimensions.get('window');

interface WorldNode {
    stage: number;
    emoji: string;
    name: string;
    gradientColors: [string, string, string];
    decorEmojis: string;
    starsRequired: number;
    bossEmoji: string;
    bossName: string;
}

const WORLDS: WorldNode[] = [
    {
        stage: 1,
        emoji: '🌋',
        name: 'Volcano Island',
        gradientColors: ['#7f1d1d', '#b45309', '#dc2626'],
        decorEmojis: '🌋🔥🦎🌴🌊',
        starsRequired: 10,
        bossEmoji: '🦎',
        bossName: 'Lava Lizard',
    },
    {
        stage: 2,
        emoji: '🌊',
        name: 'Ocean Deep',
        gradientColors: ['#0c1445', '#0e7490', '#0284c7'],
        decorEmojis: '🌊🐠🦈🐙🐚',
        starsRequired: 15,
        bossEmoji: '🦈',
        bossName: 'Deep Sea Shark',
    },
    {
        stage: 3,
        emoji: '🌲',
        name: 'Enchanted Forest',
        gradientColors: ['#14532d', '#166534', '#15803d'],
        decorEmojis: '🌲🐉🦋🍄🌿',
        starsRequired: 20,
        bossEmoji: '🐉',
        bossName: 'Forest Dragon',
    },
    {
        stage: 4,
        emoji: '🚀',
        name: 'Space Station',
        gradientColors: ['#0f0623', '#3b0764', '#4c1d95'],
        decorEmojis: '🚀👾🌍⭐🛸',
        starsRequired: 0,
        bossEmoji: '👾',
        bossName: 'Space Overlord',
    },
];

interface Props {
    profile: ChildProfile;
    onNavigateToLearn: () => void;
}

type NodeState = 'locked' | 'current' | 'completed';

function getNodeState(worldStage: number, currentStage: number): NodeState {
    if (worldStage < currentStage) return 'completed';
    if (worldStage === currentStage) return 'current';
    return 'locked';
}

export function AdventureMap({ profile, onNavigateToLearn }: Props) {
    const [toast, setToast] = useState('');
    const [showBadge, setShowBadge] = useState<WorldNode | null>(null);
    const [petEmotion, setPetEmotion] = useState<PetEmotion>('idle');
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const lockedScales = useRef(WORLDS.map(() => new Animated.Value(1))).current;

    // Glow pulsing for current node
    const glowAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // Pet emotion subscription
    useEffect(() => {
        const unsub = subscribeToEmotion(setPetEmotion);
        return unsub;
    }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        toastOpacity.setValue(0);
        Animated.sequence([
            Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(2000),
            Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setToast(''));
    };

    const handleLockedTap = (world: WorldNode, idx: number) => {
        Animated.sequence([
            Animated.timing(lockedScales[idx], { toValue: 1.08, duration: 80, useNativeDriver: true }),
            Animated.timing(lockedScales[idx], { toValue: 0.95, duration: 80, useNativeDriver: true }),
            Animated.timing(lockedScales[idx], { toValue: 1.05, duration: 80, useNativeDriver: true }),
            Animated.timing(lockedScales[idx], { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();
        const starsNeeded = world.starsRequired - profile.totalStars;
        showToast(`🔒 Need ${starsNeeded > 0 ? starsNeeded : world.starsRequired} more stars!`);
        playSound('STARS'); // Using STARS as a feedback sound for interaction
    };

    return (
        <View style={styles.container}>
            {/* Pet in top-right corner */}
            <View style={styles.petCorner}>
                <PetCompanion
                    totalStars={profile.totalStars}
                    profileId={profile.id}
                    emotion={petEmotion}
                    size="small"
                />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>🗺️ Sound Explorer Map</Text>
                    <Text style={styles.headerSub}>
                        {profile.name}'s Adventure · ⭐ {profile.totalStars} stars
                    </Text>
                </View>

                {/* Story intro */}
                <View style={styles.storyBanner}>
                    <Text style={styles.storyText}>
                        ✨ You are a SOUND EXPLORER! Travel magical worlds,{'\n'}
                        collect Sound Crystals, and defeat Guardian Bosses! 💎
                    </Text>
                </View>

                {/* World nodes — reversed so Stage 4 is at top */}
                {[...WORLDS].reverse().map((world, revIdx) => {
                    const idx = WORLDS.length - 1 - revIdx;
                    const state = getNodeState(world.stage, profile.currentStage);
                    const isCurrent = state === 'current';
                    const isCompleted = state === 'completed';
                    const isLocked = state === 'locked';

                    return (
                        <View key={world.stage} style={styles.nodeWrapper}>
                            {/* Connecting path (skip for last, i.e. Stage 1 at bottom) */}
                            {revIdx < WORLDS.length - 1 && (
                                <View style={[
                                    styles.pathLine,
                                    isCompleted || isCurrent ? styles.pathLineUnlocked : styles.pathLineLocked,
                                ]} />
                            )}

                            <Animated.View style={{ transform: [{ scale: isCurrent ? glowAnim : lockedScales[idx] }] }}>
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        if (isCurrent) onNavigateToLearn();
                                        else if (isCompleted) {
                                            setShowBadge(world);
                                            playSound('VICTORY');
                                        }
                                        else handleLockedTap(world, idx);
                                    }}
                                >
                                    <LinearGradient
                                        colors={isLocked
                                            ? ['#1e1e2e', '#2a2a3e', '#1e1e2e']
                                            : world.gradientColors
                                        }
                                        style={[
                                            styles.worldNode,
                                            isCurrent && styles.worldNodeCurrent,
                                            isCompleted && styles.worldNodeCompleted,
                                            isLocked && styles.worldNodeLocked,
                                        ]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        {/* Status badge */}
                                        <View style={styles.nodeBadgeRow}>
                                            <View style={[
                                                styles.statusPill,
                                                isCurrent && styles.statusPillCurrent,
                                                isCompleted && styles.statusPillCompleted,
                                                isLocked && styles.statusPillLocked,
                                            ]}>
                                                <Text style={styles.statusPillText}>
                                                    {isLocked ? '🔒 LOCKED' : isCompleted ? '✅ COMPLETED' : '📍 YOU ARE HERE'}
                                                </Text>
                                            </View>
                                            {/* Stars info */}
                                            <View style={styles.starsChip}>
                                                <Text style={styles.starsChipText}>
                                                    {isLocked
                                                        ? `Needs ${world.starsRequired} ⭐`
                                                        : `⭐ ${profile.totalStars}`
                                                    }
                                                </Text>
                                            </View>
                                        </View>

                                        {/* World display: 3D boss thumbnail or lock */}
                                        <View style={styles.worldMain}>
                                            {isLocked ? (
                                                <Text style={styles.lockedEmoji}>🔒</Text>
                                            ) : (
                                                <View style={styles.bossMiniContainer}>
                                                    <Boss3D
                                                        stage={world.stage}
                                                        phase="idle"
                                                        width={90}
                                                        height={90}
                                                    />
                                                </View>
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.worldName, isLocked && styles.lockedText]}>
                                                    {world.name}
                                                </Text>
                                                <Text style={[styles.worldDecor, isLocked && styles.lockedText]}>
                                                    {isLocked ? '????? unlock to reveal ?????' : world.decorEmojis}
                                                </Text>
                                                <Text style={[styles.bossTeaser, isLocked && styles.lockedText]}>
                                                    {isLocked ? '' : `⚔️ Boss: ${world.bossName}`}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* CTA for current */}
                                        {isCurrent && (
                                            <View style={styles.ctaRow}>
                                                <Text style={styles.ctaText}>Tap to Start Learning! 🎓</Text>
                                            </View>
                                        )}
                                        {isCompleted && (
                                            <View style={styles.completedRow}>
                                                <Text style={styles.completedText}>💎 Crystal Collected! Tap for badge →</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    );
                })}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Toast */}
            {toast !== '' && (
                <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
                    <Text style={styles.toastText}>{toast}</Text>
                </Animated.View>
            )}

            {/* Completion Badge Modal */}
            <Modal visible={showBadge !== null} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    {showBadge && (
                        <LinearGradient
                            colors={showBadge.gradientColors}
                            style={styles.badgeCard}
                        >
                            <Text style={styles.badgeEmoji}>{showBadge.emoji}</Text>
                            <Text style={styles.badgeTitle}>🏆 World Cleared!</Text>
                            <Text style={styles.badgeName}>{showBadge.name}</Text>
                            <Text style={styles.badgeCrystal}>💎 Sound Crystal Earned</Text>
                            <Text style={styles.badgeDecor}>{showBadge.decorEmojis}</Text>
                            <Text style={styles.badgeBoss}>
                                ⚔️ Defeated: {showBadge.bossEmoji} {showBadge.bossName}
                            </Text>
                            <TouchableOpacity style={styles.badgeClose} onPress={() => setShowBadge(null)}>
                                <Text style={styles.badgeCloseText}>Close</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 20, paddingTop: 80, gap: 0 },

    // Pet corner
    petCorner: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },

    // Header
    header: { alignItems: 'center', marginBottom: 12 },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#FFE066' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

    // Story banner
    storyBanner: {
        backgroundColor: 'rgba(255,224,102,0.1)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,224,102,0.25)',
        marginBottom: 20,
    },
    storyText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '600',
    },

    // Node wrapper
    nodeWrapper: { alignItems: 'center', gap: 0 },

    // Path line
    pathLine: {
        width: 4,
        height: 28,
        borderRadius: 2,
        marginBottom: 0,
    },
    pathLineUnlocked: { backgroundColor: '#FFE066' },
    pathLineLocked: { backgroundColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed' },

    // World node
    worldNode: {
        width: width - 40,
        borderRadius: 24,
        padding: 18,
        gap: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.15)',
        marginBottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    worldNodeCurrent: {
        borderColor: '#FFE066',
        borderWidth: 3,
        shadowColor: '#FFE066',
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    worldNodeCompleted: { borderColor: 'rgba(74,222,128,0.5)' },
    worldNodeLocked: { opacity: 0.6 },

    // Badge row
    nodeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusPill: {
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusPillCurrent: { backgroundColor: '#FFE066' },
    statusPillCompleted: { backgroundColor: 'rgba(74,222,128,0.25)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.5)' },
    statusPillLocked: { backgroundColor: 'rgba(255,255,255,0.1)' },
    statusPillText: { fontSize: 11, fontWeight: '800', color: '#1a1a2e' },
    starsChip: {
        marginLeft: 'auto',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    starsChipText: { fontSize: 12, fontWeight: '700', color: '#FFE066' },

    // World main
    worldMain: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    bossMiniContainer: {
        width: 90,
        height: 90,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    lockedEmoji: { fontSize: 48, opacity: 0.5, width: 90, textAlign: 'center' },
    worldName: { fontSize: 20, fontWeight: '900', color: '#fff' },
    worldDecor: { fontSize: 18, marginTop: 4 },
    bossTeaser: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '600' },
    lockedText: { color: 'rgba(255,255,255,0.3)' },

    // CTA / completed rows
    ctaRow: {
        backgroundColor: 'rgba(255,224,102,0.2)',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,224,102,0.4)',
    },
    ctaText: { fontSize: 15, fontWeight: '800', color: '#FFE066' },
    completedRow: { alignItems: 'center' },
    completedText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

    // Toast
    toast: {
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,224,102,0.4)',
    },
    toastText: { fontSize: 16, fontWeight: '800', color: '#FFE066' },

    // Badge modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    badgeCard: {
        width: '100%',
        borderRadius: 28,
        padding: 32,
        alignItems: 'center',
        gap: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,224,102,0.4)',
    },
    badgeEmoji: { fontSize: 80 },
    badgeTitle: { fontSize: 28, fontWeight: '900', color: '#FFE066' },
    badgeName: { fontSize: 20, fontWeight: '800', color: '#fff' },
    badgeCrystal: { fontSize: 18, fontWeight: '700', color: '#4ADE80' },
    badgeDecor: { fontSize: 28, letterSpacing: 4 },
    badgeBoss: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    badgeClose: {
        marginTop: 8,
        backgroundColor: '#FFE066',
        borderRadius: 50,
        paddingHorizontal: 40,
        paddingVertical: 14,
    },
    badgeCloseText: { fontSize: 16, fontWeight: '900', color: '#1a1a2e' },
});
