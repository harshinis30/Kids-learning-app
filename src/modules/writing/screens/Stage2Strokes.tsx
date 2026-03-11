/**
 * Stage2Strokes.tsx — "Shape & Curve Practice" · Level 2
 *
 * 9 sequential levels: Wave, Spiral, Loop, Circle, Oval, Square, Triangle, Diamond, Star
 * Features a cheerful level-select path + individual drawing canvases with a 3-phase
 * guided pointer system, star earning, adaptive tracking, and Milo reactions.
 *
 * 2D flat illustration only — Toca Boca meets Duolingo Kids.
 */

import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import StoryIntro from './StoryIntro';
import {
    Animated,
    Dimensions,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useWritingCompletion } from './WritingLevelHub';

// ── Constants ─────────────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('window');

const PAL = {
    sky: '#E8F4FD',
    skyDeep: '#87CEEB',
    canvas: '#FFFDF5',
    sun: '#FFD700',
    mint: '#7EFFD4',
    coral: '#FF7F6E',
    lavender: '#C5B4E3',
    grassLight: '#A8E6A1',
    grassDark: '#7BC67E',
    brown: '#8D6E63',
    textDark: '#3E2723',
    white: '#FFF',
    lockGray: '#B0BEC5',
};

const TRAIL_COLORS = ['#FF7F6E', '#87CEEB', '#98E8C1', '#C5B4E3', '#FFD700', '#FF7F6E', '#87CEEB', '#98E8C1', '#C5B4E3'];

// ── Shape Definitions ─────────────────────────────────────────────────────────

interface LevelDef {
    id: number;
    name: string;
    emoji: string;
    section: 'A' | 'B';
    /** Normalized points (0-1) defining the guide path on the canvas */
    guidePath: Array<{ x: number; y: number }>;
    /** Whether path is a closed shape */
    closed: boolean;
    /** Whether to render as smooth curve */
    smooth: boolean;
    /** Corner/key-point indices for numbered dots */
    keyPoints: number[];
    /** Tolerance radius in px */
    tolerance: number;
}

const LEVELS: LevelDef[] = [
    // Section A — Curves
    {
        id: 1, name: 'Wave', emoji: '🌊', section: 'A',
        guidePath: Array.from({ length: 30 }, (_, i) => ({
            x: 0.1 + (i / 29) * 0.8,
            y: 0.5 + Math.sin((i / 29) * Math.PI * 3) * 0.15,
        })),
        closed: false, smooth: true, keyPoints: [0, 7, 15, 22, 29], tolerance: 30,
    },
    {
        id: 2, name: 'Spiral', emoji: '🌀', section: 'A',
        guidePath: Array.from({ length: 40 }, (_, i) => {
            const t = i / 39;
            const angle = t * Math.PI * 4;
            const r = 0.35 - t * 0.28;
            return { x: 0.5 + Math.cos(angle) * r, y: 0.5 + Math.sin(angle) * r };
        }),
        closed: false, smooth: true, keyPoints: [0, 10, 20, 30, 39], tolerance: 32,
    },
    {
        id: 3, name: 'Loop', emoji: '➰', section: 'A',
        guidePath: Array.from({ length: 36 }, (_, i) => {
            const t = (i / 35) * Math.PI * 2;
            return {
                x: 0.5 + Math.cos(t) * 0.25 + Math.cos(t * 2) * 0.08,
                y: 0.5 + Math.sin(t) * 0.3,
            };
        }),
        closed: true, smooth: true, keyPoints: [0, 9, 18, 27], tolerance: 30,
    },
    // Section B — Shapes
    {
        id: 4, name: 'Circle', emoji: '⭕', section: 'B',
        guidePath: Array.from({ length: 36 }, (_, i) => {
            const t = (i / 35) * Math.PI * 2;
            return { x: 0.5 + Math.cos(t - Math.PI / 2) * 0.3, y: 0.5 + Math.sin(t - Math.PI / 2) * 0.3 };
        }),
        closed: true, smooth: true, keyPoints: [0, 9, 18, 27], tolerance: 28,
    },
    {
        id: 5, name: 'Oval', emoji: '🥚', section: 'B',
        guidePath: Array.from({ length: 36 }, (_, i) => {
            const t = (i / 35) * Math.PI * 2;
            return { x: 0.5 + Math.cos(t - Math.PI / 2) * 0.35, y: 0.5 + Math.sin(t - Math.PI / 2) * 0.22 };
        }),
        closed: true, smooth: true, keyPoints: [0, 9, 18, 27], tolerance: 28,
    },
    {
        id: 6, name: 'Square', emoji: '⬜', section: 'B',
        guidePath: [
            { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.25 }, { x: 0.75, y: 0.75 }, { x: 0.25, y: 0.75 }, { x: 0.25, y: 0.25 },
        ],
        closed: true, smooth: false, keyPoints: [0, 1, 2, 3, 4], tolerance: 30,
    },
    {
        id: 7, name: 'Triangle', emoji: '🔺', section: 'B',
        guidePath: [
            { x: 0.5, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }, { x: 0.5, y: 0.2 },
        ],
        closed: true, smooth: false, keyPoints: [0, 1, 2, 3], tolerance: 30,
    },
    {
        id: 8, name: 'Diamond', emoji: '💎', section: 'B',
        guidePath: [
            { x: 0.5, y: 0.15 }, { x: 0.85, y: 0.5 }, { x: 0.5, y: 0.85 }, { x: 0.15, y: 0.5 }, { x: 0.5, y: 0.15 },
        ],
        closed: true, smooth: false, keyPoints: [0, 1, 2, 3, 4], tolerance: 30,
    },
    {
        id: 9, name: 'Star', emoji: '⭐', section: 'B',
        guidePath: (() => {
            const pts: Array<{ x: number; y: number }> = [];
            for (let i = 0; i < 5; i++) {
                const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                pts.push({ x: 0.5 + Math.cos(outerAngle) * 0.38, y: 0.5 + Math.sin(outerAngle) * 0.38 });
                const innerAngle = outerAngle + Math.PI / 5;
                pts.push({ x: 0.5 + Math.cos(innerAngle) * 0.16, y: 0.5 + Math.sin(innerAngle) * 0.16 });
            }
            pts.push(pts[0]); // close
            return pts;
        })(),
        closed: true, smooth: false, keyPoints: [0, 2, 4, 6, 8, 10], tolerance: 38,
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSvgPath(
    pts: Array<{ x: number; y: number }>,
    canvasW: number,
    canvasH: number,
    smooth: boolean
): string {
    if (!pts || pts.length === 0) return '';
    const p = pts.map(pt => ({ x: pt.x * canvasW, y: pt.y * canvasH }));
    if (p.length === 1) return `M ${p[0].x} ${p[0].y}`;
    let d = `M ${p[0].x} ${p[0].y}`;
    if (smooth && p.length > 2) {
        for (let i = 1; i < p.length - 1; i++) {
            const mx = (p[i].x + p[i + 1].x) / 2;
            const my = (p[i].y + p[i + 1].y) / 2;
            d += ` Q ${p[i].x} ${p[i].y} ${mx} ${my}`;
        }
        d += ` L ${p[p.length - 1].x} ${p[p.length - 1].y}`;
    } else {
        for (let i = 1; i < p.length; i++) {
            d += ` L ${p[i].x} ${p[i].y}`;
        }
    }
    return d;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function nearestDistToPath(
    px: number,
    py: number,
    pts: Array<{ x: number; y: number }>,
    cW: number,
    cH: number
): number {
    let min = Infinity;
    for (const pt of pts) {
        const d = dist({ x: px, y: py }, { x: pt.x * cW, y: pt.y * cH });
        if (d < min) min = d;
    }
    return min;
}

// ── Persistent Level Progress ─────────────────────────────────────────────────

interface LevelProgress {
    starsEarned: number;
    completed: boolean;
    attempts: number;
    offPathCount: number;
    phaseReached: number;
}

function getInitialProgress(): Record<number, LevelProgress> {
    const p: Record<number, LevelProgress> = {};
    LEVELS.forEach(l => {
        p[l.id] = { starsEarned: 0, completed: false, attempts: 0, offPathCount: 0, phaseReached: 0 };
    });
    return p;
}

// ── Level Select Background ──────────────────────────────────────────────────

function LevelSelectBg() {
    return (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Rect x={0} y={0} width={W} height={H} fill={PAL.sky} />
            {/* Sun */}
            <Circle cx={W * 0.85} cy={H * 0.06} r={50} fill={PAL.sun} opacity={0.9} />
            <Circle cx={W * 0.85} cy={H * 0.06} r={65} fill={PAL.sun} opacity={0.15} />
            {/* Clouds */}
            <Ellipse cx={W * 0.15} cy={H * 0.05} rx={55} ry={20} fill={PAL.white} opacity={0.85} />
            <Ellipse cx={W * 0.5} cy={H * 0.08} rx={65} ry={22} fill={PAL.white} opacity={0.7} />
            {/* Hills */}
            <Ellipse cx={W * 0.3} cy={H * 0.92} rx={W * 0.6} ry={120} fill={PAL.grassLight} />
            <Ellipse cx={W * 0.8} cy={H * 0.95} rx={W * 0.5} ry={100} fill={PAL.grassDark} />
            <Rect x={0} y={H * 0.88} width={W} height={H * 0.12} fill={PAL.grassDark} />
        </Svg>
    );
}

// ── Level Bubble ──────────────────────────────────────────────────────────────

function LevelBubble({
    level,
    progress,
    isCurrent,
    onPress,
}: {
    level: LevelDef;
    progress: LevelProgress;
    isCurrent: boolean;
    onPress: () => void;
}) {
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        if (isCurrent) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isCurrent, pulseAnim]);

    const unlocked = progress.completed || isCurrent || level.id === 1;
    const completed = progress.completed;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={s.bubbleTouch}>
            <Animated.View
                style={[
                    s.bubbleOuter,
                    !unlocked && s.bubbleLocked,
                    isCurrent && s.bubbleCurrent,
                    { transform: [{ scale: pulseAnim }] },
                ]}
            >
                {/* Shape mini-preview */}
                <View style={[s.bubbleInner, !unlocked && { opacity: 0.3 }]}>
                    <Text style={s.bubbleEmoji}>{level.emoji}</Text>
                </View>

                {/* Stars on top */}
                {completed && progress.starsEarned > 0 && (
                    <View style={s.bubbleStars}>
                        {Array.from({ length: Math.min(progress.starsEarned, 3) }, (_, i) => (
                            <Text key={i} style={{ fontSize: 12 }}>⭐</Text>
                        ))}
                    </View>
                )}

                {/* Lock icon */}
                {!unlocked && (
                    <View style={s.lockOverlay}>
                        <Text style={{ fontSize: 22 }}>🔒</Text>
                    </View>
                )}
            </Animated.View>

            {/* Label */}
            <Text style={[s.bubbleLabel, !unlocked && { color: PAL.lockGray }]}>{level.name}</Text>

            {/* Milo stands next to current level */}
            {isCurrent && (
                <Text style={s.miloAtBubble}>🐵</Text>
            )}
        </TouchableOpacity>
    );
}

// ── Milo Reactions ────────────────────────────────────────────────────────────

type MiloState = 'idle' | 'demo' | 'good' | 'offpath' | 'segment' | 'complete' | 'star' | 'nudge' | 'boss';

function MiloReactor({ state }: { state: MiloState }) {
    const [bounceAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: -10, duration: 600, useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
            ])
        ).start();
    }, [bounceAnim]);

    useEffect(() => {
        if (state === 'complete' || state === 'star' || state === 'boss') {
            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1.4, friction: 3, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
            ]).start();
        } else if (state === 'segment') {
            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1.2, friction: 3, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
            ]).start();
        }
    }, [state, scaleAnim]);

    const emojiMap: Record<MiloState, string> = {
        idle: '🐵', demo: '👉', good: '👍', offpath: '🤔',
        segment: '👏', complete: '🙌', star: '🌟', nudge: '👋', boss: '🕺',
    };
    const speechMap: Record<MiloState, string> = {
        idle: '', demo: '👀', good: '✨', offpath: '❓',
        segment: '⭐', complete: '🎉', star: '⭐', nudge: '☝️', boss: '🏆',
    };

    return (
        <View style={s.miloZone} pointerEvents="none">
            {speechMap[state] !== '' && (
                <View style={s.miloBubble}>
                    <Text style={{ fontSize: 18 }}>{speechMap[state]}</Text>
                </View>
            )}
            <Animated.View style={{ transform: [{ translateY: bounceAnim }, { scale: scaleAnim }] }}>
                <Text style={{ fontSize: 55 }}>{emojiMap[state]}</Text>
            </Animated.View>
        </View>
    );
}

// ── Monkey Demo Guide ─────────────────────────────────────────────────────────

function SparkleBall({ x, y, visible }: { x: number; y: number; visible: boolean }) {
    const [bounceAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: -8, duration: 350, useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
            ])
        ).start();
    }, [bounceAnim]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                s.sparkleBall,
                {
                    left: x - 22,
                    top: y - 22,
                    transform: [{ translateY: bounceAnim }],
                },
            ]}
            pointerEvents="none"
        >
            <Text style={{ fontSize: 36 }}>🐒</Text>
        </Animated.View>
    );
}

// ── Star Pop Animation ────────────────────────────────────────────────────────

function StarSlots({ earned }: { earned: number }) {
    return (
        <View style={s.starSlots}>
            {[1, 2, 3].map(i => (
                <Text key={i} style={[s.starSlot, i <= earned && s.starSlotEarned]}>
                    {i <= earned ? '⭐' : '☆'}
                </Text>
            ))}
        </View>
    );
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function MiniConfetti({ visible }: { visible: boolean }) {
    const [pieces] = useState(() =>
        Array.from({ length: 16 }, (_, i) => ({
            anim: new Animated.Value(0),
            x: Math.random() * W,
            emoji: ['🎊', '🎉', '✨', '⭐', '💫', '🌈'][i % 6],
            delay: Math.random() * 300,
        }))
    );

    useEffect(() => {
        if (visible) {
            pieces.forEach(p => {
                p.anim.setValue(0);
                Animated.timing(p.anim, { toValue: 1, duration: 1800, delay: p.delay, useNativeDriver: true }).start();
            });
        }
    }, [visible, pieces]);

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.map((p, i) => {
                const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-40, H + 40] });
                const opacity = p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
                return (
                    <Animated.Text key={i} style={{ position: 'absolute', left: p.x, top: 0, fontSize: 22, transform: [{ translateY: ty }], opacity }}>
                        {p.emoji}
                    </Animated.Text>
                );
            })}
        </View>
    );
}

// ── Canvas Drawing Surface ────────────────────────────────────────────────────

const CANVAS_PAD = 20;
const CANVAS_W = W - CANVAS_PAD * 2;
const CANVAS_H = H * 0.55;

type Phase = 'demo' | 'guided' | 'free';

function DrawingCanvas({
    level,
    onComplete,
    onStarEarned,
}: {
    level: LevelDef;
    onComplete: (stars: number) => void;
    onStarEarned: (starNum: number) => void;
}) {
    const [phase, setPhase] = useState<Phase>('demo');
    const [miloState, setMiloState] = useState<MiloState>('idle');
    const [drawnPath, setDrawnPath] = useState('');
    const drawnPathRef = useRef(''); // Instant sync — avoids React batching SVG parse errors
    const [starsEarned, setStarsEarned] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [sparklePos, setSparklePos] = useState({ x: 0, y: 0 });
    const [sparkleVisible, setSparkleVisible] = useState(false);
    const [demoProgress, setDemoProgress] = useState(0);
    const [showGuide, setShowGuide] = useState(true);
    const [showKeyDots, setShowKeyDots] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const [completed, setCompleted] = useState(false);

    // *** CRITICAL: Use refs so PanResponder always reads latest state ***
    const phaseRef = useRef<Phase>(phase);
    const completedRef = useRef(completed);
    const starsEarnedRef = useRef(starsEarned);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { completedRef.current = completed; }, [completed]);
    useEffect(() => { starsEarnedRef.current = starsEarned; }, [starsEarned]);

    const drawnPointsRef = useRef<Array<{ x: number; y: number }>>([]);
    const onPathCountRef = useRef(0);
    const totalPointsRef = useRef(0);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const trailColor = TRAIL_COLORS[(level.id - 1) % TRAIL_COLORS.length];

    const guideSvgPath = buildSvgPath(level.guidePath, CANVAS_W, CANVAS_H, level.smooth);

    // ── Demo Animation ────────────────────────────────────────────────────────

    const runDemo = useCallback(() => {
        setPhase('demo');
        setMiloState('demo');
        setSparkleVisible(true);
        setDemoProgress(0);
        drawnPathRef.current = '';
        setDrawnPath('');
        drawnPointsRef.current = [];

        let step = 0;
        const total = level.guidePath.length;

        if (demoTimerRef.current) clearInterval(demoTimerRef.current);

        // Normalize speed: all shapes take ~2.5s regardless of point count
        const intervalMs = Math.max(40, Math.round(2500 / total));

        demoTimerRef.current = setInterval(() => {
            if (step >= total) {
                if (demoTimerRef.current) clearInterval(demoTimerRef.current);
                setSparkleVisible(false);
                setMiloState('idle');
                setTimeout(() => {
                    setPhase('guided');
                    setShowGuide(true);
                    setShowKeyDots(true);
                }, 800);
                return;
            }
            const pt = level.guidePath[step];
            setSparklePos({ x: pt.x * CANVAS_W, y: pt.y * CANVAS_H });
            setDemoProgress(step / (total - 1));
            step++;
        }, intervalMs);
    }, [level]);

    // Auto-play demo on mount
    useEffect(() => {
        const t = setTimeout(runDemo, 500);
        return () => {
            clearTimeout(t);
            if (demoTimerRef.current) clearInterval(demoTimerRef.current);
        };
    }, [runDemo]);

    // Idle nudge
    useEffect(() => {
        if (phase === 'demo' || completed) return;
        const resetIdle = () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
                setMiloState('nudge');
                setTimeout(() => setMiloState('idle'), 2000);
            }, 5000);
        };
        resetIdle();
        return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
    }, [phase, isDrawing, completed]);

    // ── Checkpoint State ──────────────────────────────────────────────────────
    // Build pixel-position list for each key waypoint.
    // For closed shapes the last keyPoint == first keyPoint visually — skip it.
    const effectiveCheckpoints = React.useMemo(() => {
        const pts = level.keyPoints.map(idx => ({
            x: level.guidePath[idx].x * CANVAS_W,
            y: level.guidePath[idx].y * CANVAS_H,
        }));
        // Only skip the last checkpoint when it's physically the same position as the first
        // (Square/Triangle/Diamond/Star close back to start, but Loop/Circle/Oval don't)
        if (level.closed && pts.length > 1) {
            const first = pts[0];
            const last = pts[pts.length - 1];
            const d = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
            if (d < 8) pts.pop(); // positions are identical — drop duplicate
        }
        return pts;
    }, [level]);

    const [nextCpIdx, setNextCpIdx] = useState(0);
    const [reachedCps, setReachedCps] = useState<Set<number>>(new Set());
    const nextCpIdxRef = useRef(0);
    const reachedCpsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        setNextCpIdx(0);
        setReachedCps(new Set());
        nextCpIdxRef.current = 0;
        reachedCpsRef.current = new Set();
    }, [level.id]);

    // ── Drawing Handler (checkpoint-based) ───────────────────────────────────

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                if (phaseRef.current === 'demo' || completedRef.current) return;
                const { locationX, locationY } = evt.nativeEvent;
                drawnPointsRef.current = [{ x: locationX, y: locationY }];
                drawnPathRef.current = `M ${locationX} ${locationY}`;
                setDrawnPath(drawnPathRef.current);
                onPathCountRef.current = 0;
                totalPointsRef.current = 0;
                setIsDrawing(true);
                setMiloState('idle');
                // Reset checkpoint tracking each new stroke
                nextCpIdxRef.current = 0;
                reachedCpsRef.current = new Set();
                setNextCpIdx(0);
                setReachedCps(new Set());
            },
            onPanResponderMove: (evt) => {
                if (phaseRef.current === 'demo' || completedRef.current) return;
                const { locationX, locationY } = evt.nativeEvent;
                const clampedX = Math.max(0, Math.min(CANVAS_W, locationX));
                const clampedY = Math.max(0, Math.min(CANVAS_H, locationY));
                drawnPointsRef.current.push({ x: clampedX, y: clampedY });
                if (!drawnPathRef.current || !drawnPathRef.current.startsWith('M')) {
                    drawnPathRef.current = `M ${clampedX} ${clampedY}`;
                } else {
                    drawnPathRef.current += ` L ${clampedX} ${clampedY}`;
                }
                setDrawnPath(drawnPathRef.current);
                totalPointsRef.current++;

                // Sequential checkpoint detection
                const curCp = nextCpIdxRef.current;
                if (curCp < effectiveCheckpoints.length) {
                    const cp = effectiveCheckpoints[curCp];
                    const d = dist({ x: clampedX, y: clampedY }, cp);
                    if (d <= level.tolerance * 1.4) {
                        const newReached = new Set(reachedCpsRef.current);
                        newReached.add(curCp);
                        reachedCpsRef.current = newReached;
                        setReachedCps(new Set(newReached));
                        const newCp = curCp + 1;
                        nextCpIdxRef.current = newCp;
                        setNextCpIdx(newCp);
                        setMiloState('segment');
                        // Guide monkey to next checkpoint
                        if (newCp < effectiveCheckpoints.length && phaseRef.current === 'guided') {
                            const next = effectiveCheckpoints[newCp];
                            setSparklePos({ x: next.x, y: next.y });
                            setSparkleVisible(true);
                        }
                    }
                }
            },
            onPanResponderRelease: () => {
                if (phaseRef.current === 'demo' || completedRef.current) return;
                setIsDrawing(false);
                setSparkleVisible(false);

                const totalCps = effectiveCheckpoints.length;
                const reached = reachedCpsRef.current.size;

                if (reached === 0) { setMiloState('nudge'); return; }
                if (reached < totalCps) { setMiloState('nudge'); return; }

                // All checkpoints reached — success!
                setCompleted(true);

                if (phaseRef.current === 'guided') {
                    // 3 stars — complete immediately, no free-draw phase
                    setStarsEarned(3);
                    onStarEarned(1);
                    setTimeout(() => onStarEarned(2), 400);
                    setTimeout(() => onStarEarned(3), 800);
                    setMiloState(level.id === 9 ? 'boss' : 'complete');
                    setShowConfetti(true);
                    setTimeout(() => { onComplete(3); }, 2500);
                }
            },
        })
    ).current;

    // ── Key Point Dots (checkpoint indicators) ────────────────────────────────

    const keyDots = showKeyDots
        ? effectiveCheckpoints.map((cp, i) => {
            const isStart = i === 0;
            const isReached = reachedCps.has(i);
            const isNextTarget = i === nextCpIdx;
            return (
                <View
                    key={i}
                    style={[
                        s.keyDot,
                        {
                            left: cp.x - 16,
                            top: cp.y - 16,
                            backgroundColor: isReached ? '#4CD964'
                                : isStart ? '#4CD964'
                                : isNextTarget ? PAL.sun
                                : PAL.white,
                            borderColor: isReached ? '#2E7D32'
                                : isStart ? '#2E7D32'
                                : isNextTarget ? '#B8860B'
                                : '#BDBDBD',
                            borderWidth: isNextTarget ? 3.5 : 2.5,
                        },
                    ]}
                    pointerEvents="none"
                >
                    <Text style={[s.keyDotText, (isStart || isReached) && { color: PAL.white }]}>
                        {isReached ? '✓' : isStart ? '▶' : i + 1}
                    </Text>
                </View>
            );
        })
        : null;


    return (
        <View style={s.canvasOuter}>
            {/* Canvas background */}
            <View style={s.canvasBg}>
                <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} rx={20} fill={PAL.canvas} />
                </Svg>

                {/* Guide path */}
                {showGuide && (
                    <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Path
                            d={guideSvgPath}
                            stroke={PAL.mint}
                            strokeWidth={4}
                            strokeDasharray="12,8"
                            strokeLinecap="round"
                            fill="none"
                            opacity={0.7}
                        />
                    </Svg>
                )}

                {/* Drawn trail — only render valid SVG paths that start with M */}
                {drawnPath !== '' && drawnPath.startsWith('M') && (
                    <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                        <G>
                            {/* Outer glow */}
                            <Path d={drawnPath} stroke={trailColor} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.25} />
                            {/* Main trail */}
                            <Path d={drawnPath} stroke={trailColor} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            {/* Inner highlight */}
                            <Path d={drawnPath} stroke={PAL.white} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.5} />
                        </G>
                    </Svg>
                )}

                {/* Key point dots */}
                {keyDots}

                {/* Sparkle ball */}
                <SparkleBall x={sparklePos.x} y={sparklePos.y} visible={sparkleVisible} />

                {/* Draw area pan responder — touchAction: 'none' is critical for web */}
                <View
                    style={[StyleSheet.absoluteFill, { touchAction: 'none', userSelect: 'none', cursor: 'crosshair' } as any]}
                    {...panResponder.panHandlers}
                />
            </View>

            {/* Phase indicator */}
            <View style={s.phaseBar}>
                <Text style={s.phaseText}>
                    {phase === 'demo' ? '👀 Watch Milo!' : phase === 'guided' ? '✏️ Trace the path!' : '🌟 Now from memory!'}
                </Text>
            </View>

            {/* Milo */}
            <MiloReactor state={miloState} />

            {/* Controls */}
            <View style={s.canvasControls}>
                <TouchableOpacity style={s.controlBtn} onPress={runDemo} activeOpacity={0.7}>
                    <Text style={{ fontSize: 22 }}>🔄</Text>
                    <Text style={s.controlLabel}>Demo</Text>
                </TouchableOpacity>

                {completed && (
                    <TouchableOpacity
                        style={[s.controlBtn, s.controlBtnPrimary]}
                        onPress={() => onComplete(starsEarned)}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 22 }}>▶</Text>
                        <Text style={[s.controlLabel, { color: PAL.textDark }]}>Next</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Stars */}
            <StarSlots earned={starsEarned} />

            {/* Confetti */}
            <MiniConfetti visible={showConfetti} />
        </View>
    );
}

// ── Summary Screen ────────────────────────────────────────────────────────────

function SummaryScreen({
    progress,
    onReplay,
    onPlayAgain,
}: {
    progress: Record<number, LevelProgress>;
    onReplay: (levelId: number) => void;
    onPlayAgain: () => void;
}) {
    const totalStars = Object.values(progress).reduce((a, b) => a + b.starsEarned, 0);
    const needsPractice = LEVELS.filter(l => progress[l.id].offPathCount >= 3);

    return (
        <View style={s.summaryRoot}>
            <LevelSelectBg />
            <View style={s.summaryCard}>
                <Text style={{ fontSize: 65 }}>🐵</Text>
                <Text style={s.summaryTitle}>Stage 2 Complete!</Text>
                <Text style={s.summarySubtitle}>Milo's Report Card</Text>

                <View style={s.summaryStarRow}>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: PAL.textDark }}>{totalStars}</Text>
                    <Text style={{ fontSize: 28 }}>⭐</Text>
                </View>

                <ScrollView style={{ maxHeight: 200 }}>
                    {LEVELS.map(l => (
                        <View key={l.id} style={s.summaryRow}>
                            <Text style={{ fontSize: 18 }}>{l.emoji}</Text>
                            <Text style={s.summaryRowName}>{l.name}</Text>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                                {Array.from({ length: 3 }, (_, i) => (
                                    <Text key={i} style={{ fontSize: 14 }}>{i < progress[l.id].starsEarned ? '⭐' : '☆'}</Text>
                                ))}
                            </View>
                            {progress[l.id].offPathCount >= 3 && (
                                <TouchableOpacity onPress={() => onReplay(l.id)} style={s.replayBtn}>
                                    <Text style={{ fontSize: 12 }}>🔄</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </ScrollView>

                {needsPractice.length > 0 && (
                    <View style={s.practiceCard}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#F57F17' }}>
                            ⭐ Practice more: {needsPractice.map(l => l.name).join(', ')}
                        </Text>
                    </View>
                )}

                <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/writing-stage3' as any)} activeOpacity={0.7}>
                    <Text style={s.primaryBtnText}>Next Stage → 🔤</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={s.playAgainBtn}
                    onPress={onPlayAgain}
                    activeOpacity={0.7}
                >
                    <Text style={s.playAgainBtnText}>Play Again 🔁</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/writing' as any)} style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: PAL.brown }}>Back to Levels</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

function Stage2Gameplay() {
    const [screen, setScreen] = useState<'select' | 'play' | 'summary'>('select');
    const [currentLevelId, setCurrentLevelId] = useState(1);
    const [progress, setProgress] = useState<Record<number, LevelProgress>>(getInitialProgress);

    // Determine highest unlocked level
    const highestUnlocked = LEVELS.reduce((max, l) => {
        if (l.id === 1) return Math.max(max, 1);
        const prev = progress[l.id - 1];
        if (prev && prev.completed) return Math.max(max, l.id);
        return max;
    }, 1);

    // Count total completed for useWritingCompletion
    const allComplete = LEVELS.every(l => progress[l.id].completed);
    const totalStars = Object.values(progress).reduce((a, b) => a + b.starsEarned, 0);
    useWritingCompletion(allComplete, 2, Math.min(3, Math.max(1, Math.floor(totalStars / 9))));

    // ── Level Select ──────────────────────────────────────────────────────────

    if (screen === 'select') {
        return (
            <View style={s.selectRoot}>
                <LevelSelectBg />

                {/* Header */}
                <View style={s.selectHeader}>
                    <TouchableOpacity onPress={() => router.push('/writing' as any)} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 24 }}>🏠</Text>
                    </TouchableOpacity>
                    <Text style={s.selectTitle}>Shape & Curve Practice</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 18 }}>{totalStars}</Text>
                        <Text style={{ fontSize: 18 }}>⭐</Text>
                    </View>
                </View>

                {/* Path of levels */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.pathScroll}
                    style={s.pathContainer}
                >
                    {/* Section A label */}
                    <View style={s.sectionLabel}>
                        <Text style={s.sectionLabelText}>Curves</Text>
                    </View>

                    {LEVELS.filter(l => l.section === 'A').map(level => {
                        const isCurrent = level.id === highestUnlocked && !progress[level.id].completed;
                        return (
                            <LevelBubble
                                key={level.id}
                                level={level}
                                progress={progress[level.id]}
                                isCurrent={isCurrent}
                                onPress={() => {
                                    const unlocked = progress[level.id].completed || level.id <= highestUnlocked;
                                    if (unlocked) {
                                        setCurrentLevelId(level.id);
                                        setScreen('play');
                                    }
                                    // If locked, Milo shakes head — handled visually by bubble
                                }}
                            />
                        );
                    })}

                    {/* Section B label */}
                    <View style={s.sectionLabel}>
                        <Text style={s.sectionLabelText}>Shapes</Text>
                    </View>

                    {LEVELS.filter(l => l.section === 'B').map(level => {
                        const isCurrent = level.id === highestUnlocked && !progress[level.id].completed;
                        return (
                            <LevelBubble
                                key={level.id}
                                level={level}
                                progress={progress[level.id]}
                                isCurrent={isCurrent}
                                onPress={() => {
                                    const unlocked = progress[level.id].completed || level.id <= highestUnlocked;
                                    if (unlocked) {
                                        setCurrentLevelId(level.id);
                                        setScreen('play');
                                    }
                                }}
                            />
                        );
                    })}
                </ScrollView>

                {/* Friendly subtitle */}
                <View style={s.selectFooter}>
                    <Text style={s.selectFooterText}>🐵 Help Milo draw magical shapes!</Text>
                </View>
            </View>
        );
    }

    // ── Level Play ────────────────────────────────────────────────────────────

    if (screen === 'play') {
        const level = LEVELS.find(l => l.id === currentLevelId)!;

        return (
            <View style={s.playRoot}>
                <LevelSelectBg />

                {/* Top bar */}
                <View style={s.playHeader}>
                    <TouchableOpacity onPress={() => setScreen('select')} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 22 }}>◀</Text>
                    </TouchableOpacity>
                    <Text style={s.playTitle}>{level.emoji} {level.name}</Text>
                    <StarSlots earned={progress[level.id].starsEarned} />
                </View>

                {/* Canvas */}
                <DrawingCanvas
                    key={currentLevelId}
                    level={level}
                    onStarEarned={(starNum) => {
                        setProgress(prev => ({
                            ...prev,
                            [level.id]: {
                                ...prev[level.id],
                                starsEarned: Math.max(prev[level.id].starsEarned, starNum),
                            },
                        }));
                    }}
                    onComplete={(stars) => {
                        setProgress(prev => ({
                            ...prev,
                            [level.id]: {
                                ...prev[level.id],
                                starsEarned: Math.max(prev[level.id].starsEarned, stars),
                                completed: true,
                                attempts: prev[level.id].attempts + 1,
                            },
                        }));

                        // Move to next level or summary
                        setTimeout(() => {
                            const nextLevel = LEVELS.find(l => l.id === level.id + 1);
                            if (nextLevel) {
                                setCurrentLevelId(nextLevel.id);
                            } else {
                                setScreen('summary');
                            }
                        }, 500);
                    }}
                />
            </View>
        );
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    return (
        <SummaryScreen
            progress={progress}
            onReplay={(levelId) => {
                setCurrentLevelId(levelId);
                setScreen('play');
            }}
            onPlayAgain={() => {
                setProgress(getInitialProgress());
                setCurrentLevelId(1);
                setScreen('select');
            }}
        />
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    // Level Select
    selectRoot: { flex: 1, backgroundColor: PAL.sky },
    selectHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10, zIndex: 10,
    },
    selectTitle: { fontSize: 20, fontWeight: '900', color: PAL.textDark },
    pathContainer: { flex: 1 },
    pathScroll: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 20, gap: 16,
    },
    sectionLabel: {
        backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16,
        paddingHorizontal: 14, paddingVertical: 6, marginRight: 8,
    },
    sectionLabelText: { fontSize: 14, fontWeight: '800', color: PAL.brown },
    selectFooter: {
        alignItems: 'center', paddingBottom: 40,
    },
    selectFooterText: { fontSize: 16, fontWeight: '700', color: PAL.textDark, opacity: 0.7 },

    // Bubble
    bubbleTouch: { alignItems: 'center', width: 80 },
    bubbleOuter: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: PAL.white, justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: PAL.mint,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
    },
    bubbleLocked: { borderColor: PAL.lockGray, opacity: 0.6 },
    bubbleCurrent: { borderColor: PAL.sun, borderWidth: 4 },
    bubbleInner: { justifyContent: 'center', alignItems: 'center' },
    bubbleEmoji: { fontSize: 28 },
    bubbleStars: { position: 'absolute', top: -10, flexDirection: 'row', gap: 1 },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 34,
    },
    bubbleLabel: { fontSize: 11, fontWeight: '800', color: PAL.textDark, textAlign: 'center', marginTop: 4 },
    miloAtBubble: { fontSize: 24, position: 'absolute', bottom: -20 },

    // Play screen
    playRoot: { flex: 1, backgroundColor: PAL.sky },
    playHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 50, paddingBottom: 8, zIndex: 10,
    },
    playTitle: { fontSize: 22, fontWeight: '900', color: PAL.textDark },

    // Canvas
    canvasOuter: { flex: 1, paddingHorizontal: CANVAS_PAD, paddingTop: 8 },
    canvasBg: {
        width: CANVAS_W, height: CANVAS_H, borderRadius: 20,
        backgroundColor: PAL.canvas, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
        touchAction: 'none' as any,
    },

    // Key dots
    keyDot: {
        position: 'absolute', width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2.5, zIndex: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
    },
    keyDotText: { fontSize: 13, fontWeight: '900', color: PAL.textDark },

    // Sparkle ball
    sparkleBall: {
        position: 'absolute', width: 36, height: 36, justifyContent: 'center', alignItems: 'center', zIndex: 20,
    },

    // Phase bar
    phaseBar: {
        alignItems: 'center', paddingVertical: 8, marginTop: 6,
    },
    phaseText: {
        fontSize: 16, fontWeight: '800', color: PAL.textDark,
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
        overflow: 'hidden',
    },

    // Milo
    miloZone: {
        position: 'absolute', bottom: 100, left: 16, alignItems: 'center', zIndex: 15,
    },
    miloBubble: {
        backgroundColor: PAL.white, borderRadius: 16,
        paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    },

    // Controls
    canvasControls: {
        flexDirection: 'row', justifyContent: 'flex-end', gap: 12,
        paddingTop: 8, paddingRight: 8,
    },
    controlBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    controlBtnPrimary: { backgroundColor: PAL.sun },
    controlLabel: { fontSize: 13, fontWeight: '800', color: PAL.brown },

    // Star slots
    starSlots: {
        flexDirection: 'row', justifyContent: 'center', gap: 4,
    },
    starSlot: { fontSize: 22, color: '#E0E0E0' },
    starSlotEarned: { color: undefined },

    // Summary
    summaryRoot: { flex: 1, backgroundColor: PAL.sky },
    summaryCard: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 28, paddingVertical: 40,
    },
    summaryTitle: { fontSize: 30, fontWeight: '900', color: PAL.textDark, textAlign: 'center', marginTop: 8 },
    summarySubtitle: { fontSize: 16, fontWeight: '700', color: PAL.brown, textAlign: 'center', marginBottom: 12 },
    summaryStarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    summaryRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 14, marginBottom: 6, width: W * 0.8,
    },
    summaryRowName: { flex: 1, fontSize: 15, fontWeight: '800', color: PAL.textDark },
    replayBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: PAL.coral, justifyContent: 'center', alignItems: 'center',
    },
    practiceCard: {
        backgroundColor: 'rgba(255,215,0,0.2)', padding: 12, borderRadius: 14,
        borderWidth: 2, borderColor: 'rgba(255,215,0,0.4)', marginVertical: 8,
    },
    primaryBtn: {
        backgroundColor: PAL.sun, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50, marginTop: 12,
        shadowColor: PAL.sun, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    primaryBtnText: { fontSize: 18, fontWeight: '900', color: PAL.textDark },
    playAgainBtn: {
        backgroundColor: PAL.coral,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 50,
        marginTop: 10,
        shadowColor: PAL.coral,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    playAgainBtnText: { fontSize: 16, fontWeight: '900', color: PAL.white },
});

// ── Stage 2 Entry with Story Intro ────────────────────────────────────────────

export default function Stage2Strokes() {
    const [showIntro, setShowIntro] = useState(true);

    if (showIntro) {
        return (
            <StoryIntro
                stageNumber={2}
                title="Build Milo's World"
                storyLines={[
                    "Wow! We made it through the jungle! \u{1F333}",
                    "But my world looks empty\u2026 there are no trees, bridges, or rivers yet.",
                    "Can you help me build my world?",
                ]}
                goalMessage="Draw the shapes to build Milo's world!"
                buttonLabel="Let's Build Milo's World"
                onStart={() => setShowIntro(false)}
            />
        );
    }

    return <Stage2Gameplay />;
}
