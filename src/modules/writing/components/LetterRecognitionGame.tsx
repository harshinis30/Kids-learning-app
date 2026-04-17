import { Canvas, Circle, LinearGradient, Rect, Skia, Path as SkiaPath, vec } from '@shopify/react-native-skia';
import { useAudioPlayer } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

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

function AnimatedOption({ opt, sceneLayout, onPress }: { opt: Option, sceneLayout: string, onPress: (o: Option) => void }) {
    const floatAnim = useSharedValue(0);

    useEffect(() => {
        // Randomize start time slightly to desync the bounces
        setTimeout(() => {
            floatAnim.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
        }, Math.random() * 500);
    }, [floatAnim]);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: floatAnim.value * -12 }]
    }));

    const topPos = opt.yNorm * H - (sceneLayout === 'doors' ? 120 : 60);

    return (
        <Animated.View style={[styles.optionBtn, { left: opt.xNorm * W - 50, top: topPos }, style]}>
            <TouchableOpacity onPress={() => onPress(opt)} activeOpacity={0.8} style={styles.optionContent}>
                {sceneLayout === 'doors' ? (
                    <View style={styles.door}>
                        <Text style={styles.doorLabel}>{opt.label}</Text>
                        <View style={styles.doorknob} />
                    </View>
                ) : (
                    <View style={styles.signWrapper}>
                        <View style={styles.sign}>
                            <Text style={styles.signLabel}>{opt.label}</Text>
                        </View>
                        <View style={styles.signPost} />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
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

    const correctSound = useAudioPlayer(require('../../../../assets/writing_module_sounds/hip hip hurray.mp3'));
    const wrongSound = useAudioPlayer(require('../../../../assets/writing_module_sounds/sad.mp3'));

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

        const targetY = opt.yNorm * H - (sceneLayout === 'doors' ? 60 : 20); // Make Milo stop in front of the object

        miloX.value = withSpring(opt.xNorm * W - MILO_SIZE / 2, { damping: 14 });
        miloY.value = withSpring(targetY, { damping: 14 }, (finished) => {
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

    const buildForkPath = () => {
        const p = Skia.Path.Make();
        p.moveTo(W * 0.4, H);
        p.lineTo(W * 0.4, H * 0.7);
        p.lineTo(W * 0.2, H * 0.55);
        p.lineTo(W * 0.3, H * 0.55);
        p.lineTo(W * 0.5, H * 0.7);
        p.lineTo(W * 0.7, H * 0.55);
        p.lineTo(W * 0.8, H * 0.55);
        p.lineTo(W * 0.6, H * 0.7);
        p.lineTo(W * 0.6, H);
        return p;
    };

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFill}>
                {sceneLayout === 'forks' && (
                    <Canvas style={StyleSheet.absoluteFill}>
                        {/* Sky */}
                        <Rect x={0} y={0} width={W} height={H * 0.55}>
                            <LinearGradient start={vec(0, 0)} end={vec(0, H * 0.55)} colors={['#87CEEB', '#E0F7FA']} />
                        </Rect>
                        {/* Sun */}
                        <Circle cx={W * 0.8} cy={H * 0.2} r={60}>
                            <LinearGradient start={vec(W * 0.8, H * 0.2 - 60)} end={vec(W * 0.8, H * 0.2 + 60)} colors={['#FFF59D', '#FFB300']} />
                        </Circle>
                        {/* Ground */}
                        <Rect x={0} y={H * 0.55} width={W} height={H * 0.45}>
                            <LinearGradient start={vec(0, H * 0.55)} end={vec(0, H)} colors={['#81C784', '#2E7D32']} />
                        </Rect>
                        {/* Intersecting Paths */}
                        <SkiaPath path={buildForkPath()} color="#A1887F" />
                    </Canvas>
                )}
                {sceneLayout === 'doors' && (
                    <Canvas style={StyleSheet.absoluteFill}>
                        {/* Wall/Sky */}
                        <Rect x={0} y={0} width={W} height={H * 0.7}>
                            <LinearGradient start={vec(0, 0)} end={vec(0, H * 0.7)} colors={['#3F51B5', '#1A237E']} />
                        </Rect>
                        {/* Floor */}
                        <Rect x={0} y={H * 0.7} width={W} height={H * 0.3}>
                            <LinearGradient start={vec(0, H * 0.7)} end={vec(0, H)} colors={['#8D6E63', '#4E342E']} />
                        </Rect>
                        {/* Baseboard */}
                        <Rect x={0} y={H * 0.68} width={W} height={H * 0.02} color="#3E2723" />
                    </Canvas>
                )}
            </View>

            <View style={styles.promptContainer}>
                <Text style={styles.prompt}>{promptText}</Text>
            </View>

            {options.map((opt) => (
                <AnimatedOption key={opt.id} opt={opt} sceneLayout={sceneLayout} onPress={handleTap} />
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
    promptContainer: { position: 'absolute', top: 80, width: '100%', alignItems: 'center', zIndex: 10 },
    prompt: { fontSize: 26, fontWeight: '900', color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, overflow: 'hidden', textAlign: 'center', borderWidth: 2, borderColor: '#FFE066' },
    optionBtn: { position: 'absolute', width: 100, height: 180, alignItems: 'center', justifyContent: 'flex-start', zIndex: 5 },
    optionContent: { alignItems: 'center', justifyContent: 'flex-start' },
    door: { width: 90, height: 120, backgroundColor: '#8B4513', borderRadius: 8, borderWidth: 5, borderColor: '#5D4037', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10 },
    doorLabel: { fontSize: 48, fontWeight: 'bold', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
    doorknob: { position: 'absolute', right: 8, top: 55, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFD700', shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.8, shadowRadius: 2 },
    signWrapper: { alignItems: 'center' },
    sign: { width: 90, height: 70, backgroundColor: '#FFEB3B', borderRadius: 10, borderWidth: 4, borderColor: '#F57F17', justifyContent: 'center', alignItems: 'center', zIndex: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 8 },
    signLabel: { fontSize: 42, fontWeight: '900', color: '#3E2723', textShadowColor: '#fff', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
    signPost: { width: 12, height: 70, backgroundColor: '#5D4037', zIndex: 1, marginTop: -2 },
    milo: { position: 'absolute', width: MILO_SIZE, height: MILO_SIZE, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
    miloEmoji: { fontSize: 50, textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
    feedbackOverlay: { position: 'absolute', top: '50%', width: '100%', alignItems: 'center', zIndex: 30 },
    feedbackText: { fontSize: 36, fontWeight: '900', color: '#FF4081', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 6, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' }
});
