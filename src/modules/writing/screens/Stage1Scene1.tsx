/**
 * Stage1Scene1.tsx — "Help Milo Move" · Level 1 (iOS + Android + Web)
 * Writing Module · Level 1 · 5 Sequential Story Moments
 *
 * Rewritten to use react-native-svg for Universal compatibility.
 */

import { useAudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import StoryIntro from './StoryIntro';
import {
    Animated as RNAnimated,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import Svg, {
    Circle,
    Defs,
    G,
    LinearGradient as SvgLinearGradient,
    Path,
    Rect,
    Stop
} from 'react-native-svg';

import expectedPathsData from '../data/expectedPaths.json';
import { computeAccuracy } from '../utils/accuracy.js';
import { canProgress, getFeedback } from '../utils/scoring.js';
import { useWritingCompletion } from './WritingLevelHub';

// ── Screen dimensions ─────────────────────────────────────────────────────────

// Dimensions handled dynamically via useWindowDimensions

// ── Milo ──────────────────────────────────────────────────────────────────────

const MILO_SIZE = 44;

// ── Trail colours (cycle on retry) ───────────────────────────────────────────

const TRAIL_COLORS = ['#FF6B6B', '#FFE066', '#4ECDC4', '#FF9F43', '#A29BFE'];

// ── Scene Configurations ──────────────────────────────────────────────────────

type StrokeType = 'vertical' | 'curve' | 'horizontal' | 'dot-to-dot' | 'diagonal';

interface SceneConfig {
    key: keyof typeof expectedPathsData;
    title: string;
    hint: string;
    strokeType: StrokeType;
    miloStartNorm: { x: number; y: number };
    miloEndNorm: { x: number; y: number };
}

const SCENES: SceneConfig[] = [
    {
        key: 'tree_climb',
        title: '🌳 Milo Climbs the Tree',
        hint: '☝️ Drag UP to help Milo climb!',
        strokeType: 'vertical',
        miloStartNorm: { x: 0.5, y: 0.78 },
        miloEndNorm: { x: 0.5, y: 0.15 },
    },
    {
        key: 'vine_swing',
        title: '🌿 Milo Swings on the Vine',
        hint: '〜 Trace the swinging arc!',
        strokeType: 'curve',
        miloStartNorm: { x: 0.2, y: 0.25 },
        miloEndNorm: { x: 0.8, y: 0.25 },
    },
    {
        key: 'bridge_cross',
        title: '🌉 Milo Crosses the Bridge',
        hint: '👉 Drag RIGHT across the stones!',
        strokeType: 'horizontal',
        miloStartNorm: { x: 0.1, y: 0.55 },
        miloEndNorm: { x: 0.9, y: 0.55 },
    },
    {
        key: 'cave_tunnel',
        title: '🦇 Milo Walks Through the Cave',
        hint: '✨ Follow the glowing dots!',
        strokeType: 'dot-to-dot',
        miloStartNorm: { x: 0.15, y: 0.35 },
        miloEndNorm: { x: 0.85, y: 0.40 },
    },
    {
        key: 'hill_slide',
        title: '⛰️ Milo Slides Down the Hill',
        hint: '↘ Slide diagonally downward!',
        strokeType: 'diagonal',
        miloStartNorm: { x: 0.15, y: 0.2 },
        miloEndNorm: { x: 0.85, y: 0.78 },
    },
];

type GameState = 'idle' | 'drawing' | 'success' | 'fail' | 'complete';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSvgPathFromPoints(pts: Array<{ x: number, y: number }>, makeCurve: boolean = false, W: number, H: number) {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x * W} ${pts[0].y * H}`;

    let d = `M ${pts[0].x * W} ${pts[0].y * H}`;

    if (makeCurve && pts.length > 2) {
        // Basic auto-curve using quadratic bezier segments
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

// ── Scene Background Renderer ─────────────────────────────────────────────────

function SceneBackground({ sceneIdx }: { sceneIdx: number }) {
    const { width: W, height: H } = useWindowDimensions();
    switch (sceneIdx) {
        case 0:
            return (
                <Svg width="100%" height="100%" pointerEvents="none" style={{ userSelect: 'none' } as any}>
                    <Rect x={0} y={0} width={W} height={H} fill="#1a3a5c" />
                    <Rect x={0} y={H * 0.88} width={W} height={H * 0.12} fill="#2d5a27" />
                    <Rect x={(W - 120) / 2} y={0} width={120} height={H * 0.88} fill="#6B3A2A" />
                    <Rect x={(W - 120) / 2 + 12} y={0} width={18} height={H * 0.88} fill="rgba(255,200,150,0.12)" />
                    <Circle cx={W / 2} cy={H * 0.12} r={90} fill="#2d7a27" />
                    <Circle cx={W / 2 - 60} cy={H * 0.16} r={65} fill="#3a9e32" />
                    <Circle cx={W / 2 + 60} cy={H * 0.16} r={65} fill="#3a9e32" />
                </Svg>
            );

        case 1: {
            const vinePts = expectedPathsData.vine_swing;
            const d = `M ${vinePts[0].x * W} ${vinePts[0].y * H} C ${vinePts[1].x * W} ${vinePts[1].y * H}, ${vinePts[5].x * W} ${vinePts[5].y * H}, ${vinePts[6].x * W} ${vinePts[6].y * H}`;
            return (
                <Svg width="100%" height="100%" pointerEvents="none" style={{ userSelect: 'none' } as any}>
                    <Rect x={0} y={0} width={W} height={H} fill="#87CEEB" />
                    <Rect x={0} y={H * 0.75} width={W} height={H * 0.25} fill="#3a8c32" />
                    <Rect x={0} y={H * 0.1} width={60} height={H * 0.65} fill="#5C3A1E" />
                    <Circle cx={30} cy={H * 0.1} r={55} fill="#2d7a27" />
                    <Rect x={W - 60} y={H * 0.1} width={60} height={H * 0.65} fill="#5C3A1E" />
                    <Circle cx={W - 30} cy={H * 0.1} r={55} fill="#2d7a27" />
                    <Path
                        d={d}
                        stroke="#5C3A1E"
                        strokeWidth={6}
                        strokeLinecap="round"
                        fill="none"
                    />
                    <Circle cx={vinePts[0].x * W} cy={vinePts[0].y * H} r={8} fill="#5C3A1E" />
                </Svg>
            );
        }

        case 2: {
            const stones = expectedPathsData.bridge_cross;
            return (
                <Svg width="100%" height="100%" pointerEvents="none" style={{ userSelect: 'none' } as any}>
                    <Rect x={0} y={0} width={W} height={H} fill="#1a3a5c" />
                    <Rect x={0} y={H * 0.45} width={W} height={H * 0.3} fill="#1565C0" />
                    <Rect x={W * 0.1} y={H * 0.5} width={W * 0.8} height={8} fill="rgba(255,255,255,0.15)" />
                    <Rect x={W * 0.2} y={H * 0.62} width={W * 0.6} height={6} fill="rgba(255,255,255,0.10)" />
                    <Rect x={0} y={H * 0.75} width={W} height={H * 0.25} fill="#2d5a27" />
                    <Rect x={0} y={0} width={W} height={H * 0.25} fill="#2d5a27" />
                    {stones.map((pt, i) => (
                        <G key={i}>
                            <Circle cx={pt.x * W} cy={pt.y * H} r={28} fill="#795548" />
                            <Circle cx={pt.x * W} cy={pt.y * H} r={22} fill="#8D6E63" />
                        </G>
                    ))}
                </Svg>
            );
        }

        case 3: {
            const dots = expectedPathsData.cave_tunnel;
            return (
                <Svg width="100%" height="100%" pointerEvents="none" style={{ userSelect: 'none' } as any}>
                    <Rect x={0} y={0} width={W} height={H} fill="#1A0A2E" />
                    <Rect x={0} y={0} width={W * 0.18} height={H} fill="#2E1A47" />
                    <Rect x={W * 0.82} y={0} width={W * 0.18} height={H} fill="#2E1A47" />
                    <Rect x={W * 0.05} y={H * 0.2} width={4} height={H * 0.4} fill="rgba(100,80,120,0.4)" />
                    <Rect x={W * 0.88} y={H * 0.3} width={4} height={H * 0.35} fill="rgba(100,80,120,0.4)" />
                    <Circle cx={dots[0].x * W} cy={dots[0].y * H} r={32} fill="rgba(255,240,100,0.18)" />
                    <Circle cx={dots[dots.length - 1].x * W} cy={dots[dots.length - 1].y * H} r={32} fill="rgba(100,220,255,0.15)" />
                </Svg>
            );
        }

        case 4: {
            return (
                <Svg width="100%" height="100%" pointerEvents="none" style={{ userSelect: 'none' } as any}>
                    <Rect x={0} y={0} width={W} height={H} fill="#87CEEB" />
                    <Circle cx={W * 0.5} cy={H * 1.5} r={H * 1.2} fill="#4CAF50" />
                    <Circle cx={W * 0.5} cy={H * 1.5} r={H * 1.15} fill="#66BB6A" />
                    <Circle cx={W * 0.8} cy={H * 0.12} r={50} fill="#FFE066" />
                </Svg>
            );
        }

        default:
            return (
                <Svg width="100%" height="100%" pointerEvents="none" style={{ userSelect: 'none' } as any}>
                    <Rect x={0} y={0} width={W} height={H} fill="#1a1a2e" />
                </Svg>
            );
    }
}

// ── Direction Guide Layer ─────────────────────────────────────────────────────

function AnimatedGuideLayer({ scene }: { scene: SceneConfig }) {
    const { width: W, height: H } = useWindowDimensions();
    const pts = expectedPathsData[scene.key] as Array<{ x: number; y: number }>;
    if (!pts || pts.length < 2) return null;

    const startPt = pts[0];
    const endPt = pts[pts.length - 1];

    return (
        <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, { userSelect: 'none' } as any]} pointerEvents="none">
            {/* Start Node (Green Gummy Style) */}
            <Circle cx={startPt.x * W} cy={startPt.y * H} r={28} fill="rgba(76,217,100,0.15)" />
            <Circle cx={startPt.x * W} cy={startPt.y * H} r={20} fill="rgba(76,217,100,0.4)" stroke="#FFF" strokeWidth={2} />
            <Circle cx={startPt.x * W} cy={startPt.y * H} r={10} fill="#4CD964" />
            <Circle cx={startPt.x * W - 4} cy={startPt.y * H - 4} r={3} fill="#FFF" opacity={0.7} />

            {/* End Node (Red Gummy Style) */}
            <Circle cx={endPt.x * W} cy={endPt.y * H} r={24} fill="rgba(255,107,107,0.15)" />
            <Circle cx={endPt.x * W} cy={endPt.y * H} r={16} fill="rgba(255,107,107,0.4)" stroke="#FFF" strokeWidth={2} />
            <Circle cx={endPt.x * W} cy={endPt.y * H} r={6} fill="#FF6B6B" />

            {scene.strokeType === 'dot-to-dot' && pts.map((pt, i) => (
                <G key={`waypoint-${i}`}>
                    <Circle cx={pt.x * W} cy={pt.y * H} r={12} fill="rgba(255,240,80,0.4)" />
                    <Circle cx={pt.x * W} cy={pt.y * H} r={6} fill="rgba(255,240,80,0.85)" />
                </G>
            ))}
        </Svg>
    );
}

function TravelingDotOverlay({ scene, isIdle }: { scene: SceneConfig; isIdle: boolean }) {
    const { width: W, height: H } = useWindowDimensions();
    const pts = expectedPathsData[scene.key] as Array<{ x: number; y: number }>;
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!isIdle || !pts || pts.length < 2) return;

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
    }, [isIdle, scene.key]);

    if (!isIdle || !pts || pts.length < 2 || !visible) return null;

    const distances: number[] = [0];
    let totalDist = 0;
    for (let i = 1; i < pts.length; i++) {
        const dx = (pts[i].x - pts[i - 1].x) * W;
        const dy = (pts[i].y - pts[i - 1].y) * H;
        totalDist += Math.sqrt(dx * dx + dy * dy);
        distances.push(totalDist);
    }

    const targetDist = progress * totalDist;
    let posX = pts[0].x * W;
    let posY = pts[0].y * H;

    for (let i = 1; i < pts.length; i++) {
        if (distances[i] >= targetDist) {
            const segLen = distances[i] - distances[i - 1];
            const segProgress = segLen > 0 ? (targetDist - distances[i - 1]) / segLen : 0;
            posX = (pts[i - 1].x + (pts[i].x - pts[i - 1].x) * segProgress) * W;
            posY = (pts[i - 1].y + (pts[i].y - pts[i - 1].y) * segProgress) * H;
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
                shadowColor: '#FFE066',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 10,
                elevation: 8,
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Text style={{ fontSize: 20 }}>☝️</Text>
            </View>
        </View>
    );
}

// ── Guide Path Renderer ───────────────────────────────────────────────────────

function GuidePathLayer({ scene }: { scene: SceneConfig }) {
    const { width: W, height: H } = useWindowDimensions();
    const pts = expectedPathsData[scene.key] as Array<{ x: number; y: number }>;

    if (scene.strokeType === 'dot-to-dot') {
        return (
            <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, { userSelect: 'none' } as any]} pointerEvents="none">
                {pts.map((pt, i) => (
                    <G key={i}>
                        <Circle cx={pt.x * W} cy={pt.y * H} r={22} fill="rgba(255,240,80,0.25)" />
                        <Circle cx={pt.x * W} cy={pt.y * H} r={14} fill="rgba(255,240,80,0.55)" />
                        <Circle cx={pt.x * W} cy={pt.y * H} r={7} fill="rgba(255,255,255,0.95)" />
                    </G>
                ))}
            </Svg>
        );
    }

    const isCurve = scene.strokeType === 'curve';
    const pathD = getSvgPathFromPoints(pts, isCurve, W, H);

    return (
        <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, { userSelect: 'none' } as any]} pointerEvents="none">
            <Path
                d={pathD}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={24}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <Path
                d={pathD}
                stroke="rgba(255,255,255,0.80)"
                strokeWidth={isCurve ? 5 : 6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            {pts.map((pt, i) => (
                <G key={i}>
                    <Circle cx={pt.x * W} cy={pt.y * H} r={12} fill="rgba(255,255,255,0.30)" />
                    <Circle cx={pt.x * W} cy={pt.y * H} r={6} fill="rgba(255,255,255,0.95)" />
                </G>
            ))}
        </Svg>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

function Stage1Gameplay() {
    const { width: W, height: H } = useWindowDimensions();
    const DIMS = { width: W, height: H };
    const [currentScene, setCurrentScene] = useState(0);
    const [gameState, setGameState] = useState<GameState>('idle');
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; emoji: string } | null>(null);
    const [colorIndex, setColorIndex] = useState(0);

    // Timer state
    const [globalCountdown, setGlobalCountdown] = useState(30);
    const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Mark completion safely via hook
    useWritingCompletion(gameState === 'complete', 1, 3);

    const scene = SCENES[currentScene];
    const expectedPath = expectedPathsData[scene.key] as Array<{ x: number; y: number }>;

    const drawnPointsRef = useRef<Array<{ x: number; y: number }>>([]);
    // Accumulate all drawn points across multiple strokes for accuracy
    const allDrawnPointsRef = useRef<Array<{ x: number; y: number }>>([]);
    const [drawnPathD, setDrawnPathD] = useState('');
    // Hint animation state (when kid gets stuck)
    const hintTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hintTrailRef = useRef('');
    const [hintTrailPath, setHintTrailPath] = useState('');
    const [showingHint, setShowingHint] = useState(false);

    const miloX = useSharedValue(scene.miloStartNorm.x * W - MILO_SIZE / 2);
    const miloY = useSharedValue(scene.miloStartNorm.y * H - MILO_SIZE / 2);

    const miloStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: miloX.value },
            { translateY: miloY.value },
        ],
    }));

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

    const successSound = useAudioPlayer(require('../../../../assets/writing_module_sounds/hip hip hurray.mp3'));
    const sadSound = useAudioPlayer(require('../../../../assets/writing_module_sounds/sad.mp3'));

    const playSuccess = useCallback(() => {
        try {
            successSound.play();
        } catch (_) { /* ignore browser unready issues */ }
    }, [successSound]);

    const resetScene = useCallback(() => {
        drawnPointsRef.current = [];
        allDrawnPointsRef.current = [];
        setDrawnPathD('');
        // Clear hint
        if (hintTimerRef.current) { clearInterval(hintTimerRef.current); hintTimerRef.current = null; }
        hintTrailRef.current = '';
        setHintTrailPath('');
        setShowingHint(false);
        miloX.value = withSpring(scene.miloStartNorm.x * W - MILO_SIZE / 2, { damping: 14, stiffness: 120 });
        miloY.value = withSpring(scene.miloStartNorm.y * H - MILO_SIZE / 2, { damping: 14, stiffness: 120 });
        setColorIndex(c => c + 1);
        setAccuracy(null);
        setFeedback(null);
        setGameState('idle');
    }, [scene, miloX, miloY]);

    const nextScene = useCallback(() => {
        const next = currentScene + 1;
        if (next >= SCENES.length) {
            setGameState('complete');
            return;
        }
        const nextCfg = SCENES[next];
        setCurrentScene(next);
        drawnPointsRef.current = [];
        allDrawnPointsRef.current = [];
        setDrawnPathD('');
        // Clear hint
        if (hintTimerRef.current) { clearInterval(hintTimerRef.current); hintTimerRef.current = null; }
        hintTrailRef.current = '';
        setHintTrailPath('');
        setShowingHint(false);
        miloX.value = nextCfg.miloStartNorm.x * W - MILO_SIZE / 2;
        miloY.value = nextCfg.miloStartNorm.y * H - MILO_SIZE / 2;
        setColorIndex(0);
        setAccuracy(null);
        setFeedback(null);
        setGameState('idle');
    }, [currentScene, miloX, miloY]);

    const panGesture = Gesture.Pan()
        .runOnJS(true)
        .onStart((e) => {
            // Start a new stroke segment — current stroke points reset
            drawnPointsRef.current = [{ x: e.x / W, y: e.y / H }];
            // Stop any hint animation when kid starts drawing
            if (hintTimerRef.current) { clearInterval(hintTimerRef.current); hintTimerRef.current = null; }
            hintTrailRef.current = '';
            setHintTrailPath('');
            setShowingHint(false);
            // MULTI-STROKE: Append new stroke to existing path
            setDrawnPathD(prev => {
                if (prev && prev.startsWith('M')) {
                    return `${prev} M ${e.x} ${e.y}`;
                }
                return `M ${e.x} ${e.y}`;
            });
            setAccuracy(null);
            setFeedback(null);
            setGameState('drawing');
        })
        .onUpdate((e) => {
            drawnPointsRef.current.push({ x: e.x / W, y: e.y / H });
            setDrawnPathD(prev => `${prev} L ${e.x} ${e.y}`);

            // Milo always follows the cursor freely, regardless of stroke type
            miloX.value = withSpring(e.x - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
            miloY.value = withSpring(e.y - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
        })
        .onEnd(() => {
            // MULTI-STROKE: Accumulate this stroke's points
            allDrawnPointsRef.current = allDrawnPointsRef.current.concat(drawnPointsRef.current);

            const acc = computeAccuracy(allDrawnPointsRef.current, expectedPath, DIMS);
            const fb = getFeedback(acc);
            const progresses = canProgress(acc);

            setAccuracy(acc);
            setFeedback(fb);

            if (progresses) {
                miloX.value = withSpring(scene.miloEndNorm.x * W - MILO_SIZE / 2, { damping: 12, stiffness: 100 });
                miloY.value = withSpring(scene.miloEndNorm.y * H - MILO_SIZE / 2, { damping: 12, stiffness: 100 });
                setGameState('success');
                playSuccess();
            } else {
                setGameState('fail');
            }
        });

    const forceEvaluate = useCallback(() => {
        if (allDrawnPointsRef.current.length === 0) return;
        const acc = computeAccuracy(allDrawnPointsRef.current, expectedPath, DIMS);
        const fb = getFeedback(acc);
        const progresses = canProgress(acc);

        setAccuracy(acc);
        setFeedback(fb);

        if (progresses) {
            miloX.value = withSpring(scene.miloEndNorm.x * W - MILO_SIZE / 2, { damping: 12, stiffness: 100 });
            miloY.value = withSpring(scene.miloEndNorm.y * H - MILO_SIZE / 2, { damping: 12, stiffness: 100 });
            setGameState('success');
            playSuccess();
        } else {
            setGameState('fail');
        }
    }, [expectedPath, DIMS, scene, miloX, miloY, playSuccess]);

    const strokeColor = TRAIL_COLORS[colorIndex % TRAIL_COLORS.length];

    // ── Hint Animation (when kid gets stuck) ──────────────────────────────────
    // After 4s of inactivity (idle or fail), animate a rainbow trail along
    // the expected path to show the kid how to draw.

    const stopHint = useCallback(() => {
        if (hintTimerRef.current) { clearInterval(hintTimerRef.current); hintTimerRef.current = null; }
        hintTrailRef.current = '';
        setHintTrailPath('');
        setShowingHint(false);
    }, []);

    const runHintAnimation = useCallback(() => {
        const pts = expectedPath;
        if (!pts || pts.length < 2) return;

        setShowingHint(true);
        hintTrailRef.current = '';
        setHintTrailPath('');

        let step = 0;
        const total = pts.length;
        const intervalMs = Math.max(40, Math.round(2500 / total));

        if (hintTimerRef.current) clearInterval(hintTimerRef.current);

        hintTimerRef.current = setInterval(() => {
            if (step >= total) {
                if (hintTimerRef.current) clearInterval(hintTimerRef.current);
                hintTimerRef.current = null;
                // Keep trail visible briefly then clear
                setTimeout(() => {
                    stopHint();
                }, 1200);
                return;
            }
            const pt = pts[step];
            const px = pt.x * W;
            const py = pt.y * H;
            if (step === 0) {
                hintTrailRef.current = `M ${px} ${py}`;
            } else {
                hintTrailRef.current += ` L ${px} ${py}`;
            }
            setHintTrailPath(hintTrailRef.current);
            step++;
        }, intervalMs);
    }, [expectedPath, stopHint]);

    // Idle detection — trigger hint after 4s of inactivity
    useEffect(() => {
        if (gameState === 'drawing' || gameState === 'success' || gameState === 'complete') return;
        if (showingHint) return;
        const timer = setTimeout(() => {
            runHintAnimation();
        }, 4000);
        return () => clearTimeout(timer);
    }, [gameState, showingHint, runHintAnimation, currentScene]);

    if (gameState === 'complete') {
        return (
            <GestureHandlerRootView style={styles.root}>
                <SafeAreaView style={[styles.safe, styles.completeBg]}>
                    <View style={styles.completeContainer}>
                        <Text style={styles.completeEmoji}>🎊</Text>
                        <Text style={styles.completeTitle}>Level 1 Complete!</Text>
                        <Text style={styles.completeSubtitle}>You helped Milo through every adventure!</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
                            <Text style={{ fontSize: 36 }}>⭐</Text>
                            <Text style={{ fontSize: 36 }}>⭐</Text>
                            <Text style={{ fontSize: 36 }}>⭐</Text>
                        </View>
                        <View style={styles.sceneList}>
                            {SCENES.map((s, i) => (
                                <Text key={i} style={styles.sceneListItem}>✅  {s.title}</Text>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.nextBtn, { backgroundColor: '#4ECDC4' }]}
                            onPress={() => router.push('/writing-stage2' as any)}
                        >
                            <Text style={styles.retryBtnText}>Next Level → 🏗️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.retryBtn, styles.retryBtnAlt]}
                            onPress={() => {
                                setCurrentScene(0);
                                miloX.value = SCENES[0].miloStartNorm.x * W - MILO_SIZE / 2;
                                miloY.value = SCENES[0].miloStartNorm.y * H - MILO_SIZE / 2;
                                setAccuracy(null);
                                setFeedback(null);
                                setColorIndex(0);
                                drawnPointsRef.current = [];
                                allDrawnPointsRef.current = [];
                                setDrawnPathD('');
                                if (hintTimerRef.current) { clearInterval(hintTimerRef.current); hintTimerRef.current = null; }
                                hintTrailRef.current = '';
                                setHintTrailPath('');
                                setShowingHint(false);
                                setGameState('idle');
                            }}
                        >
                            <Text style={styles.retryBtnTextSmall}>Play Again 🔁</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/writing' as any)}
                            style={{ marginTop: 8 }}
                        >
                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Back to Levels</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={styles.root}>
            <SafeAreaView style={styles.safe}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
                        <TouchableOpacity
                            onPress={() => router.push('/writing' as any)}
                            style={{ position: 'absolute', left: 0, padding: 8 }}
                        >
                            <Text style={{ fontSize: 22 }}>🏠</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{scene.title}</Text>
                    </View>
                    <View style={styles.progressRow}>
                        {SCENES.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.progressDot,
                                    i === currentScene && styles.progressDotActive,
                                    i < currentScene && styles.progressDotDone,
                                ]}
                            />
                        ))}
                    </View>
                </View>

                <GestureDetector gesture={panGesture}>
                    <View style={styles.canvasWrapper}>
                        {/* Layer 1: Scene background — no pointer events */}
                        <View style={StyleSheet.absoluteFill} pointerEvents="none">
                            <SceneBackground sceneIdx={currentScene} />
                        </View>

                        {/* Layer 2: Guide path — no pointer events */}
                        <View style={StyleSheet.absoluteFill} pointerEvents="none">
                            <GuidePathLayer scene={scene} />
                            <AnimatedGuideLayer scene={scene} />
                        </View>

                        {/* Layer 3: Crayon trail — above guides, below Milo, no pointer events */}
                        {(gameState === 'drawing' || gameState === 'success' || gameState === 'fail') && (
                            <Svg
                                width="100%"
                                height="100%"
                                style={[StyleSheet.absoluteFill, { userSelect: 'none', touchAction: 'none' } as any]}
                                pointerEvents="none"
                            >
                                <G>
                                    {/* Wide glow halo */}
                                    <Path
                                        d={drawnPathD}
                                        stroke={strokeColor}
                                        strokeWidth={36}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                        opacity={0.55}
                                    />
                                    {/* Main crayon stroke */}
                                    <Path
                                        d={drawnPathD}
                                        stroke={strokeColor}
                                        strokeWidth={18}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                    />
                                    {/* Inner white highlight — crayon texture */}
                                    <Path
                                        d={drawnPathD}
                                        stroke="#FFF"
                                        strokeWidth={5}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                        opacity={0.7}
                                    />
                                </G>
                            </Svg>
                        )}

                        {/* Hint Trail layer (when kid is stuck) */}
                        {hintTrailPath !== '' && hintTrailPath.startsWith('M') && (
                            <Svg
                                width="100%"
                                height="100%"
                                style={[StyleSheet.absoluteFill, { userSelect: 'none', touchAction: 'none' } as any]}
                                pointerEvents="none"
                            >
                                <Defs>
                                    <SvgLinearGradient id="stage1HintRainbow" x1="0" y1="0" x2={String(W)} y2={String(H)} gradientUnits="userSpaceOnUse">
                                        <Stop offset="0%" stopColor="#FF6B6B" />
                                        <Stop offset="20%" stopColor="#FF9F43" />
                                        <Stop offset="40%" stopColor="#FECA57" />
                                        <Stop offset="60%" stopColor="#6BCB77" />
                                        <Stop offset="80%" stopColor="#48DBFB" />
                                        <Stop offset="100%" stopColor="#A29BFE" />
                                    </SvgLinearGradient>
                                </Defs>
                                <G>
                                    <Path d={hintTrailPath} stroke="url(#stage1HintRainbow)" strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.15} />
                                    <Path d={hintTrailPath} stroke="url(#stage1HintRainbow)" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.4} />
                                    <Path d={hintTrailPath} stroke="url(#stage1HintRainbow)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.75} />
                                    <Path d={hintTrailPath} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.5} />
                                </G>
                            </Svg>
                        )}

                        {/* Layer 4: Milo sprite */}
                        <Animated.View style={[styles.milo, miloStyle]} pointerEvents="none">
                            <RNAnimated.View style={{ transform: [{ translateY: bobAnim }] }}>
                                <Text style={styles.miloEmoji}>🐒</Text>
                            </RNAnimated.View>
                        </Animated.View>

                        <TravelingDotOverlay scene={scene} isIdle={gameState === 'idle'} />

                        {gameState === 'idle' && (
                            <View style={styles.hintBanner} pointerEvents="none">
                                <Text style={styles.hintText}>{scene.hint}</Text>
                            </View>
                        )}

                        {/* Timer & Done Button UI */}
                        {(gameState === 'drawing' || gameState === 'idle') && (
                            <View style={styles.timerContainer} pointerEvents="box-none">
                                <View style={styles.timerBadge}>
                                    <Text style={styles.timerText}>⏳ {globalCountdown}s</Text>
                                </View>
                                <TouchableOpacity style={styles.doneBtn} onPress={() => forceEvaluate()}>
                                    <Text style={styles.doneBtnText}>Done ✅</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {gameState === 'success' && feedback && (
                            <View style={styles.overlay}>
                                <Text style={styles.overlayEmoji}>{feedback.emoji}</Text>
                                <Text style={styles.overlayTitle}>{feedback.message}</Text>
                                {accuracy !== null && (
                                    <View style={styles.accuracyBadge}>
                                        <Text style={styles.accuracyText}>Accuracy: {accuracy}%</Text>
                                    </View>
                                )}
                                {currentScene < SCENES.length - 1 ? (
                                    <TouchableOpacity style={styles.nextBtn} onPress={nextScene}>
                                        <Text style={styles.retryBtnText}>Next Scene →</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.nextBtn} onPress={nextScene}>
                                        <Text style={styles.retryBtnText}>Finish Level 🎊</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={[styles.retryBtn, styles.retryBtnAlt]} onPress={resetScene}>
                                    <Text style={styles.retryBtnTextSmall}>Try Again 🔁</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {gameState === 'fail' && feedback && (
                            <View style={styles.overlay}>
                                <Text style={styles.overlayEmoji}>{feedback.emoji}</Text>
                                <Text style={styles.overlayTitle}>{feedback.message}</Text>
                                {accuracy !== null && (
                                    <View style={[styles.accuracyBadge, styles.accuracyBadgeFail]}>
                                        <Text style={styles.accuracyText}>Accuracy: {accuracy}%</Text>
                                    </View>
                                )}
                                <Text style={styles.needScoreText}>Need 70% to advance</Text>
                                <TouchableOpacity style={styles.retryBtn} onPress={resetScene}>
                                    <Text style={styles.retryBtnText}>Try Again 🔁</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </GestureDetector>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#1a1a2e' },
    safe: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 10,
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,46,0.95)',
        zIndex: 10,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFE066', letterSpacing: 0.5 },
    progressRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    progressDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    progressDotActive: { backgroundColor: '#FFE066', transform: [{ scale: 1.3 }] },
    progressDotDone: { backgroundColor: '#4ECDC4' },
    // **CRITICAL FIX**: touchAction: 'none' forces Web browsers to intercept gestures locally instead of scrolling the page
    canvasWrapper: { flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'none' as any },
    milo: {
        position: 'absolute',
        width: MILO_SIZE,
        height: MILO_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miloEmoji: { fontSize: 40 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(26,26,46,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 24,
    },
    overlayEmoji: { fontSize: 72 },
    overlayTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFE066',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    accuracyBadge: {
        backgroundColor: 'rgba(78,205,196,0.25)',
        borderWidth: 1.5,
        borderColor: '#4ECDC4',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 30,
    },
    accuracyBadgeFail: {
        backgroundColor: 'rgba(255,107,107,0.18)',
        borderColor: '#FF6B6B',
    },
    accuracyText: { fontSize: 20, fontWeight: '800', color: '#fff' },
    needScoreText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.55)',
        fontWeight: '600',
    },
    nextBtn: {
        backgroundColor: '#FFE066',
        paddingHorizontal: 36,
        paddingVertical: 16,
        borderRadius: 50,
        shadowColor: '#FFE066',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 10,
    },
    retryBtn: {
        backgroundColor: '#FFE066',
        paddingHorizontal: 40,
        paddingVertical: 20,
        borderRadius: 50,
        shadowColor: '#FFE066',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        elevation: 12,
    },
    retryBtnAlt: {
        backgroundColor: '#FF6B6B',
        shadowColor: '#FF6B6B',
    },
    retryBtnText: { fontSize: 20, fontWeight: '900', color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: 1 },
    retryBtnTextSmall: { fontSize: 20, fontWeight: '900', color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: 1 },
    hintBanner: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
    hintText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.75)',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    timerContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        alignItems: 'flex-end',
        gap: 12,
        zIndex: 20,
    },
    timerBadge: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    timerText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF'
    },
    doneBtn: {
        backgroundColor: '#4CD964',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: '#4CD964',
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 5
    },
    doneBtnText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
    },
    completeBg: { backgroundColor: '#1a1a2e' },
    completeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
        padding: 32,
    },
    completeEmoji: { fontSize: 80 },
    completeTitle: { fontSize: 36, fontWeight: '900', color: '#FFE066', textAlign: 'center' },
    completeSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 8,
    },
    sceneList: { gap: 6, alignItems: 'flex-start' },
    sceneListItem: { fontSize: 15, color: '#4ECDC4', fontWeight: '700' },
});

// ── Stage 1 Entry with Story Intro ────────────────────────────────────────────

export default function Stage1Scene1() {
    const [showIntro, setShowIntro] = useState(true);

    if (showIntro) {
        return (
            <StoryIntro
                stageNumber={1}
                title="Help Milo Move!"
                storyLines={[
                    "Hi friend! I'm Milo the monkey! 🐒",
                    "I want to explore the jungle, but there are many tricky places ahead — tall trees, swinging vines, bridges, and hills.",
                    "Can you draw the paths to help me move through the jungle?",
                ]}
                goalMessage="Draw the path and help Milo travel through the jungle!"
                buttonLabel="Start Adventure"
                onStart={() => setShowIntro(false)}
            />
        );
    }

    return <Stage1Gameplay />;
}
