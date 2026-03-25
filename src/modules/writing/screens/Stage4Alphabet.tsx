/**
 * Stage4Alphabet.tsx — "Milo's Lost Map" · Alphabet Drawing
 *
 * 6-letter prototype: I, O, C, L, S, T
 * Directly reuses Stage 2's drawing system: same canvas layout, same
 * PanResponder, same SVG layering, same checkpoint logic, same trail.
 */

import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StoryIntro from './StoryIntro';
import { Stage2WorldScenery } from './Stage3Recognition';
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
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { computeAccuracy } from '../utils/accuracy.js';
import { canProgress, getFeedback } from '../utils/scoring.js';
import { useWritingCompletion } from './WritingLevelHub';

// ── Constants (same as Stage 2) ───────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('window');

const PAL = {
    sky: '#E8F4FD',
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

const TRAIL_COLORS = ['#66BB6A', '#64B5F6', '#C5B4E3', '#FF7F6E', '#26C6DA', '#FFB74D'];

// ── Letter Definitions (same shape as Stage 2 LevelDef) ───────────────────────

interface LetterDef {
    id: number;
    name: string;
    emoji: string;
    letter: string;
    guidePath: Array<{ x: number; y: number }>;
    closed: boolean;
    smooth: boolean;
    keyPoints: number[];
    tolerance: number;
}

// All letter paths use a UNIT SQUARE (0–1, 0–1) coordinate system.
// They are mapped to a centered square letter-box inside the canvas
// to prevent aspect-ratio distortion.

const LETTERS: LetterDef[] = [
    {
        id: 1, name: 'Bamboo Stalk', emoji: '🎋', letter: 'I',
        // Vertical stroke with small serifs at top and bottom
        guidePath: [
            { x: 0.3, y: 0.1 }, { x: 0.7, y: 0.1 },  // top serif
            { x: 0.5, y: 0.1 },                         // center top
            ...Array.from({ length: 14 }, (_, i) => ({   // vertical bar
                x: 0.5,
                y: 0.1 + ((i + 1) / 15) * 0.8,
            })),
            { x: 0.3, y: 0.9 }, { x: 0.7, y: 0.9 },  // bottom serif
        ],
        keyPoints: [0, 1, 2, 9, 16, 17],
        closed: false, smooth: false, tolerance: 38,
    },
    {
        id: 2, name: 'Magic Bubble', emoji: '🫧', letter: 'O',
        // Perfect circle: same radius for x and y (0.35)
        guidePath: Array.from({ length: 36 }, (_, i) => {
            const t = (i / 35) * Math.PI * 2;
            return {
                x: 0.5 + Math.cos(t - Math.PI / 2) * 0.35,
                y: 0.5 + Math.sin(t - Math.PI / 2) * 0.35,
            };
        }),
        keyPoints: [0, 9, 18, 27],
        closed: true, smooth: true, tolerance: 34,
    },
    {
        id: 3, name: 'Rising Moon', emoji: '🌙', letter: 'C',
        // Arc from upper-right, sweeping CCW through top-left-bottom to lower-right
        // Opens to the right (~270° arc)
        guidePath: Array.from({ length: 24 }, (_, i) => {
            // In screen coords (y-down): start at upper-right, sweep to lower-right
            const startAngle = -45 * (Math.PI / 180);      // upper-right
            const totalSweep = 270 * (Math.PI / 180);      // 270° sweep
            const angle = startAngle - (i / 23) * totalSweep; // decreasing = CCW in screen
            return {
                x: 0.5 + Math.cos(angle) * 0.35,
                y: 0.5 + Math.sin(angle) * 0.35,
            };
        }),
        keyPoints: [0, 8, 16, 23],
        closed: false, smooth: true, tolerance: 34,
    },
    {
        id: 4, name: 'Cliff Ledge', emoji: '🏔️', letter: 'L',
        // Down the left side, then right along the bottom
        guidePath: [
            ...Array.from({ length: 14 }, (_, i) => ({
                x: 0.25,
                y: 0.1 + (i / 13) * 0.8,
            })),
            ...Array.from({ length: 10 }, (_, i) => ({
                x: 0.25 + ((i + 1) / 10) * 0.5,
                y: 0.9,
            })),
        ],
        keyPoints: [0, 7, 13, 18, 23],
        closed: false, smooth: false, tolerance: 38,
    },
    {
        id: 5, name: 'River Bend', emoji: '🏞️', letter: 'S',
        // Proper uppercase S using explicit control points
        // Top curve bulges LEFT, bottom curve bulges RIGHT
        guidePath: [
            // Start: top-right
            { x: 0.68, y: 0.18 },
            { x: 0.65, y: 0.12 },
            { x: 0.58, y: 0.08 },
            { x: 0.50, y: 0.08 },
            { x: 0.42, y: 0.08 },
            { x: 0.32, y: 0.12 },
            // Left side of top curve
            { x: 0.28, y: 0.20 },
            { x: 0.28, y: 0.28 },
            { x: 0.32, y: 0.35 },
            { x: 0.38, y: 0.40 },
            // Middle crossing (left to right)
            { x: 0.44, y: 0.44 },
            { x: 0.50, y: 0.48 },
            { x: 0.56, y: 0.52 },
            { x: 0.62, y: 0.56 },
            // Right side of bottom curve
            { x: 0.68, y: 0.62 },
            { x: 0.72, y: 0.70 },
            { x: 0.72, y: 0.78 },
            { x: 0.68, y: 0.85 },
            // Bottom of bottom curve
            { x: 0.58, y: 0.92 },
            { x: 0.50, y: 0.92 },
            { x: 0.42, y: 0.92 },
            { x: 0.35, y: 0.88 },
            // End: bottom-left
            { x: 0.30, y: 0.82 },
        ],
        keyPoints: [0, 6, 11, 16, 22],
        closed: false, smooth: true, tolerance: 36,
    },
    {
        id: 6, name: 'Signpost', emoji: '🪧', letter: 'T',
        // Horizontal bar across the top, then vertical bar down center
        // The user draws: left→right, then back to center and down
        guidePath: [
            ...Array.from({ length: 10 }, (_, i) => ({
                x: 0.2 + (i / 9) * 0.6,
                y: 0.1,
            })),
            { x: 0.5, y: 0.1 }, // back to center
            ...Array.from({ length: 13 }, (_, i) => ({
                x: 0.5,
                y: 0.1 + ((i + 1) / 13) * 0.8,
            })),
        ],
        // Removed checkpoint at index 10 (center return) to prevent overlap
        // with the horizontal stroke passing through center
        keyPoints: [0, 5, 9, 17, 23],
        closed: false, smooth: false, tolerance: 38,
    },
];

// ── Square Letter-Box (prevents aspect-ratio distortion) ──────────────────────
// Letters are defined in a 0–1 unit square. We map them to a centered
// square region inside the (possibly rectangular) canvas so circles stay
// circular and proportions remain correct on any screen size.

const CANVAS_PAD = Math.round(W * 0.05);          // responsive padding
const CANVAS_W = W - CANVAS_PAD * 2;
const CANVAS_H = Math.round(H * 0.52);

const LETTER_SIZE = Math.min(CANVAS_W, CANVAS_H) * 0.85;
const LETTER_OX = (CANVAS_W - LETTER_SIZE) / 2;   // x offset to center
const LETTER_OY = (CANVAS_H - LETTER_SIZE) / 2;   // y offset to center

/** Map a unit-square point to canvas pixel coords via the letter box */
function letterToCanvas(pt: { x: number; y: number }): { x: number; y: number } {
    return {
        x: LETTER_OX + pt.x * LETTER_SIZE,
        y: LETTER_OY + pt.y * LETTER_SIZE,
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build SVG path from unit-square points, mapped through the square letter box */
function buildLetterSvgPath(
    pts: Array<{ x: number; y: number }>,
    smooth: boolean,
): string {
    if (!pts || pts.length === 0) return '';
    const p = pts.map(letterToCanvas);
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

// ── Level Select Background (same as Stage 2) ────────────────────────────────

function LevelSelectBg() {
    return (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Rect x={0} y={0} width={W} height={H} fill={PAL.sky} />
            <Circle cx={W * 0.85} cy={H * 0.06} r={50} fill={PAL.sun} opacity={0.9} />
            <Circle cx={W * 0.85} cy={H * 0.06} r={65} fill={PAL.sun} opacity={0.15} />
            <Ellipse cx={W * 0.15} cy={H * 0.05} rx={55} ry={20} fill={PAL.white} opacity={0.85} />
            <Ellipse cx={W * 0.5} cy={H * 0.08} rx={65} ry={22} fill={PAL.white} opacity={0.7} />
            <Ellipse cx={W * 0.3} cy={H * 0.92} rx={W * 0.6} ry={120} fill={PAL.grassLight} />
            <Ellipse cx={W * 0.8} cy={H * 0.95} rx={W * 0.5} ry={100} fill={PAL.grassDark} />
            <Rect x={0} y={H * 0.88} width={W} height={H * 0.12} fill={PAL.grassDark} />
        </Svg>
    );
}

// ── Milo Reactions (same as Stage 2) ──────────────────────────────────────────

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
                <Text style={{ fontSize: 55 }}>🐒</Text>
            </Animated.View>
        </View>
    );
}

// ── Sparkle Guide (colorful pulsing tip) ──────────────────────────────────────

function SparkleGuide({ x, y, visible, isDemo }: { x: number; y: number; visible: boolean; isDemo?: boolean }) {
    const [pulseAnim] = useState(new Animated.Value(0));
    const [glowAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            ])
        ).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim, glowAnim]);

    if (!visible) return null;

    const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] });
    const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

    return (
        <View pointerEvents="none" style={{ position: 'absolute', left: x - 28, top: y - 28, width: 56, height: 56, zIndex: 20 }}>
            <Animated.View
                style={{
                    position: 'absolute', left: -6, top: -6, width: 68, height: 68, borderRadius: 34,
                    backgroundColor: isDemo ? 'rgba(255, 215, 0, 0.2)' : 'rgba(78, 205, 196, 0.2)',
                    opacity: glowOpacity,
                }}
            />
            <Animated.View
                style={{
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: isDemo ? 'rgba(255, 215, 0, 0.35)' : 'rgba(78, 205, 196, 0.35)',
                    borderWidth: 2.5,
                    borderColor: isDemo ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)',
                    alignItems: 'center', justifyContent: 'center',
                    transform: [{ scale }],
                    shadowColor: isDemo ? '#FFD700' : '#4ECDC4',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 12,
                    elevation: 8,
                }}
            >
                <Text style={{ fontSize: isDemo ? 28 : 24 }}>{isDemo ? '✨' : '👆'}</Text>
            </Animated.View>
        </View>
    );
}

// ── Star Slots (same as Stage 2) ──────────────────────────────────────────────

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

// ── Confetti (same as Stage 2) ────────────────────────────────────────────────

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

// ── Letter Popup (after each letter) ──────────────────────────────────────────

function LetterPopup({
    letter,
    onNext,
}: {
    letter: LetterDef;
    onNext: () => void;
}) {
    const [scaleAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    }, [scaleAnim]);

    return (
        <View style={s.popupOverlay}>
            <Animated.View style={[s.popupCard, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={{ fontSize: 60 }}>{letter.emoji}</Text>
                <Text style={s.popupTitle}>You drew "{letter.letter}"!</Text>
                <Text style={s.popupSub}>{letter.name} activated! 🎉</Text>
                <TouchableOpacity style={s.popupBtn} onPress={onNext} activeOpacity={0.7}>
                    <Text style={s.popupBtnText}>Continue →</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// ── Drawing Canvas (identical structure to Stage 2's DrawingCanvas) ────────────

function DrawingCanvas({
    level,
    onComplete,
}: {
    level: LetterDef;
    onComplete: (stars: number) => void;
}) {
    const [phase, setPhase] = useState<'demo' | 'guided'>('demo');
    const [miloState, setMiloState] = useState<MiloState>('idle');
    const [drawnPath, setDrawnPath] = useState('');
    const drawnPathRef = useRef('');
    const [starsEarned, setStarsEarned] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [sparklePos, setSparklePos] = useState({ x: 0, y: 0 });
    const [sparkleVisible, setSparkleVisible] = useState(false);
    const [demoProgress, setDemoProgress] = useState(0);
    const [showGuide, setShowGuide] = useState(true);
    // Rainbow demo trail state
    const demoTrailRef = useRef('');
    const [demoTrailPath, setDemoTrailPath] = useState('');
    const [showKeyDots, setShowKeyDots] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; emoji: string } | null>(null);

    // Refs for PanResponder (critical — same pattern as Stage 2)
    const phaseRef = useRef(phase);
    const completedRef = useRef(completed);
    const starsEarnedRef = useRef(starsEarned);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { completedRef.current = completed; }, [completed]);
    useEffect(() => { starsEarnedRef.current = starsEarned; }, [starsEarned]);

    const drawnPointsRef = useRef<Array<{ x: number; y: number }>>([]);
    // Accumulate all drawn points across multiple strokes for accuracy
    const allDrawnPointsRef = useRef<Array<{ x: number; y: number }>>([]);
    const onPathCountRef = useRef(0);
    const totalPointsRef = useRef(0);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Hint animation state (when kid gets stuck)
    const hintTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hintTrailRef = useRef('');
    const [hintTrailPath, setHintTrailPath] = useState('');
    const [showingHint, setShowingHint] = useState(false);

    const trailColor = TRAIL_COLORS[(level.id - 1) % TRAIL_COLORS.length];
    const guideSvgPath = useMemo(() => buildLetterSvgPath(level.guidePath, level.smooth), [level]);

    // ── Demo Animation (same as Stage 2) ──────────────────────────────────────

    const runDemo = useCallback(() => {
        setPhase('demo');
        setMiloState('demo');
        setSparkleVisible(true);
        setDemoProgress(0);
        drawnPathRef.current = '';
        setDrawnPath('');
        drawnPointsRef.current = [];
        allDrawnPointsRef.current = [];
        demoTrailRef.current = '';
        setDemoTrailPath('');

        let step = 0;
        const total = level.guidePath.length;
        if (demoTimerRef.current) clearInterval(demoTimerRef.current);

        const intervalMs = Math.max(40, Math.round(3000 / total));

        demoTimerRef.current = setInterval(() => {
            if (step >= total) {
                if (demoTimerRef.current) clearInterval(demoTimerRef.current);
                setSparkleVisible(false);
                setMiloState('idle');
                setTimeout(() => {
                    demoTrailRef.current = '';
                    setDemoTrailPath('');
                    setPhase('guided');
                    setShowGuide(true);
                    setShowKeyDots(true);
                }, 1200);
                return;
            }
            const pt = level.guidePath[step];
            const mapped = letterToCanvas(pt);
            setSparklePos({ x: mapped.x, y: mapped.y });
            setDemoProgress(step / (total - 1));
            // Build progressive rainbow trail
            if (step === 0) {
                demoTrailRef.current = `M ${mapped.x} ${mapped.y}`;
            } else {
                demoTrailRef.current += ` L ${mapped.x} ${mapped.y}`;
            }
            setDemoTrailPath(demoTrailRef.current);
            step++;
        }, intervalMs);
    }, [level]);

    useEffect(() => {
        const t = setTimeout(runDemo, 500);
        return () => {
            clearTimeout(t);
            if (demoTimerRef.current) clearInterval(demoTimerRef.current);
        };
    }, [runDemo]);

    // ── Hint Animation (when kid gets stuck) ──────────────────────────────────

    const stopHint = useCallback(() => {
        if (hintTimerRef.current) { clearInterval(hintTimerRef.current); hintTimerRef.current = null; }
        hintTrailRef.current = '';
        setHintTrailPath('');
        setShowingHint(false);
        setSparkleVisible(false);
    }, []);

    const runHintAnimation = useCallback(() => {
        const curCp = nextCpIdxRef.current;
        let startGuideIdx: number;

        if (curCp === 0) {
            startGuideIdx = 0;
        } else if (curCp <= level.keyPoints.length - 1) {
            startGuideIdx = level.keyPoints[curCp - 1];
        } else {
            startGuideIdx = level.keyPoints[level.keyPoints.length - 1];
        }

        const hintPoints = level.guidePath.slice(startGuideIdx);
        if (hintPoints.length < 2) return;

        setShowingHint(true);
        setMiloState('demo');
        hintTrailRef.current = '';
        setHintTrailPath('');
        setSparkleVisible(true);

        let step = 0;
        const total = hintPoints.length;
        const intervalMs = Math.max(40, Math.round(2500 / total));

        if (hintTimerRef.current) clearInterval(hintTimerRef.current);

        hintTimerRef.current = setInterval(() => {
            if (step >= total) {
                if (hintTimerRef.current) clearInterval(hintTimerRef.current);
                hintTimerRef.current = null;
                setTimeout(() => {
                    stopHint();
                    setMiloState('nudge');
                    setTimeout(() => setMiloState('idle'), 1500);
                }, 800);
                return;
            }
            const pt = hintPoints[step];
            const mapped = letterToCanvas(pt);
            setSparklePos({ x: mapped.x, y: mapped.y });
            if (step === 0) {
                hintTrailRef.current = `M ${mapped.x} ${mapped.y}`;
            } else {
                hintTrailRef.current += ` L ${mapped.x} ${mapped.y}`;
            }
            setHintTrailPath(hintTrailRef.current);
            step++;
        }, intervalMs);
    }, [level, stopHint]);

    // Idle detection — trigger hint after 4s of inactivity
    useEffect(() => {
        if (phase === 'demo' || completed) return;
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (isDrawing) {
            stopHint();
            return;
        }
        idleTimerRef.current = setTimeout(() => {
            if (!showingHint) {
                runHintAnimation();
            }
        }, 4000);
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [phase, isDrawing, completed, showingHint, runHintAnimation, stopHint]);

    // ── Checkpoint State (same as Stage 2) ────────────────────────────────────

    const effectiveCheckpoints = useMemo(() => {
        const pts = level.keyPoints.map(idx => letterToCanvas(level.guidePath[idx]));
        if (level.closed && pts.length > 1) {
            const first = pts[0]; const last = pts[pts.length - 1];
            const d = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
            if (d >= 8) {
                // Last keyPoint is NOT at start — add a closing checkpoint
                pts.push({ x: first.x, y: first.y });
            }
            // If d < 8: last keyPoint is already at start — keep it
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

    // ── PanResponder (same as Stage 2) ────────────────────────────────────────

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                if (phaseRef.current === 'demo' || completedRef.current) return;
                const { locationX, locationY } = evt.nativeEvent;
                // Start a new stroke segment — current stroke points reset
                drawnPointsRef.current = [{ x: locationX, y: locationY }];
                // MULTI-STROKE: Append a new M command to existing path instead of replacing
                if (drawnPathRef.current && drawnPathRef.current.startsWith('M')) {
                    drawnPathRef.current += ` M ${locationX} ${locationY}`;
                } else {
                    drawnPathRef.current = `M ${locationX} ${locationY}`;
                }
                setDrawnPath(drawnPathRef.current);
                onPathCountRef.current = 0;
                totalPointsRef.current = 0;
                setIsDrawing(true);
                setMiloState('idle');
                // Stop any hint animation when kid starts drawing
                if (hintTimerRef.current) { clearInterval(hintTimerRef.current); hintTimerRef.current = null; }
                hintTrailRef.current = '';
                setHintTrailPath('');
                setShowingHint(false);
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

                // Sequential checkpoint detection (same as Stage 2)
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

                // MULTI-STROKE: Save this stroke's points into the accumulated set
                allDrawnPointsRef.current = allDrawnPointsRef.current.concat(drawnPointsRef.current);

                const totalCps = effectiveCheckpoints.length;
                const reached = reachedCpsRef.current.size;

                if (reached === 0) { setMiloState('nudge'); return; }
                // Still have checkpoints to reach — show encouraging feedback, let them keep drawing
                if (reached < totalCps) {
                    setMiloState('good');
                    setTimeout(() => setMiloState('idle'), 1500);
                    return;
                }

                // All checkpoints reached — now compute PATH-BASED accuracy
                // Reverse the letter-box mapping to normalize ALL drawn points to 0–1
                const normalizedDrawn = allDrawnPointsRef.current.map(pt => ({
                    x: (pt.x - LETTER_OX) / LETTER_SIZE,
                    y: (pt.y - LETTER_OY) / LETTER_SIZE,
                }));
                const acc = computeAccuracy(
                    normalizedDrawn,
                    level.guidePath,
                    { width: LETTER_SIZE, height: LETTER_SIZE },
                    { toleranceMultiplier: 1.5 }
                );
                const fb = getFeedback(acc);
                const passes = canProgress(acc);

                setAccuracy(acc);
                setFeedback(fb);

                if (passes) {
                    // Award stars based on accuracy
                    const earnedStars = acc >= 90 ? 3 : acc >= 70 ? 2 : 1;
                    setCompleted(true);
                    setStarsEarned(earnedStars);
                    setMiloState('complete');
                    setShowConfetti(true);
                    setTimeout(() => { onComplete(earnedStars); }, 2500);
                } else {
                    // Accuracy too low — show fail overlay, allow retry
                    setMiloState('offpath');
                }
            },
        })
    ).current;

    // ── Key Point Dots (same as Stage 2) ──────────────────────────────────────

    const keyDots = showKeyDots
        ? effectiveCheckpoints.map((cp, i) => {
            const isStart = i === 0;
            const isClosing = level.closed && i === effectiveCheckpoints.length - 1;
            const isReached = reachedCps.has(i);
            const isNextTarget = i === nextCpIdx;
            if (isClosing && !isNextTarget && !isReached && isStart) return null;
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
                        {isReached ? '✓' : isStart ? '▶' : isClosing ? '🏁' : i + 1}
                    </Text>
                </View>
            );
        })
        : null;

    // ── Render (same SVG layering as Stage 2) ─────────────────────────────────

    return (
        <View style={s.canvasOuter}>
            {/* Canvas background */}
            <View style={s.canvasBg}>
                <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} rx={20} fill={PAL.canvas} />
                </Svg>

                {/* Ghost stencil / guide path */}
                {showGuide && (
                    <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                        {/* Thick ghost letter */}
                        <Path
                            d={guideSvgPath}
                            stroke="#D7CCC8"
                            strokeWidth={28}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            opacity={0.35}
                        />
                        {/* Dashed guide on top */}
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

                {/* Rainbow Demo Trail */}
                {demoTrailPath !== '' && demoTrailPath.startsWith('M') && (
                    <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Defs>
                            {/* Rainbow: Coral → Orange → Yellow → Green → Sky Blue → Lavender */}
                            <SvgLinearGradient id="letterRainbow" x1="0" y1="0" x2={String(CANVAS_W)} y2={String(CANVAS_H)} gradientUnits="userSpaceOnUse">
                                <Stop offset="0%" stopColor="#FF6B6B" />
                                <Stop offset="18%" stopColor="#FF9F43" />
                                <Stop offset="36%" stopColor="#FECA57" />
                                <Stop offset="54%" stopColor="#6BCB77" />
                                <Stop offset="72%" stopColor="#48DBFB" />
                                <Stop offset="90%" stopColor="#A29BFE" />
                                <Stop offset="100%" stopColor="#FF6B6B" />
                            </SvgLinearGradient>
                        </Defs>
                        <G>
                            <Path d={demoTrailPath} stroke="url(#letterRainbow)" strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.18} />
                            <Path d={demoTrailPath} stroke="url(#letterRainbow)" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.35} />
                            <Path d={demoTrailPath} stroke="url(#letterRainbow)" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85} />
                            <Path d={demoTrailPath} stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.6} />
                        </G>
                    </Svg>
                )}

                {/* Drawn trail (same 3-layer crayon as Stage 2) */}
                {drawnPath !== '' && drawnPath.startsWith('M') && (
                    <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                        <G>
                            <Path d={drawnPath} stroke={trailColor} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.25} />
                            <Path d={drawnPath} stroke={trailColor} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            <Path d={drawnPath} stroke={PAL.white} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.5} />
                        </G>
                    </Svg>
                )}

                {/* Key point dots */}
                {keyDots}

                {/* ── Hint Trail (when kid is stuck) ── */}
                {hintTrailPath !== '' && hintTrailPath.startsWith('M') && (
                    <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Defs>
                            <SvgLinearGradient id="letterHintRainbow" x1="0" y1="0" x2={String(CANVAS_W)} y2={String(CANVAS_H)} gradientUnits="userSpaceOnUse">
                                <Stop offset="0%" stopColor="#FF6B6B" />
                                <Stop offset="20%" stopColor="#FF9F43" />
                                <Stop offset="40%" stopColor="#FECA57" />
                                <Stop offset="60%" stopColor="#6BCB77" />
                                <Stop offset="80%" stopColor="#48DBFB" />
                                <Stop offset="100%" stopColor="#A29BFE" />
                            </SvgLinearGradient>
                        </Defs>
                        <G>
                            <Path d={hintTrailPath} stroke="url(#letterHintRainbow)" strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.15} />
                            <Path d={hintTrailPath} stroke="url(#letterHintRainbow)" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.4} />
                            <Path d={hintTrailPath} stroke="url(#letterHintRainbow)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.75} />
                            <Path d={hintTrailPath} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.5} />
                        </G>
                    </Svg>
                )}

                {/* Sparkle guide */}
                <SparkleGuide x={sparklePos.x} y={sparklePos.y} visible={sparkleVisible} isDemo={phase === 'demo' || showingHint} />

                {/* Pan responder touch area (touchAction: 'none' critical for web) */}
                <View
                    style={[StyleSheet.absoluteFill, { touchAction: 'none', userSelect: 'none', cursor: 'crosshair' } as any]}
                    {...panResponder.panHandlers}
                />
            </View>

            {/* Phase indicator */}
            <View style={s.phaseBar}>
                <Text style={s.phaseText}>
                    {phase === 'demo' ? '👀 Watch the path!' : showingHint ? '👀 Follow the sparkle!' : `✏️ Trace the letter ${level.letter}!`}
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

            {/* Accuracy overlay — success */}
            {completed && accuracy !== null && feedback && (
                <View style={s.accuracyOverlay}>
                    <Text style={{ fontSize: 72 }}>{feedback.emoji}</Text>
                    <Text style={s.accuracyOverlayTitle}>{feedback.message}</Text>
                    <View style={[s.accuracyBadge, { borderColor: '#4CD964' }]}>
                        <Text style={s.accuracyBadgeText}>Accuracy: {accuracy}%</Text>
                    </View>
                </View>
            )}

            {/* Accuracy overlay — fail (< 60%) */}
            {!completed && accuracy !== null && feedback && !isDrawing && (
                <View style={s.accuracyOverlay}>
                    <Text style={{ fontSize: 72 }}>{feedback.emoji}</Text>
                    <Text style={s.accuracyOverlayTitle}>{feedback.message}</Text>
                    <View style={[s.accuracyBadge, { borderColor: PAL.coral }]}>
                        <Text style={s.accuracyBadgeText}>Accuracy: {accuracy}%</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: PAL.brown, fontWeight: '700', marginTop: 4 }}>Need 70% to advance</Text>
                    <TouchableOpacity
                        style={[s.controlBtn, s.controlBtnPrimary, { marginTop: 12 }]}
                        onPress={() => {
                            // Full reset for retry — clear all strokes
                            drawnPointsRef.current = [];
                            allDrawnPointsRef.current = [];
                            drawnPathRef.current = '';
                            setDrawnPath('');
                            setAccuracy(null);
                            setFeedback(null);
                            setMiloState('idle');
                            nextCpIdxRef.current = 0;
                            reachedCpsRef.current = new Set();
                            setNextCpIdx(0);
                            setReachedCps(new Set());
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 20 }}>🔁</Text>
                        <Text style={[s.controlLabel, { color: PAL.textDark }]}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

function Stage4Gameplay() {
    const [screen, setScreen] = useState<'select' | 'play' | 'summary'>('select');
    const [currentLetterId, setCurrentLetterId] = useState(1);
    const [progress, setProgress] = useState<Record<number, { starsEarned: number; completed: boolean }>>(
        () => {
            const p: Record<number, { starsEarned: number; completed: boolean }> = {};
            LETTERS.forEach(l => { p[l.id] = { starsEarned: 0, completed: false }; });
            return p;
        }
    );
    const [showPopup, setShowPopup] = useState(false);

    const completedCount = Object.values(progress).filter(p => p.completed).length;
    useWritingCompletion(completedCount >= LETTERS.length, 4, 3);

    const highestUnlocked = Math.max(1, ...LETTERS.filter(l => progress[l.id].completed).map(l => l.id + 1));

    const handleComplete = (stars: number) => {
        setProgress(prev => ({
            ...prev,
            [currentLetterId]: { starsEarned: Math.max(prev[currentLetterId].starsEarned, stars), completed: true },
        }));
        setShowPopup(true);
    };

    const handlePopupNext = () => {
        setShowPopup(false);
        const nextId = currentLetterId + 1;
        if (nextId <= LETTERS.length && !progress[nextId]?.completed) {
            setCurrentLetterId(nextId);
        } else if (completedCount + 1 >= LETTERS.length) {
            setScreen('summary');
        } else {
            setScreen('select');
        }
    };

    const handlePlayAgain = () => {
        const p: Record<number, { starsEarned: number; completed: boolean }> = {};
        LETTERS.forEach(l => { p[l.id] = { starsEarned: 0, completed: false }; });
        setProgress(p);
        setCurrentLetterId(1);
        setScreen('select');
    };

    // ── Summary Screen ──
    if (screen === 'summary') {
        const totalStars = Object.values(progress).reduce((a, b) => a + b.starsEarned, 0);
        return (
            <View style={s.summaryRoot}>
                <LevelSelectBg />
                <View style={s.summaryCard}>
                    <Text style={{ fontSize: 65 }}>🐵</Text>
                    <Text style={s.summaryTitle}>Map Restored! 🗺️</Text>
                    <Text style={s.summarySubtitle}>Milo's Report Card</Text>

                    <View style={s.summaryStarRow}>
                        <Text style={{ fontSize: 32, fontWeight: '900', color: PAL.textDark }}>{totalStars}</Text>
                        <Text style={{ fontSize: 28 }}>⭐</Text>
                    </View>

                    {LETTERS.map(level => (
                        <View key={level.id} style={s.summaryRow}>
                            <Text style={{ fontSize: 20 }}>{level.emoji}</Text>
                            <Text style={s.summaryRowName}>{level.letter} — {level.name}</Text>
                            <View style={{ flexDirection: 'row' }}>
                                {[1, 2, 3].map(i => (
                                    <Text key={i} style={{ fontSize: 14 }}>{i <= progress[level.id].starsEarned ? '⭐' : '☆'}</Text>
                                ))}
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/writing' as any)} activeOpacity={0.7}>
                        <Text style={s.primaryBtnText}>Back to Levels 🏠</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.playAgainBtn} onPress={handlePlayAgain} activeOpacity={0.7}>
                        <Text style={s.playAgainBtnText}>Play Again 🔁</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Play Screen ──
    if (screen === 'play') {
        const level = LETTERS.find(l => l.id === currentLetterId)!;
        return (
            <View style={s.playRoot}>
                <LevelSelectBg />
                {/* Top bar */}
                <View style={s.playHeader}>
                    <TouchableOpacity onPress={() => { setShowPopup(false); setScreen('select'); }} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 22 }}>◀</Text>
                    </TouchableOpacity>
                    <Text style={s.playTitle}>{level.emoji} {level.letter} — {level.name}</Text>
                    <StarSlots earned={progress[level.id].starsEarned} />
                </View>

                <DrawingCanvas
                    key={currentLetterId}
                    level={level}
                    onComplete={handleComplete}
                />

                {/* Letter popup */}
                {showPopup && <LetterPopup letter={level} onNext={handlePopupNext} />}
            </View>
        );
    }

    // ── Level Select ──
    return (
        <View style={s.selectRoot}>
            <LevelSelectBg />

            <View style={s.selectHeader}>
                <TouchableOpacity onPress={() => router.push('/writing' as any)} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 22 }}>◀</Text>
                </TouchableOpacity>
                <Text style={s.selectTitle}>🗺️ Milo's Lost Map</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.pathScroll}>
                {LETTERS.map(level => {
                    const unlocked = progress[level.id].completed || level.id <= highestUnlocked;
                    const isNext = level.id === highestUnlocked && !progress[level.id].completed;
                    return (
                        <TouchableOpacity
                            key={level.id}
                            onPress={() => {
                                if (unlocked) {
                                    setCurrentLetterId(level.id);
                                    setScreen('play');
                                }
                            }}
                            activeOpacity={0.7}
                            style={s.bubbleTouch}
                        >
                            <Animated.View style={[
                                s.bubbleOuter,
                                !unlocked && s.bubbleLocked,
                                isNext && s.bubbleCurrent,
                            ]}>
                                <View style={[s.bubbleInner, !unlocked && { opacity: 0.3 }]}>
                                    <Text style={s.bubbleEmoji}>{level.emoji}</Text>
                                    <Text style={{ fontSize: 22, fontWeight: '900', color: PAL.textDark }}>{level.letter}</Text>
                                </View>
                                {progress[level.id].completed && progress[level.id].starsEarned > 0 && (
                                    <View style={s.bubbleStars}>
                                        {Array.from({ length: Math.min(progress[level.id].starsEarned, 3) }, (_, i) => (
                                            <Text key={i} style={{ fontSize: 12 }}>⭐</Text>
                                        ))}
                                    </View>
                                )}
                                {!unlocked && (
                                    <View style={s.lockOverlay}>
                                        <Text style={{ fontSize: 22 }}>🔒</Text>
                                    </View>
                                )}
                            </Animated.View>
                            <Text style={[s.bubbleLabel, !unlocked && { color: PAL.lockGray }]}>{level.name}</Text>
                            {isNext && <Text style={s.miloAtBubble}>🐵</Text>}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={s.selectFooter}>
                <Text style={s.selectFooterText}>🐵 Help Milo restore the jungle map!</Text>
            </View>
        </View>
    );
}

// ── Stage 4 Entry with Story Intro ────────────────────────────────────────────

export default function Stage4Alphabet() {
    const [showIntro, setShowIntro] = useState(true);

    if (showIntro) {
        return (
            <StoryIntro
                stageNumber={4}
                title="Milo's Lost Map"
                storyLines={[
                    "You helped me build my jungle and find my way home! 🐒",
                    "But look — I found an old jungle map!",
                    "The symbols on it have faded away.",
                    "Can you help me draw them again?",
                    "When we draw them, the jungle comes alive!"
                ]}
                goalMessage="Draw the symbols to restore Milo's map!"
                buttonLabel="Start Restoring the Map"
                onStart={() => setShowIntro(false)}
                backgroundExtra={<Stage2WorldScenery />}
            />
        );
    }

    return <Stage4Gameplay />;
}

// ── Styles (same as Stage 2) ──────────────────────────────────────────────────

const s = StyleSheet.create({
    // Level Select
    selectRoot: { flex: 1, backgroundColor: PAL.sky },
    selectHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10, zIndex: 10,
    },
    selectTitle: { fontSize: 20, fontWeight: '900', color: PAL.textDark },
    pathScroll: {
        flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
        justifyContent: 'center',
        paddingHorizontal: 20, paddingVertical: 20, gap: 16,
    },
    selectFooter: { alignItems: 'center', paddingBottom: 40 },
    selectFooterText: { fontSize: 16, fontWeight: '700', color: PAL.textDark, opacity: 0.7 },

    // Bubble
    bubbleTouch: { alignItems: 'center', width: 90 },
    bubbleOuter: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: PAL.white, justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: PAL.mint,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
    },
    bubbleLocked: { borderColor: PAL.lockGray, opacity: 0.6 },
    bubbleCurrent: { borderColor: PAL.sun, borderWidth: 4 },
    bubbleInner: { justifyContent: 'center', alignItems: 'center' },
    bubbleEmoji: { fontSize: 24 },
    bubbleStars: { position: 'absolute', top: -10, flexDirection: 'row', gap: 1 },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 36,
    },
    bubbleLabel: { fontSize: 11, fontWeight: '800', color: PAL.textDark, textAlign: 'center', marginTop: 4 },
    miloAtBubble: { fontSize: 24, position: 'absolute', bottom: -20 },

    // Play screen
    playRoot: { flex: 1, backgroundColor: PAL.sky },
    playHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 50, paddingBottom: 8, zIndex: 10,
    },
    playTitle: { fontSize: 18, fontWeight: '900', color: PAL.textDark },

    // Canvas (identical to Stage 2)
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
    phaseBar: { alignItems: 'center', paddingVertical: 8, marginTop: 6 },
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
    starSlots: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
    starSlot: { fontSize: 22, color: '#E0E0E0' },
    starSlotEarned: { color: undefined },

    // Accuracy overlay
    accuracyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,253,245,0.94)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 24,
        zIndex: 30,
        borderRadius: 20,
    },
    accuracyOverlayTitle: {
        fontSize: 22, fontWeight: '900', color: PAL.textDark, textAlign: 'center',
    },
    accuracyBadge: {
        borderWidth: 2, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    accuracyBadgeText: {
        fontSize: 20, fontWeight: '800', color: PAL.textDark,
    },

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
    primaryBtn: {
        backgroundColor: PAL.sun, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50, marginTop: 12,
        shadowColor: PAL.sun, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    primaryBtnText: { fontSize: 18, fontWeight: '900', color: PAL.textDark },
    playAgainBtn: {
        backgroundColor: PAL.coral,
        paddingHorizontal: 32, paddingVertical: 14, borderRadius: 50, marginTop: 10,
        shadowColor: PAL.coral, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    },
    playAgainBtnText: { fontSize: 16, fontWeight: '900', color: PAL.white },

    // Popup
    popupOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center', alignItems: 'center',
        zIndex: 100,
    },
    popupCard: {
        backgroundColor: PAL.white, borderRadius: 28,
        padding: 32, alignItems: 'center', gap: 10,
        width: Math.min(W * 0.8, 340),
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    },
    popupTitle: { fontSize: 26, fontWeight: '900', color: PAL.textDark },
    popupSub: { fontSize: 16, fontWeight: '700', color: PAL.brown },
    popupBtn: {
        backgroundColor: PAL.sun, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 50, marginTop: 8,
        shadowColor: PAL.sun, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    },
    popupBtnText: { fontSize: 18, fontWeight: '900', color: PAL.textDark },
});
