import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RecordButtonProps {
    onPress: () => void;
    isRecording: boolean;
    isProcessing: boolean;
    disabled?: boolean;
}

export function RecordButton({
    onPress,
    isRecording,
    isProcessing,
    disabled = false
}: RecordButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isRecording) {
            // Pulse animation while recording
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.08,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Ripple effect
            Animated.loop(
                Animated.sequence([
                    Animated.timing(rippleAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rippleAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.setValue(1);
            rippleAnim.setValue(0);
        }

        if (isProcessing) {
            // Rotate animation while processing
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            rotateAnim.setValue(0);
        }
    }, [isRecording, isProcessing]);

    const handlePress = () => {
        if (!disabled && !isProcessing) {
            // Tap animation
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 0.92,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start();

            onPress();
        }
    };

    const rippleScale = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.5],
    });

    const rippleOpacity = rippleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.6, 0.3, 0],
    });

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const getButtonColor = () => {
        if (isProcessing) return '#9333EA';
        if (isRecording) return '#EF4444';
        return '#10B981';
    };

    const getButtonText = () => {
        if (isProcessing) return 'Listening...';
        if (isRecording) return 'Stop';
        return 'Speak';
    };

    const getEmoji = () => {
        if (isProcessing) return '⏳';
        if (isRecording) return '⏹️';
        return '🎤';
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={disabled || isProcessing}
            activeOpacity={0.8}
            style={styles.container}
        >
            {/* Ripple effect */}
            {isRecording && (
                <Animated.View
                    style={[
                        styles.ripple,
                        {
                            transform: [{ scale: rippleScale }],
                            opacity: rippleOpacity,
                            backgroundColor: getButtonColor(),
                        },
                    ]}
                />
            )}

            {/* Main button */}
            <Animated.View
                style={[
                    styles.button,
                    {
                        transform: [
                            { scale: scaleAnim },
                            { rotate: isProcessing ? rotation : '0deg' },
                        ],
                        opacity: disabled ? 0.5 : 1,
                        backgroundColor: getButtonColor(),
                    },
                ]}
            >
                <View style={styles.buttonInner}>
                    <Text style={styles.emoji}>{getEmoji()}</Text>
                    <Text style={styles.text}>{getButtonText()}</Text>
                </View>

                {/* Decorative ring */}
                <View style={styles.decorativeRing} />
            </Animated.View>

            {/* Glow effect */}
            <View
                style={[
                    styles.glow,
                    {
                        shadowColor: getButtonColor(),
                    },
                ]}
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    ripple: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    button: {
        width: 90,
        height: 90,
        borderRadius: 45,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    buttonInner: {
        flex: 1,
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    decorativeRing: {
        position: 'absolute',
        top: -5,
        left: -5,
        right: -5,
        bottom: -5,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    emoji: {
        fontSize: 30,
        marginBottom: 3,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        letterSpacing: 0.5,
    },
    glow: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
    },
});