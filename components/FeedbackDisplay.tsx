import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ChildTheme } from '../constants/ChildTheme';

interface FeedbackDisplayProps {
    isCorrect: boolean | null;
    accuracy: number;
    message: string;
    visible: boolean;
}

export function FeedbackDisplay({
    isCorrect,
    accuracy,
    message,
    visible
}: FeedbackDisplayProps) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.5);
        }
    }, [visible]);

    if (!visible) return null;

    const getEmoji = () => {
        if (isCorrect === null) return '🤔';
        if (isCorrect) return '🎉';
        if (accuracy >= 60) return '👍';
        return '💪';
    };

    const getColor = () => {
        if (isCorrect === null) return ChildTheme.colors.neutral;
        if (isCorrect) return ChildTheme.colors.correct;
        if (accuracy >= 60) return ChildTheme.colors.warning;
        return ChildTheme.colors.incorrect;
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: getColor(),
                },
            ]}
        >
            <Text style={styles.emoji}>{getEmoji()}</Text>
            <Text style={styles.message}>{message}</Text>
            {accuracy > 0 && (
                <View style={styles.accuracyContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${accuracy}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.accuracyText}>{Math.round(accuracy)}%</Text>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: ChildTheme.spacing.lg,
        borderRadius: ChildTheme.borderRadius.lg,
        alignItems: 'center',
        ...ChildTheme.shadows.medium,
        marginHorizontal: ChildTheme.spacing.md,
    },
    emoji: {
        fontSize: 64,
        marginBottom: ChildTheme.spacing.sm,
    },
    message: {
        fontSize: ChildTheme.fontSize.xl,
        fontWeight: 'bold',
        color: ChildTheme.colors.textLight,
        textAlign: 'center',
        marginBottom: ChildTheme.spacing.sm,
    },
    accuracyContainer: {
        width: '100%',
        marginTop: ChildTheme.spacing.sm,
    },
    progressBar: {
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: ChildTheme.borderRadius.sm,
        overflow: 'hidden',
        marginBottom: ChildTheme.spacing.xs,
    },
    progressFill: {
        height: '100%',
        backgroundColor: ChildTheme.colors.textLight,
        borderRadius: ChildTheme.borderRadius.sm,
    },
    accuracyText: {
        fontSize: ChildTheme.fontSize.md,
        fontWeight: 'bold',
        color: ChildTheme.colors.textLight,
        textAlign: 'center',
    },
});
