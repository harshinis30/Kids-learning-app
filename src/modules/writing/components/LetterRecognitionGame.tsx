import { useAudioPlayer } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const MILO_SIZE = 50;

export interface Option {
    id: string;
    label: string;
    xNorm: number;
    yNorm: number;
}

export interface LetterRecognitionGameProps {
    promptText: string;
    options: Option[];
    correctId: string;
    miloStartNorm: { x: number; y: number };
    onCorrect: () => void;
    onIncorrect: (wrongId: string) => void;
    sceneLayout: 'forks' | 'doors';
}

export default function LetterRecognitionGame({
    promptText, options, correctId, miloStartNorm, onCorrect, onIncorrect, sceneLayout
}: LetterRecognitionGameProps) {
    const [gameState, setGameState] = useState<'idle' | 'moving' | 'success' | 'fail'>('idle');

    const miloX = useSharedValue(miloStartNorm.x * W - MILO_SIZE / 2);
    const miloY = useSharedValue(miloStartNorm.y * H - MILO_SIZE / 2);

    const miloStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: miloX.value },
            { translateY: miloY.value }
        ]
    }));

    useEffect(() => {
        miloX.value = miloStartNorm.x * W - MILO_SIZE / 2;
        miloY.value = miloStartNorm.y * H - MILO_SIZE / 2;
        setGameState('idle');
    }, [miloStartNorm, options, correctId, miloX, miloY]);

    const correctSound = useAudioPlayer('https://www.soundjay.com/buttons/sounds/button-09.mp3');
    const wrongSound = useAudioPlayer('https://freesound.org/data/previews/173/173934_311243-lq.mp3');

    const playSound = (type: 'correct' | 'wrong') => {
        try {
            if (type === 'correct') {
                correctSound.play();
            } else {
                wrongSound.play();
            }
        } catch (_) { }
    };

    const handleTap = (opt: Option) => {
        if (gameState !== 'idle') return;
        setGameState('moving');

        miloX.value = withSpring(opt.xNorm * W - MILO_SIZE / 2, { damping: 14 });
        miloY.value = withSpring(opt.yNorm * H - MILO_SIZE / 2, { damping: 14 }, (finished) => {
            if (finished) {
                if (opt.id === correctId) {
                    runOnJS(setGameState)('success');
                    runOnJS(playSound)('correct');
                    runOnJS(onCorrect)();
                } else {
                    runOnJS(setGameState)('fail');
                    runOnJS(playSound)('wrong');

                    miloX.value = withSequence(
                        withTiming(miloStartNorm.x * W - MILO_SIZE / 2 + 10, { duration: 100 }),
                        withSpring(miloStartNorm.x * W - MILO_SIZE / 2, { damping: 12 })
                    );
                    miloY.value = withSequence(
                        withTiming(miloStartNorm.y * H - MILO_SIZE / 2 + 10, { duration: 100 }),
                        withSpring(miloStartNorm.y * H - MILO_SIZE / 2, { damping: 12 })
                    );

                    runOnJS(onIncorrect)(opt.id);

                    setTimeout(() => {
                        runOnJS(setGameState)('idle');
                    }, 1000);
                }
            }
        });
    };

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFill}>
                {sceneLayout === 'forks' && (
                    <View style={{ flex: 1, backgroundColor: '#87CEEB' }}>
                        <View style={{ position: 'absolute', bottom: 0, width: '100%', height: H * 0.4, backgroundColor: '#4CAF50' }} />
                        <View style={{ position: 'absolute', left: W * 0.45, bottom: H * 0.1, width: W * 0.1, height: H * 0.3, backgroundColor: '#d9b382', borderTopLeftRadius: 50, borderTopRightRadius: 50 }} />
                        <View style={{ position: 'absolute', left: W * 0.25, top: H * 0.55, width: W * 0.2, height: H * 0.1, backgroundColor: '#d9b382', transform: [{ rotate: '-30deg' }] }} />
                        <View style={{ position: 'absolute', left: W * 0.55, top: H * 0.55, width: W * 0.2, height: H * 0.1, backgroundColor: '#d9b382', transform: [{ rotate: '30deg' }] }} />
                    </View>
                )}
                {sceneLayout === 'doors' && (
                    <View style={{ flex: 1, backgroundColor: '#3F51B5' }}>
                        <View style={{ position: 'absolute', bottom: 0, width: '100%', height: H * 0.3, backgroundColor: '#795548' }} />
                    </View>
                )}
            </View>

            <View style={styles.promptContainer}>
                <Text style={styles.prompt}>{promptText}</Text>
            </View>

            {options.map((opt) => (
                <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionBtn, { left: opt.xNorm * W - 50, top: opt.yNorm * H - 60 }]}
                    onPress={() => handleTap(opt)}
                    activeOpacity={0.7}
                >
                    {sceneLayout === 'doors' ? (
                        <View style={styles.door}>
                            <Text style={styles.doorLabel}>{opt.label}</Text>
                            <View style={styles.doorknob} />
                        </View>
                    ) : (
                        <View style={styles.sign}>
                            <Text style={styles.signLabel}>{opt.label}</Text>
                            <View style={styles.signPost} />
                        </View>
                    )}
                </TouchableOpacity>
            ))}

            <Animated.View style={[styles.milo, miloStyle]} pointerEvents="none">
                <Text style={styles.miloEmoji}>🐒</Text>
            </Animated.View>

            {gameState === 'fail' && (
                <View style={styles.feedbackOverlay} pointerEvents="none">
                    <Text style={styles.feedbackText}>Oops, wrong way!</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    promptContainer: { position: 'absolute', top: 60, width: '100%', alignItems: 'center', zIndex: 10 },
    prompt: { fontSize: 24, fontWeight: '900', color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, overflow: 'hidden', textAlign: 'center' },
    optionBtn: { position: 'absolute', width: 100, height: 120, alignItems: 'center', justifyContent: 'flex-end', zIndex: 5 },
    door: { width: 80, height: 120, backgroundColor: '#8B4513', borderRadius: 5, borderWidth: 4, borderColor: '#5D4037', justifyContent: 'center', alignItems: 'center' },
    doorLabel: { fontSize: 40, fontWeight: 'bold', color: '#FFD700' },
    doorknob: { position: 'absolute', right: 5, top: 60, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFD700' },
    sign: { width: 80, height: 60, backgroundColor: '#FFEB3B', borderRadius: 8, borderWidth: 3, borderColor: '#FBC02D', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
    signLabel: { fontSize: 36, fontWeight: 'bold', color: '#3E2723' },
    signPost: { position: 'absolute', bottom: -60, width: 10, height: 60, backgroundColor: '#5D4037', zIndex: 1 },
    milo: { position: 'absolute', width: MILO_SIZE, height: MILO_SIZE, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
    miloEmoji: { fontSize: 50 },
    feedbackOverlay: { position: 'absolute', top: '50%', width: '100%', alignItems: 'center', zIndex: 30 },
    feedbackText: { fontSize: 32, fontWeight: 'bold', color: '#FF6B6B', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }
});
