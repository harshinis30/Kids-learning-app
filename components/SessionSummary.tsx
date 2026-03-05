import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StarRating } from './StarRating';

interface SessionSummaryProps {
    visible: boolean;
    starsEarned: number;
    itemsCompleted: number;
    bestItem?: { text: string; stars: number };
    onContinue: () => void;
    onTakeBreak: () => void;
}

export function SessionSummary({
    visible,
    starsEarned,
    itemsCompleted,
    bestItem,
    onContinue,
    onTakeBreak,
}: SessionSummaryProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
        } else {
            scaleAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    const getMessage = () => {
        const avg = starsEarned / Math.max(itemsCompleted, 1);
        if (avg >= 2.5) return { text: 'Amazing session! 🏆', sub: 'You are a superstar!' };
        if (avg >= 1.5) return { text: 'Great job! 🎉', sub: 'Keep up the good work!' };
        return { text: 'Good effort! 💪', sub: 'Practice makes perfect!' };
    };

    const msg = getMessage();

    return (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.title}>Session Complete!</Text>
                    <Text style={styles.message}>{msg.text}</Text>
                    <Text style={styles.sub}>{msg.sub}</Text>

                    {/* Stars earned */}
                    <View style={styles.starsRow}>
                        <Text style={styles.starsCount}>⭐ {starsEarned}</Text>
                        <Text style={styles.starsLabel}>stars earned</Text>
                    </View>

                    {/* Items completed */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{itemsCompleted}</Text>
                            <Text style={styles.statLabel}>words practiced</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{Math.round(starsEarned / Math.max(itemsCompleted, 1) * 33)}%</Text>
                            <Text style={styles.statLabel}>accuracy</Text>
                        </View>
                    </View>

                    {/* Best item */}
                    {bestItem && (
                        <View style={styles.bestItem}>
                            <Text style={styles.bestLabel}>Best word:</Text>
                            <Text style={styles.bestWord}>{bestItem.text}</Text>
                            <StarRating stars={bestItem.stars} size="small" animate={false} />
                        </View>
                    )}

                    {/* Buttons */}
                    <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
                        <Text style={styles.continueBtnText}>Keep Going! 🚀</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.breakBtn} onPress={onTakeBreak}>
                        <Text style={styles.breakBtnText}>Take a Break 😴</Text>
                    </TouchableOpacity>
                </LinearGradient>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        padding: 24,
    },
    card: {
        width: '100%',
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 16,
    },
    gradient: {
        padding: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFE066',
        marginBottom: 4,
    },
    sub: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 24,
    },
    starsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 20,
    },
    starsCount: {
        fontSize: 48,
        fontWeight: '900',
        color: '#FFE066',
    },
    starsLabel: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        width: '100%',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 8,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    bestItem: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
        gap: 4,
    },
    bestLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    bestWord: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },
    continueBtn: {
        backgroundColor: '#FFE066',
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 50,
        marginBottom: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#FFE066',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    },
    continueBtnText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#5B21B6',
    },
    breakBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 50,
        width: '100%',
        alignItems: 'center',
    },
    breakBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
    },
});
