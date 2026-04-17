import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { ttsService } from '../services/textToSpeech';

// ── Score → Category ────────────────────────────────────────────────────────
function getCategory(score: number): { label: string; emoji: string; color: string; bg: string } {
    if (score >= 80) return { label: 'Great!',      emoji: '🌟', color: '#15803D', bg: '#DCFCE7' };
    if (score >= 60) return { label: 'Almost!',     emoji: '👍', color: '#B45309', bg: '#FEF3C7' };
    return             { label: 'Try Again',         emoji: '💪', color: '#B91C1C', bg: '#FEE2E2' };
}

// ── Metric Row ───────────────────────────────────────────────────────────────
function MetricBar({ label, icon, score }: { label: string; icon: string; score: number }) {
    const cat = getCategory(score);
    const fillAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fillAnim, {
            toValue: Math.min(100, Math.max(0, score)),
            duration: 600,
            useNativeDriver: false,
        }).start();
    }, [score]);

    const fillWidth = fillAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

    return (
        <View style={[styles.metricCard, { backgroundColor: cat.bg }]}>
            <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>{icon}</Text>
                <Text style={[styles.metricLabel, { color: cat.color }]}>{label}</Text>
                <View style={styles.metricBadge}>
                    <Text style={[styles.metricBadgeText, { color: cat.color }]}>{cat.emoji} {cat.label}</Text>
                </View>
            </View>
            <View style={styles.metricTrack}>
                <Animated.View style={[styles.metricFill, { width: fillWidth, backgroundColor: cat.color }]} />
            </View>
        </View>
    );
}

// ── Mouth hints ───────────────────────────────────────────────────────────────
const MOUTH_HINTS: Record<string, string> = {
    'θ': '👄 Put your tongue between your teeth!',
    'ð': '👄 Tongue between teeth & use voice!',
    'ʃ': '👄 Round your lips and blow air!',
    'f': '👄 Top teeth on bottom lip!',
    'v': '👄 Top teeth on bottom lip & use voice!',
    'r': '👄 Pull your tongue back!',
    'l': '👄 Tongue up behind top teeth!',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface FeedbackDisplayProps {
    isCorrect: boolean | null;
    accuracy: number;
    message: string;
    visible: boolean;
    phonemes?: { phoneme: string; accuracyScore: number }[];
    targetWord?: string;
    fluency?: number;
    completeness?: number;
    prosody?: number;
}

// ── Main Component ────────────────────────────────────────────────────────────
export function FeedbackDisplay({
    isCorrect,
    accuracy,
    message,
    visible,
    phonemes,
    fluency,
    completeness,
    prosody,
}: FeedbackDisplayProps) {
    const slideAnim  = useRef(new Animated.Value(40)).current;
    const fadeAnim   = useRef(new Animated.Value(0)).current;
    const emojiScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
                Animated.sequence([
                    Animated.delay(120),
                    Animated.spring(emojiScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
                ]),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(40);
            emojiScale.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    // Header colour
    const headerBg   = isCorrect === true  ? '#7C3AED'   // purple for success
                     : isCorrect === false && accuracy >= 60 ? '#EA580C'  // orange for almost
                     : '#1E3A5F';                                         // deep blue for try again

    const mainEmoji  = isCorrect === true  ? '🎉'
                     : accuracy >= 60      ? '👍'
                     :                       '💪';

    // Worst phoneme hint
    let hintText: string | null = null;
    if (phonemes && phonemes.length > 0 && isCorrect === false) {
        const worst = phonemes.reduce((a, b) => b.accuracyScore < a.accuracyScore ? b : a, phonemes[0]);
        if (worst.accuracyScore < 60 && MOUTH_HINTS[worst.phoneme]) {
            hintText = MOUTH_HINTS[worst.phoneme];
        }
    }

    const hasMetrics = fluency !== undefined || completeness !== undefined || prosody !== undefined;

    return (
        <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* ── Header banner ─────────────────────────────────────────── */}
            <View style={[styles.header, { backgroundColor: headerBg }]}>
                <Animated.Text style={[styles.headerEmoji, { transform: [{ scale: emojiScale }] }]}>
                    {mainEmoji}
                </Animated.Text>
                <Text style={styles.headerMessage} numberOfLines={2}>{message}</Text>
                {accuracy > 0 && (
                    <View style={styles.scorePill}>
                        <Text style={styles.scorePillText}>{Math.round(accuracy)}%</Text>
                    </View>
                )}
            </View>

            {/* ── Body ──────────────────────────────────────────────────── */}
            <View style={styles.body}>

                {/* Phoneme chips */}
                {phonemes && phonemes.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sounds</Text>
                        <View style={styles.chipsRow}>
                            {phonemes.map((p, i) => {
                                const col = p.accuracyScore >= 80 ? '#15803D'
                                          : p.accuracyScore >= 60 ? '#B45309'
                                          : '#B91C1C';
                                const bg  = p.accuracyScore >= 80 ? '#DCFCE7'
                                          : p.accuracyScore >= 60 ? '#FEF3C7'
                                          : '#FEE2E2';
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.chip, { backgroundColor: bg, borderColor: col }]}
                                        onPress={() => ttsService.speak(p.phoneme, { rate: 0.4 })}
                                    >
                                        <Text style={[styles.chipText, { color: col }]}>{p.phoneme}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Mouth hint */}
                {hintText && (
                    <View style={styles.hintBanner}>
                        <Text style={styles.hintText}>{hintText}</Text>
                    </View>
                )}

                {/* Metric bars */}
                {hasMetrics && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>How you did</Text>
                        {completeness !== undefined && <MetricBar label="Completeness" icon="🎯" score={completeness} />}
                        {fluency      !== undefined && <MetricBar label="Fluency"      icon="🌊" score={fluency}      />}
                        {prosody      !== undefined && <MetricBar label="Prosody"      icon="🎵" score={prosody}      />}
                    </View>
                )}

            </View>
        </Animated.View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: 16,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },

    /* Header */
    header: {
        paddingVertical: 18,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerEmoji: {
        fontSize: 44,
    },
    headerMessage: {
        flex: 1,
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 24,
    },
    scorePill: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    scorePillText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
    },

    /* Body */
    body: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        gap: 14,
    },
    section: {
        gap: 8,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },

    /* Phoneme chips */
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    chipText: {
        fontSize: 16,
        fontWeight: '900',
    },

    /* Hint */
    hintBanner: {
        backgroundColor: '#EFF6FF',
        borderRadius: 14,
        padding: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    hintText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E40AF',
    },

    /* Metric cards */
    metricCard: {
        borderRadius: 14,
        padding: 12,
        gap: 8,
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metricIcon: {
        fontSize: 18,
    },
    metricLabel: {
        fontSize: 14,
        fontWeight: '800',
        flex: 1,
    },
    metricBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    metricBadgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    metricTrack: {
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    metricFill: {
        height: '100%',
        borderRadius: 4,
    },
});