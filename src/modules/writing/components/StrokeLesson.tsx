import { useAudioPlayer } from 'expo-audio';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Animated as RNAnimated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { computeAccuracy } from '../utils/accuracy.js';
import { canProgress, getFeedback } from '../utils/scoring.js';

const { width: W, height: H } = Dimensions.get('window');
const MILO_SIZE = 44;

export type GameState = 'idle' | 'drawing' | 'success' | 'fail' | 'complete';

/**
 * TravelingDotGuide — A glowing 👆 dot that moves along the expected path.
 * Uses simple setInterval (no Animated API = no native driver issues).
 */
function TravelingDotGuide({ expectedPath, isIdle }: { expectedPath: Array<{ x: number; y: number }>; isIdle: boolean }) {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!isIdle || !expectedPath || expectedPath.length < 2) return;

        let t = 0;
        const interval = setInterval(() => {
            t += 0.02;
            if (t > 1.3) {
                t = 0;
                setVisible(false);
                setTimeout(() => setVisible(true), 200);
            }
            setProgress(Math.min(t, 1));
        }, 50);

        return () => clearInterval(interval);
    }, [isIdle]);

    if (!isIdle || !expectedPath || expectedPath.length < 2 || !visible) return null;

    const distances: number[] = [0];
    let totalDist = 0;
    for (let i = 1; i < expectedPath.length; i++) {
        const dx = (expectedPath[i].x - expectedPath[i - 1].x) * W;
        const dy = (expectedPath[i].y - expectedPath[i - 1].y) * H;
        totalDist += Math.sqrt(dx * dx + dy * dy);
        distances.push(totalDist);
    }

    const targetDist = progress * totalDist;
    let posX = expectedPath[0].x * W;
    let posY = expectedPath[0].y * H;

    for (let i = 1; i < expectedPath.length; i++) {
        if (distances[i] >= targetDist) {
            const segLen = distances[i] - distances[i - 1];
            const segProgress = segLen > 0 ? (targetDist - distances[i - 1]) / segLen : 0;
            posX = (expectedPath[i - 1].x + (expectedPath[i].x - expectedPath[i - 1].x) * segProgress) * W;
            posY = (expectedPath[i - 1].y + (expectedPath[i].y - expectedPath[i - 1].y) * segProgress) * H;
            break;
        }
    }

    return (
        <View
            pointerEvents="none"
            style={{
                position: 'absolute',
                left: posX - 28,
                top: posY - 28,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: 'rgba(255, 235, 59, 0.4)',
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.6)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#FFE066',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 15,
                elevation: 10,
            }}
        >
            <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#FFF',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Text style={{ fontSize: 20 }}>☝️</Text>
            </View>
        </View>
    );
}

/**
 * Helper to build basic straight line SVG paths
 */
export function getSvgPathFromPoints(pts: Array<{ x: number, y: number }>, makeCurve: boolean = false) {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x * W} ${pts[0].y * H}`;

    let d = `M ${pts[0].x * W} ${pts[0].y * H}`;
    if (makeCurve && pts.length > 2) {
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i].x + pts[i + 1].x) / 2 * W;
            const my = (pts[i].y + pts[i + 1].y) / 2 * H;
            d += ` Q ${pts[i].x * W} ${pts[i].y * H} ${mx} ${my}`;
        }
        d += ` L ${pts[pts.length - 1].x * W} ${pts[pts.length - 1].y * H}`;
    } else {
        for (let i = 1; i < pts.length; i++) {
            d += ` L ${pts[i].x * W} ${pts[i].y * H}`;
        }
    }
    return d;
}

/**
 * StartEndMarkers — SVG circles for start (green) and end (red) on the canvas.
 */
function StartEndMarkers({ expectedPath }: { expectedPath: Array<{ x: number; y: number }> }) {
    if (!expectedPath || expectedPath.length < 2) return null;
    const s = expectedPath[0];
    const e = expectedPath[expectedPath.length - 1];
    return (
        <G>
            {/* Start Node (Green Gummy Style) */}
            <Circle cx={s.x * W} cy={s.y * H} r={28} fill="rgba(76,217,100,0.15)" />
            <Circle cx={s.x * W} cy={s.y * H} r={20} fill="rgba(76,217,100,0.4)" stroke="#FFF" strokeWidth={2} />
            <Circle cx={s.x * W} cy={s.y * H} r={10} fill="#4CD964" />
            <Circle cx={s.x * W - 4} cy={s.y * H - 4} r={3} fill="#FFF" opacity={0.7} /> {/* Cute highlight */}

            {/* End Node (Red Gummy Style) */}
            <Circle cx={e.x * W} cy={e.y * H} r={24} fill="rgba(255,107,107,0.15)" />
            <Circle cx={e.x * W} cy={e.y * H} r={16} fill="rgba(255,107,107,0.4)" stroke="#FFF" strokeWidth={2} />
            <Circle cx={e.x * W} cy={e.y * H} r={6} fill="#FF6B6B" />
        </G>
    );
}

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
    const [drawnPathD, setDrawnPathD] = useState('');
    const [, forceRepaint] = useState(0);
    const repaint = useCallback(() => forceRepaint(n => n + 1), []);

    const initMiloX = miloStartNorm ? miloStartNorm.x * W - MILO_SIZE / 2 : 0;
    const initMiloY = miloStartNorm ? miloStartNorm.y * H - MILO_SIZE / 2 : 0;

    const miloX = useSharedValue(initMiloX);
    const miloY = useSharedValue(initMiloY);

    // Idle bobbing animation hook
    const [bobAnim] = useState(new RNAnimated.Value(0));
    useEffect(() => {
        if (gameState === 'idle') {
            RNAnimated.loop(
                RNAnimated.sequence([
                    RNAnimated.timing(bobAnim, { toValue: -15, duration: 800, useNativeDriver: true }),
                    RNAnimated.timing(bobAnim, { toValue: 0, duration: 800, useNativeDriver: true })
                ])
            ).start();
        } else {
            bobAnim.stopAnimation();
            RNAnimated.spring(bobAnim, { toValue: 0, friction: 5, useNativeDriver: true }).start();
        }
    }, [gameState, bobAnim]);

    useEffect(() => {
        drawnPointsRef.current = [];
        setDrawnPathD('');
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
        setDrawnPathD('');
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
            drawnPointsRef.current.push({ x: e.x / W, y: e.y / H });
            setDrawnPathD(`M ${e.x} ${e.y}`);
            setAccuracy(null);
            setFeedback(null);
            setGameState('drawing');
        })
        .onUpdate((e) => {
            if (gameState === 'success') return;
            drawnPointsRef.current.push({ x: e.x / W, y: e.y / H });
            setDrawnPathD(prev => `${prev} L ${e.x} ${e.y}`);

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
                    <Svg style={StyleSheet.absoluteFill}>
                        {children && children({ drawnPoints: drawnPointsRef.current, gameState, accuracy })}

                        {/* Start/End markers on the canvas */}
                        <StartEndMarkers expectedPath={expectedPath} />

                        {!hideTrail && (gameState === 'drawing' || gameState === 'success' || gameState === 'fail') && (
                            <G>
                                {/* Outer thick translucent glow */}
                                <Path
                                    d={drawnPathD}
                                    stroke={strokeColor}
                                    strokeWidth={32}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                    opacity={0.3}
                                />
                                {/* Inner bright solid core */}
                                <Path
                                    d={drawnPathD}
                                    stroke={strokeColor}
                                    strokeWidth={16}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                />
                                {/* Hot white center stripe for neon effect */}
                                <Path
                                    d={drawnPathD}
                                    stroke="#FFF"
                                    strokeWidth={6}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                    opacity={0.6}
                                />
                            </G>
                        )}
                    </Svg>

                    {!hideMilo && (
                        <Animated.View style={[styles.milo, miloStyle]} pointerEvents="none">
                            <RNAnimated.View style={{ transform: [{ translateY: bobAnim }] }}>
                                <Text style={styles.miloEmoji}>🐒</Text>
                            </RNAnimated.View>
                        </Animated.View>
                    )}

                    {/* Animated traveling dot guide */}
                    <TravelingDotGuide expectedPath={expectedPath} isIdle={gameState === 'idle'} />

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
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFE066', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    canvasWrapper: { flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'none' as any },
    milo: { position: 'absolute', width: MILO_SIZE, height: MILO_SIZE, justifyContent: 'center', alignItems: 'center' },
    miloEmoji: { fontSize: 55, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 6 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,46,0.92)', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
    overlayEmoji: { fontSize: 90 },
    overlayTitle: { fontSize: 32, fontWeight: '900', color: '#FFE066', textAlign: 'center', textShadowColor: '#000', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6 },
    accuracyBadgeFail: { backgroundColor: 'rgba(255,107,107,0.18)', borderColor: '#FF6B6B', borderWidth: 2, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 40 },
    accuracyText: { fontSize: 22, fontWeight: '900', color: '#fff' },
    needScoreText: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
    nextBtn: { backgroundColor: '#FFE066', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 50, shadowColor: '#FFE066', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 12 },
    retryBtn: { backgroundColor: '#FF6B6B', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 50, shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 12 },
    retryBtnText: { fontSize: 20, fontWeight: '900', color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: 1 },
    hintBanner: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
    hintText: { fontSize: 18, fontWeight: '800', color: '#FFF', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10 },
});
