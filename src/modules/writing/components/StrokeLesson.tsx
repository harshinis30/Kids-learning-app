import { Canvas, Skia, Path as SkiaPath } from '@shopify/react-native-skia';
import { useAudioPlayer } from 'expo-audio';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { computeAccuracy } from '../utils/accuracy.js';
import { canProgress, getFeedback } from '../utils/scoring.js';

const { width: W, height: H } = Dimensions.get('window');
const MILO_SIZE = 44;

export type GameState = 'idle' | 'drawing' | 'success' | 'fail' | 'complete';

export interface StrokeLessonProps {
    title?: string;
    hint?: string;
    expectedPath: Array<{ x: number; y: number }>;
    strokeColor?: string;
    strokeType?: 'vertical' | 'horizontal' | 'curve' | 'diagonal' | 'dot-to-dot' | 'free';
    toleranceMultiplier?: number;
    miloStartNorm?: { x: number; y: number };
    miloEndNorm?: { x: number; y: number };
    onNext?: (accuracy: number | null) => void;
    onFail?: () => void;
    hideMilo?: boolean;
    hideTrail?: boolean;
    hideHeader?: boolean;
    hideOverlays?: boolean;
    children?: (props: {
        drawnPoints: Array<{ x: number; y: number }>;
        gameState: GameState;
        accuracy: number | null;
    }) => React.ReactNode;
}

export default function StrokeLesson({
    title, hint, expectedPath, strokeColor = '#FF6B6B', strokeType = 'free',
    toleranceMultiplier = 1.0, miloStartNorm, miloEndNorm,
    onNext, onFail, children, hideMilo, hideTrail, hideHeader, hideOverlays
}: StrokeLessonProps) {
    const [gameState, setGameState] = useState<GameState>('idle');
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; emoji: string } | null>(null);

    const drawnPointsRef = useRef<Array<{ x: number; y: number }>>([]);
    const skiaPathRef = useRef(Skia.Path.Make());
    const [, forceRepaint] = useState(0);
    const repaint = useCallback(() => forceRepaint(n => n + 1), []);

    const initMiloX = miloStartNorm ? miloStartNorm.x * W - MILO_SIZE / 2 : 0;
    const initMiloY = miloStartNorm ? miloStartNorm.y * H - MILO_SIZE / 2 : 0;

    const miloX = useSharedValue(initMiloX);
    const miloY = useSharedValue(initMiloY);

    useEffect(() => {
        drawnPointsRef.current = [];
        skiaPathRef.current = Skia.Path.Make();
        setGameState('idle');
        setAccuracy(null);
        setFeedback(null);
        miloX.value = withSpring(initMiloX, { damping: 14, stiffness: 120 });
        miloY.value = withSpring(initMiloY, { damping: 14, stiffness: 120 });
        repaint();
    }, [expectedPath, initMiloX, initMiloY, miloX, miloY, repaint]);

    const miloStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: miloX.value },
            { translateY: miloY.value },
        ],
        opacity: hideMilo ? 0 : 1
    }));

    const successSound = useAudioPlayer('https://www.soundjay.com/buttons/sounds/button-09.mp3');

    const playSuccess = useCallback(() => {
        try {
            successSound.play();
        } catch (_) { /* optional */ }
    }, [successSound]);

    const resetScene = useCallback(() => {
        drawnPointsRef.current = [];
        skiaPathRef.current = Skia.Path.Make();
        miloX.value = withSpring(initMiloX, { damping: 14, stiffness: 120 });
        miloY.value = withSpring(initMiloY, { damping: 14, stiffness: 120 });
        setAccuracy(null);
        setFeedback(null);
        setGameState('idle');
        repaint();
    }, [initMiloX, initMiloY, miloX, miloY, repaint]);

    const panGesture = Gesture.Pan()
        .runOnJS(true)
        .onStart((e) => {
            if (gameState === 'success') return; // block tracing if success
            drawnPointsRef.current = [];
            skiaPathRef.current = Skia.Path.Make();
            skiaPathRef.current.moveTo(e.x, e.y);
            drawnPointsRef.current.push({ x: e.x / W, y: e.y / H });
            setAccuracy(null);
            setFeedback(null);
            setGameState('drawing');
        })
        .onUpdate((e) => {
            if (gameState === 'success') return;
            skiaPathRef.current.lineTo(e.x, e.y);
            drawnPointsRef.current.push({ x: e.x / W, y: e.y / H });

            if (miloStartNorm && miloEndNorm) {
                switch (strokeType) {
                    case 'vertical':
                        miloX.value = withSpring(miloStartNorm.x * W - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
                        miloY.value = withSpring(e.y - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
                        break;
                    case 'horizontal':
                        miloX.value = withSpring(e.x - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
                        miloY.value = withSpring(miloStartNorm.y * H - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
                        break;
                    default:
                        miloX.value = withSpring(e.x - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
                        miloY.value = withSpring(e.y - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
                }
            } else {
                miloX.value = withSpring(e.x - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
                miloY.value = withSpring(e.y - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
            }
            repaint();
        })
        .onEnd(() => {
            if (gameState === 'success') return;
            const acc = computeAccuracy(drawnPointsRef.current, expectedPath, { width: W, height: H }, { toleranceMultiplier });
            const fb = getFeedback(acc);
            const progresses = canProgress(acc);

            setAccuracy(acc);
            setFeedback(fb);

            if (progresses) {
                if (miloEndNorm) {
                    miloX.value = withSpring(miloEndNorm.x * W - MILO_SIZE / 2, { damping: 12, stiffness: 100 });
                    miloY.value = withSpring(miloEndNorm.y * H - MILO_SIZE / 2, { damping: 12, stiffness: 100 });
                }
                setGameState('success');
                playSuccess();
            } else {
                setGameState('fail');
                if (onFail) onFail();
            }
        });

    return (
        <GestureHandlerRootView style={styles.root}>
            {!hideHeader && title && (
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{title}</Text>
                </View>
            )}

            <GestureDetector gesture={panGesture}>
                <View style={styles.canvasWrapper}>
                    <Canvas style={StyleSheet.absoluteFill}>
                        {children && children({ drawnPoints: drawnPointsRef.current, gameState, accuracy })}

                        {!hideTrail && (gameState === 'drawing' || gameState === 'success' || gameState === 'fail') && (
                            <SkiaPath
                                path={skiaPathRef.current}
                                color={strokeColor}
                                style="stroke"
                                strokeWidth={8}
                                strokeCap="round"
                                strokeJoin="round"
                            />
                        )}
                    </Canvas>

                    {!hideMilo && (
                        <Animated.View style={[styles.milo, miloStyle]} pointerEvents="none">
                            <Text style={styles.miloEmoji}>🐒</Text>
                        </Animated.View>
                    )}

                    {!hideOverlays && gameState === 'idle' && hint && (
                        <View style={styles.hintBanner} pointerEvents="none">
                            <Text style={styles.hintText}>{hint}</Text>
                        </View>
                    )}

                    {!hideOverlays && gameState === 'success' && feedback && (
                        <View style={styles.overlay}>
                            <Text style={styles.overlayEmoji}>{feedback.emoji}</Text>
                            <Text style={styles.overlayTitle}>{feedback.message}</Text>
                            {accuracy !== null && (
                                <View style={styles.accuracyBadgeFail}>
                                    <Text style={styles.accuracyText}>Accuracy: {accuracy}%</Text>
                                </View>
                            )}
                            {onNext ? (
                                <TouchableOpacity style={styles.nextBtn} onPress={() => onNext(accuracy)}>
                                    <Text style={styles.retryBtnText}>Next Scene →</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.nextBtn} onPress={resetScene}>
                                    <Text style={styles.retryBtnText}>Play Again</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {!hideOverlays && gameState === 'fail' && feedback && (
                        <View style={styles.overlay}>
                            <Text style={styles.overlayEmoji}>{feedback.emoji}</Text>
                            <Text style={styles.overlayTitle}>{feedback.message}</Text>
                            {accuracy !== null && (
                                <View style={styles.accuracyBadgeFail}>
                                    <Text style={styles.accuracyText}>Accuracy: {accuracy}%</Text>
                                </View>
                            )}
                            <Text style={styles.needScoreText}>Need better accuracy</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={resetScene}>
                                <Text style={styles.retryBtnText}>Try Again 🔁</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#1a1a2e' },
    header: { padding: 12, alignItems: 'center', backgroundColor: 'rgba(26,26,46,0.95)', zIndex: 10, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFE066' },
    canvasWrapper: { flex: 1, position: 'relative', overflow: 'hidden' },
    milo: { position: 'absolute', width: MILO_SIZE, height: MILO_SIZE, justifyContent: 'center', alignItems: 'center' },
    miloEmoji: { fontSize: 40 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,46,0.88)', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
    overlayEmoji: { fontSize: 72 },
    overlayTitle: { fontSize: 22, fontWeight: '900', color: '#FFE066', textAlign: 'center' },
    accuracyBadgeFail: { backgroundColor: 'rgba(255,107,107,0.18)', borderColor: '#FF6B6B', borderWidth: 1.5, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 30 },
    accuracyText: { fontSize: 20, fontWeight: '800', color: '#fff' },
    needScoreText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
    nextBtn: { backgroundColor: '#FFE066', paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50 },
    retryBtn: { backgroundColor: '#FFE066', paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50 },
    retryBtnText: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' },
    hintBanner: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
    hintText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' },
});
