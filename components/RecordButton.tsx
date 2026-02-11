import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChildTheme } from '../constants/ChildTheme';

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
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (isRecording) {
            // Pulse animation while recording
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.setValue(1);
        }
    }, [isRecording]);

    const handlePress = () => {
        if (!disabled && !isProcessing) {
            // Tap animation
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
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

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={disabled || isProcessing}
            activeOpacity={0.8}
            style={styles.container}
        >
            <Animated.View
                style={[
                    styles.button,
                    {
                        transform: [{ scale: scaleAnim }],
                        opacity: disabled || isProcessing ? 0.5 : 1,
                    },
                ]}
            >
                <View
                    style={[
                        styles.buttonInner,
                        {
                            backgroundColor: isRecording
                                ? ChildTheme.colors.warning
                                : ChildTheme.colors.buttonPrimary,
                        },
                    ]}
                >
                    <Text style={styles.emoji}>
                        {isProcessing ? '⏳' : isRecording ? '🎤' : '🎙️'}
                    </Text>
                    <Text style={styles.text}>
                        {isProcessing
                            ? 'Listening...'
                            : isRecording
                                ? 'Recording'
                                : 'Tap to Speak'}
                    </Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        width: 140,
        height: 140,
        borderRadius: 70,
        ...ChildTheme.shadows.large,
    },
    buttonInner: {
        flex: 1,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        padding: ChildTheme.spacing.md,
    },
    emoji: {
        fontSize: 48,
        marginBottom: ChildTheme.spacing.xs,
    },
    text: {
        color: ChildTheme.colors.textLight,
        fontSize: ChildTheme.fontSize.md,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
