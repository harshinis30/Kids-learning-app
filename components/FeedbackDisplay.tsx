import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ttsService } from '../services/textToSpeech';

const MOUTH_HINTS: Record<string, string> = {
    'θ': '👄 Put your tongue between your teeth!',
    'ð': '👄 Tongue between teeth & use voice!',
    'ʃ': '👄 Round your lips and blow air!',
    'f': '👄 Top teeth on bottom lip!',
    'v': '👄 Top teeth on bottom lip & use voice!',
    'r': '👄 Pull your tongue back!',
    'l': '👄 Tongue up behind top teeth!',
};

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

export function FeedbackDisplay({
    isCorrect,
    accuracy,
    message,
    visible,
    phonemes,
    targetWord,
    fluency,
    completeness,
    prosody
}: FeedbackDisplayProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const emojiScale = useRef(new Animated.Value(0)).current;
    const confettiAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Main card animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            // Emoji pop animation
            Animated.sequence([
                Animated.delay(200),
                Animated.spring(emojiScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            // Confetti animation for success
            if (isCorrect) {
                Animated.sequence([
                    Animated.delay(300),
                    Animated.timing(confettiAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.5);
            emojiScale.setValue(0);
            confettiAnim.setValue(0);
        }
    }, [visible, isCorrect]);

    if (!visible) return null;

    const getEmoji = () => {
        if (isCorrect === null) return '🤔';
        if (isCorrect) return '🎉';
        if (accuracy >= 60) return '👍';
        return '💪';
    };

    const getGradientColors = (): [string, string] => {
        if (isCorrect === null) return ['#94A3B8', '#64748B'];
        if (isCorrect) return ['#10B981', '#059669'];
        if (accuracy >= 60) return ['#F59E0B', '#D97706'];
        return ['#EF4444', '#DC2626'];
    };

    const confettiOpacity = confettiAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1, 0],
    });

    const confettiTranslate = confettiAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -100],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <LinearGradient
                colors={getGradientColors()}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Confetti effect */}
                {isCorrect && (
                    <Animated.View
                        style={[
                            styles.confettiContainer,
                            {
                                opacity: confettiOpacity,
                                transform: [{ translateY: confettiTranslate }],
                            },
                        ]}
                    >
                        <Text style={styles.confetti}>🎊</Text>
                        <Text style={styles.confetti}>✨</Text>
                        <Text style={styles.confetti}>⭐</Text>
                        <Text style={styles.confetti}>🌟</Text>
                        <Text style={styles.confetti}>💫</Text>
                    </Animated.View>
                )}

                {/* Emoji */}
                <Animated.Text
                    style={[
                        styles.emoji,
                        {
                            transform: [{ scale: emojiScale }],
                        },
                    ]}
                >
                    {getEmoji()}
                </Animated.Text>

                {/* Message */}
                <Text style={styles.message}>{message}</Text>

                {/* Phoneme Highlights */}
                {phonemes && phonemes.length > 0 && isCorrect === false && (
                    <View style={styles.phonemesContainer}>
                        {phonemes.map((p, idx) => {
                            const color = p.accuracyScore >= 80 ? '#10B981' : p.accuracyScore >= 60 ? '#F59E0B' : '#EF4444';
                            return (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[styles.phonemeBox, { borderColor: color, backgroundColor: 'rgba(255,255,255,0.9)' }]}
                                    onPress={() => ttsService.speak(p.phoneme, {rate: 0.4})}
                                >
                                    <Text style={[styles.phonemeText, { color }]}>{p.phoneme}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Mouth Articulation Hints */}
                {phonemes && isCorrect === false && (() => {
                    const worst = phonemes.reduce((prev, curr) => curr.accuracyScore < prev.accuracyScore ? curr : prev, phonemes[0]);
                    if (worst && worst.accuracyScore < 60 && MOUTH_HINTS[worst.phoneme]) {
                        return (
                            <View style={styles.hintBox}>
                                <Text style={styles.hintText}>{MOUTH_HINTS[worst.phoneme]}</Text>
                            </View>
                        );
                    }
                    return null;
                })()}

                {/* Fluency / Completeness Warnings */}
                {isCorrect === false && completeness !== undefined && completeness < 80 && (
                    <View style={styles.warningBox}>
                        <Text style={styles.warningText}>⚠️ You missed a sound! Say the whole word.</Text>
                    </View>
                )}
                {isCorrect === false && completeness !== undefined && completeness >= 80 && fluency !== undefined && fluency < 80 && (
                    <View style={styles.warningBox}>
                        <Text style={styles.warningText}>🌊 Try to say it smoothly without stopping!</Text>
                    </View>
                )}
                {isCorrect === false && prosody !== undefined && prosody < 60 && (
                    <View style={styles.warningBox}>
                        <Text style={styles.warningText}>🎵 Try to use natural rhythm and tone!</Text>
                    </View>
                )}

                {/* Accuracy bar */}
                {accuracy > 0 && (
                    <View style={styles.accuracyContainer}>
                        <View style={styles.progressBar}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${accuracy}%`,
                                    },
                                ]}
                            />
                        </View>
                        <View style={styles.accuracyBadge}>
                            <Text style={styles.accuracyText}>{Math.round(accuracy)}%</Text>
                        </View>
                    </View>
                )}

                {/* Decorative elements */}
                <View style={styles.decorativeCircle} />
            </LinearGradient>

            {/* Glow effect */}
            <View
                style={[
                    styles.glow,
                    {
                        shadowColor: getGradientColors()[0],
                    },
                ]}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
    },
    card: {
        padding: 28,
        borderRadius: 28,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
        overflow: 'hidden',
    },
    confettiContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    confetti: {
        fontSize: 32,
    },
    emoji: {
        fontSize: 80,
        marginBottom: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 8,
    },
    message: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        letterSpacing: 0.5,
    },
    accuracyContainer: {
        width: '100%',
        marginTop: 8,
    },
    progressBar: {
        height: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },
    accuracyBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        alignSelf: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    accuracyText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    decorativeCircle: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        top: -20,
        right: -20,
    },
    glow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 28,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
    },
    phonemesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 12,
    },
    phonemeBox: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 2,
    },
    phonemeText: {
        fontSize: 18,
        fontWeight: '900',
    },
    hintBox: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 8,
    },
    hintText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    warningBox: {
        backgroundColor: 'rgba(255,165,0,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,165,0,0.5)',
    },
    warningText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFE066',
    },
});