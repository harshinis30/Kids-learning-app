/**
 * WritingLevelHub.tsx — "Milo's Writing Adventure" Level Map
 *
 * A fun, engaging level selection screen designed for 2-3 year olds:
 *  • Very large, colorful, animated level bubbles
 *  • Fun animal character (Milo the monkey 🐒) as guide
 *  • A winding path connecting levels
 *  • Stars to show completion
 *  • Bright colors, big touch targets, minimal text
 *  • Locked/unlocked states with visual cues
 *  • Celebration animations on level completion
 *
 * Levels (Stages):
 *  Level 1 — "Help Milo Move!"    (Basic strokes)
 *  Level 2 — "Build Milo's World" (Shape strokes)
 *  Level 3 — "Find the Letters"   (Letter recognition)
 *  Level 4 — "Write Like Milo!"   (Alphabet tracing)
 */

import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ── Level Configuration ──────────────────────────────────────────────────────

interface LevelConfig {
    id: number;
    title: string;
    subtitle: string;
    emoji: string;
    color: string;
    glowColor: string;
    route: string;
    stars: number; // 0-3 earned
    unlocked: boolean;
    bgEmoji: string; // floating background emoji
}

// ── Persistent progress (AsyncStorage + in-memory cache) ────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_KEY = 'writing_progress';

// In-memory cache that stays in sync with AsyncStorage
const _cache = {
    completedLevels: new Set<number>(),
    levelStars: {} as Record<number, number>,
    loaded: false,
};

// Event listeners for UI updates
const _listeners = new Set<() => void>();

// Load from AsyncStorage on startup
(async () => {
    try {
        const raw = await AsyncStorage.getItem(PROGRESS_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.completedLevels) {
                data.completedLevels.forEach((id: number) => _cache.completedLevels.add(id));
            }
            if (data.levelStars) {
                Object.assign(_cache.levelStars, data.levelStars);
            }
            // Trigger initial UI update after load
            _listeners.forEach(l => l());
        }
    } catch (e) {
        console.warn('[WritingProgress] Failed to load:', e);
    }
    _cache.loaded = true;
})();

// Persist to AsyncStorage
function _persist() {
    const data = {
        completedLevels: Array.from(_cache.completedLevels),
        levelStars: _cache.levelStars,
    };
    AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(data)).catch((e) =>
        console.warn('[WritingProgress] Failed to save:', e),
    );
}

export const writingProgress = {
    subscribe(listener: () => void) {
        _listeners.add(listener);
        return () => _listeners.delete(listener);
    },
    notify() {
        _listeners.forEach(l => l());
    },
    markComplete(levelId: number, stars: number = 3) {
        _cache.completedLevels.add(levelId);
        _cache.levelStars[levelId] = Math.max(_cache.levelStars[levelId] || 0, stars);
        _persist();
        this.notify();
    },
    isComplete(levelId: number) {
        return _cache.completedLevels.has(levelId);
    },
    getStars(levelId: number) {
        return _cache.levelStars[levelId] || 0;
    },
    isUnlocked(levelId: number) {
        if (levelId === 1) return true;
        return _cache.completedLevels.has(levelId - 1);
    },
};

/**
 * Hook for stages to safely mark level completion from useEffect.
 * Usage:  useWritingCompletion(isComplete, levelId, stars);
 * Call this unconditionally at the top of your component.
 */
export function useWritingCompletion(trigger: boolean, levelId: number, stars: number = 3) {
    const hasMarked = useRef(false);
    useEffect(() => {
        if (trigger && !hasMarked.current) {
            writingProgress.markComplete(levelId, stars);
            hasMarked.current = true;
        }
    }, [trigger, levelId, stars]);
}

// ── Floating Emoji Bubble ────────────────────────────────────────────────────

function FloatingEmoji({ emoji, delay, x, size }: { emoji: string; delay: number; x: number; size: number }) {
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: -20,
                        duration: 2500,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.7,
                        duration: 2500,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: 0,
                        duration: 2500,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.3,
                        duration: 2500,
                        useNativeDriver: true,
                    }),
                ]),
            ]),
        );
        anim.start();
        return () => anim.stop();
    }, []);

    return (
        <Animated.Text
            style={{
                position: 'absolute',
                left: x,
                top: H * 0.05,
                fontSize: size,
                opacity,
                transform: [{ translateY }],
            }}
        >
            {emoji}
        </Animated.Text>
    );
}

// ── Pulsing Level Button ─────────────────────────────────────────────────────

function LevelButton({
    level,
    onPress,
    index,
}: {
    level: LevelConfig;
    onPress: () => void;
    index: number;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const lockShakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (level.unlocked) {
            // Gentle pulse for unlocked levels
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.08,
                        duration: 1200,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 1200,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ]),
            );
            pulse.start();

            // Glow animation
            const glow = Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 1800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0,
                        duration: 1800,
                        useNativeDriver: true,
                    }),
                ]),
            );
            glow.start();

            return () => {
                pulse.stop();
                glow.stop();
            };
        }
    }, [level.unlocked]);

    // Entry bounce animation
    useEffect(() => {
        Animated.spring(bounceAnim, {
            toValue: 1,
            delay: index * 200,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePress = () => {
        if (!level.unlocked) {
            // Shake for locked levels
            Animated.sequence([
                Animated.timing(lockShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(lockShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(lockShakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
                Animated.timing(lockShakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
                Animated.timing(lockShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();
            return;
        }
        onPress();
    };

    const isComplete = level.stars > 0;

    // Position levels in a winding path layout
    const positions = [
        { left: W * 0.12, top: H * 0.58 },  // Level 1 — bottom left
        { left: W * 0.52, top: H * 0.45 },  // Level 2 — middle right
        { left: W * 0.08, top: H * 0.30 },  // Level 3 — upper left
        { left: W * 0.50, top: H * 0.16 },  // Level 4 — top right
    ];

    const pos = positions[index] || { left: W * 0.3, top: H * 0.5 };

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.levelContainer,
                {
                    left: pos.left,
                    top: pos.top,
                    transform: [
                        { scale: Animated.multiply(scaleAnim, bounceAnim) },
                        { translateX: lockShakeAnim },
                    ],
                },
            ]}
        >
            {/* Outer glow ring for unlocked levels */}
            {level.unlocked && (
                <Animated.View
                    style={[
                        styles.glowRing,
                        {
                            backgroundColor: level.glowColor,
                            opacity: glowOpacity,
                        },
                    ]}
                />
            )}

            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.7}
                style={[
                    styles.levelButton,
                    {
                        backgroundColor: level.unlocked ? level.color : '#3a3a5a',
                        borderColor: level.unlocked
                            ? isComplete
                                ? '#FFD700'
                                : 'rgba(255,255,255,0.4)'
                            : 'rgba(255,255,255,0.15)',
                        borderWidth: isComplete ? 4 : 2,
                    },
                ]}
            >
                {/* Level emoji */}
                <Text style={styles.levelEmoji}>
                    {level.unlocked ? level.emoji : '🔒'}
                </Text>

                {/* Level number */}
                <View
                    style={[
                        styles.levelNumberBadge,
                        { backgroundColor: level.unlocked ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)' },
                    ]}
                >
                    <Text style={styles.levelNumber}>{level.id}</Text>
                </View>
            </TouchableOpacity>

            {/* Level title below */}
            <Text
                style={[
                    styles.levelTitle,
                    { color: level.unlocked ? '#fff' : 'rgba(255,255,255,0.35)' },
                ]}
                numberOfLines={2}
            >
                {level.title}
            </Text>

            {/* Stars */}
            {level.unlocked && (
                <View style={styles.starsRow}>
                    {[1, 2, 3].map((s) => (
                        <Text
                            key={s}
                            style={[
                                styles.star,
                                { opacity: s <= level.stars ? 1 : 0.25 },
                            ]}
                        >
                            ⭐
                        </Text>
                    ))}
                </View>
            )}

            {/* "NEW!" badge for the next unlocked level */}
            {level.unlocked && !isComplete && (
                <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>TAP!</Text>
                </View>
            )}
        </Animated.View>
    );
}

// ── Road Connector between levels ───────────────────────────────────────────

function RoadConnector({ fromIdx, toIdx, unlocked }: { fromIdx: number; toIdx: number; unlocked: boolean }) {
    // Level center positions: container left + half container width (W*0.175) for X
    // container top + half button height (45px) for Y
    const positions = [
        { x: W * 0.12 + W * 0.175, y: H * 0.58 + 45 },
        { x: W * 0.52 + W * 0.175, y: H * 0.45 + 45 },
        { x: W * 0.08 + W * 0.175, y: H * 0.30 + 45 },
        { x: W * 0.50 + W * 0.175, y: H * 0.16 + 45 },
    ];

    const from = positions[fromIdx];
    const to = positions[toIdx];

    if (!from || !to) return null;

    // Quadratic bezier control point (slight curve for visual interest)
    const curveOffset = fromIdx % 2 === 0 ? 40 : -40;
    const cpX = (from.x + to.x) / 2 + curveOffset;
    const cpY = (from.y + to.y) / 2;

    const pathD = `M ${from.x} ${from.y} Q ${cpX} ${cpY} ${to.x} ${to.y}`;

    const roadColor = unlocked ? '#C8A96E' : 'rgba(150,150,170,0.35)';
    const lineColor = unlocked ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)';
    const gradId = `road-grad-${fromIdx}-${toIdx}`;

    return (
        // pointerEvents="none" so level icons remain fully tappable
        <Svg
            width={W}
            height={H}
            style={[StyleSheet.absoluteFill, { zIndex: 0 } as any]}
            pointerEvents="none"
        >
            <Defs>
                <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={unlocked ? '#B8860B' : '#555566'} stopOpacity="0.6" />
                    <Stop offset="0.5" stopColor={unlocked ? '#D4A843' : '#6A6A7A'} stopOpacity="0.9" />
                    <Stop offset="1" stopColor={unlocked ? '#B8860B' : '#555566'} stopOpacity="0.6" />
                </LinearGradient>
            </Defs>
            {/* Road base — wide warm tan strip */}
            <Path
                d={pathD}
                stroke={roadColor}
                strokeWidth={20}
                strokeLinecap="round"
                fill="none"
                opacity={unlocked ? 0.85 : 0.35}
            />
            {/* Road edge shadow — gives depth */}
            <Path
                d={pathD}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth={24}
                strokeLinecap="round"
                fill="none"
                opacity={0.4}
            />
            {/* Road surface (lighter centre) */}
            <Path
                d={pathD}
                stroke={unlocked ? '#E8C97A' : 'rgba(180,180,200,0.4)'}
                strokeWidth={12}
                strokeLinecap="round"
                fill="none"
                opacity={unlocked ? 0.9 : 0.3}
            />
            {/* Dashed centre-line */}
            <Path
                d={pathD}
                stroke={lineColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray="10,14"
                fill="none"
            />
        </Svg>
    );
}

// ── Milo Character on the Map ────────────────────────────────────────────────

function MiloOnMap({ currentLevel }: { currentLevel: number }) {
    const positions = [
        { x: W * 0.12 + W * 0.175 + 52, y: H * 0.58 - 10 },
        { x: W * 0.52 + W * 0.175 + 52, y: H * 0.45 - 10 },
        { x: W * 0.08 + W * 0.175 + 52, y: H * 0.30 - 10 },
        { x: W * 0.50 + W * 0.175 + 52, y: H * 0.16 - 10 },
    ];

    const pos = positions[Math.min(currentLevel, positions.length - 1)];
    const bounceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const bounce = Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, {
                    toValue: -12,
                    duration: 600,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(bounceAnim, {
                    toValue: 0,
                    duration: 600,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
        );
        bounce.start();
        return () => bounce.stop();
    }, []);

    return (
        <Animated.View
            style={[
                styles.miloMap,
                {
                    left: pos.x,
                    top: pos.y,
                    transform: [{ translateY: bounceAnim }],
                },
            ]}
        >
            <Text style={styles.miloMapEmoji}>🐒</Text>
            <View style={styles.speechBubble}>
                <Text style={styles.speechText}>Let's go! 🎉</Text>
            </View>
        </Animated.View>
    );
}

// ── Main Hub Component ───────────────────────────────────────────────────────

export default function WritingLevelHub() {
    const [, setForceUpdate] = useState(0);

    const updateUI = useCallback(() => {
        setForceUpdate((k) => k + 1);
    }, []);

    // Instantly refresh when the screen is focused (handles returning via "Back")
    useFocusEffect(updateUI);

    // Subscribe to completions that happen while screen is mounted
    useEffect(() => {
        const unsubscribe = writingProgress.subscribe(updateUI);

        // Polling fallback to ensure map paints initially even if AsyncStorage is slow
        const interval = setInterval(updateUI, 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [updateUI]);

    // Find the current level (first uncompleted unlocked level)
    const currentLevel = (() => {
        for (let i = 1; i <= 4; i++) {
            if (!writingProgress.isComplete(i)) return i;
        }
        return 4; // All complete
    })();

    const levels: LevelConfig[] = [
        {
            id: 1,
            title: 'Help Milo\nMove!',
            subtitle: 'Draw lines & curves',
            emoji: '🐒',
            color: '#4ECDC4',
            glowColor: 'rgba(78,205,196,0.4)',
            route: '/writing-stage1',
            stars: writingProgress.getStars(1),
            unlocked: writingProgress.isUnlocked(1),
            bgEmoji: '🌳',
        },
        {
            id: 2,
            title: "Build Milo's\nWorld!",
            subtitle: 'Draw shapes',
            emoji: '🏗️',
            color: '#FF6B6B',
            glowColor: 'rgba(255,107,107,0.4)',
            route: '/writing-stage2',
            stars: writingProgress.getStars(2),
            unlocked: writingProgress.isUnlocked(2),
            bgEmoji: '🌈',
        },
        {
            id: 3,
            title: 'Find the\nLetters!',
            subtitle: 'Letter hunt',
            emoji: '🔤',
            color: '#A29BFE',
            glowColor: 'rgba(162,155,254,0.4)',
            route: '/writing-stage3',
            stars: writingProgress.getStars(3),
            unlocked: writingProgress.isUnlocked(3),
            bgEmoji: '✨',
        },
        {
            id: 4,
            title: 'Write Like\nMilo!',
            subtitle: 'Trace letters',
            emoji: '✍️',
            color: '#FFE066',
            glowColor: 'rgba(255,224,102,0.4)',
            route: '/writing-stage4',
            stars: writingProgress.getStars(4),
            unlocked: writingProgress.isUnlocked(4),
            bgEmoji: '📝',
        },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                {/* Background floating emojis */}
                <FloatingEmoji emoji="🌟" delay={0} x={W * 0.8} size={28} />
                <FloatingEmoji emoji="🦋" delay={800} x={W * 0.15} size={24} />
                <FloatingEmoji emoji="🌸" delay={400} x={W * 0.65} size={22} />
                <FloatingEmoji emoji="☁️" delay={1200} x={W * 0.35} size={30} />
                <FloatingEmoji emoji="🎈" delay={600} x={W * 0.88} size={26} />

                {/* Title banner */}
                <View style={styles.titleBanner}>
                    <Text style={styles.titleEmoji}>✏️</Text>
                    <View>
                        <Text style={styles.title}>Milo's Writing</Text>
                        <Text style={styles.titleSub}>Adventure!</Text>
                    </View>
                    <Text style={styles.titleEmoji}>📝</Text>
                </View>

                {/* Progress indicator */}
                <View style={styles.progressBar}>
                    {[1, 2, 3, 4].map((lvl) => (
                        <View
                            key={lvl}
                            style={[
                                styles.progressSegment,
                                {
                                    backgroundColor: writingProgress.isComplete(lvl)
                                        ? '#4CD964'
                                        : writingProgress.isUnlocked(lvl)
                                            ? 'rgba(255,224,102,0.5)'
                                            : 'rgba(255,255,255,0.12)',
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* Map area */}
                <View style={styles.mapArea}>
                    {/* Road connectors — z-index 0 so they render beneath level nodes */}
                    <RoadConnector fromIdx={0} toIdx={1} unlocked={writingProgress.isUnlocked(2)} />
                    <RoadConnector fromIdx={1} toIdx={2} unlocked={writingProgress.isUnlocked(3)} />
                    <RoadConnector fromIdx={2} toIdx={3} unlocked={writingProgress.isUnlocked(4)} />

                    {/* Level buttons — zIndex 1 so they float above roads */}
                    {levels.map((level, i) => (
                        <LevelButton
                            key={level.id}
                            level={level}
                            index={i}
                            onPress={() => router.push(level.route as any)}
                        />
                    ))}

                    {/* Milo character on the map */}
                    <MiloOnMap currentLevel={currentLevel - 1} />
                </View>

                {/* Bottom encouragement */}
                <View style={styles.bottomBanner}>
                    <Text style={styles.encourageText}>
                        {(() => {
                            const completedCount = [1, 2, 3, 4].filter(id => writingProgress.isComplete(id)).length;
                            if (completedCount === 0) return '👆 Tap Level 1 to start!';
                            if (completedCount >= 4) return '🏆 You finished all levels! Amazing!';
                            return `🌟 ${completedCount}/4 levels complete!`;
                        })()}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#0f1b3d',
    },
    container: {
        flex: 1,
        backgroundColor: '#0f1b3d',
    },

    // Title
    titleBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
        paddingBottom: 8,
        gap: 10,
    },
    titleEmoji: {
        fontSize: 36,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFE066',
        textAlign: 'center',
        letterSpacing: 1,
        textShadowColor: 'rgba(255,224,102,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    titleSub: {
        fontSize: 22,
        fontWeight: '800',
        color: '#4ECDC4',
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    // Progress bar
    progressBar: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 40,
        marginTop: 10,
        marginBottom: 6,
    },
    progressSegment: {
        flex: 1,
        height: 8,
        borderRadius: 4,
    },

    // Map area
    mapArea: {
        flex: 1,
        position: 'relative',
    },

    // Path dots — kept in case needed elsewhere but no longer rendered as road
    pathDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
    },

    // Level container (positioned absolutely, above the road layer)
    levelContainer: {
        position: 'absolute',
        alignItems: 'center',
        width: W * 0.35,
        zIndex: 1,
    },

    // Glow ring behind level button
    glowRing: {
        position: 'absolute',
        width: 108,
        height: 108,
        borderRadius: 54,
        top: -9,
        left: (W * 0.35 - 108) / 2,
    },

    // Level button
    levelButton: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
    },
    levelEmoji: {
        fontSize: 38,
    },
    levelNumberBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelNumber: {
        fontSize: 15,
        fontWeight: '900',
        color: '#fff',
    },

    // Level title
    levelTitle: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 17,
    },

    // Stars
    starsRow: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 4,
    },
    star: {
        fontSize: 16,
    },

    // NEW badge
    newBadge: {
        position: 'absolute',
        top: -8,
        right: (W * 0.35 - 90) / 2 - 8,
        backgroundColor: '#FF6B6B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 8,
    },
    newBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
    },

    // Milo on map
    miloMap: {
        position: 'absolute',
        alignItems: 'center',
    },
    miloMapEmoji: {
        fontSize: 40,
    },
    speechBubble: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        marginTop: -4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    speechText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1a1a2e',
    },

    // Bottom
    bottomBanner: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    encourageText: {
        fontSize: 16,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
    },
});
