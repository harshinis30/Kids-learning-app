/**
 * Stage3Recognition.tsx — "Help Milo Find the Right Sign!" · Level 3
 * 
 * A cheerful 2D Letter Recognition mini-game for ages 3-4.
 * Milo stands on a sunny road and the child taps the correct road sign
 * showing the target letter. Features 4 activity types, adaptive tracking,
 * playful Milo reactions, and a bright PBS-Kids-style visual palette.
 * 
 * 2D only — no 3D. Flat illustration style.
 */

import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { useWritingCompletion } from './WritingLevelHub';

// ── Constants ─────────────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('window');

const PALETTE = {
    sky: '#87CEEB',
    sun: '#FFD700',
    mint: '#98E8C1',
    coral: '#FF7F6E',
    cream: '#FFFDF5',
    grass: '#7BC67E',
    grassDark: '#5DAE60',
    road: '#D2B48C',
    roadDark: '#A0855B',
    brown: '#6B3A2A',
    white: '#FFFFFF',
    textDark: '#3E2723',
};

const SIGN_COLORS = ['#FFE4B5', '#C8E6C9', '#FFCCBC', '#B3E5FC', '#E1BEE7', '#FFF9C4'];

// ── Activity Types ────────────────────────────────────────────────────────────

type ActivityType = 'identify' | 'case_match' | 'odd_one_out' | 'confusion_pair';

interface Round {
    type: ActivityType;
    targetLetter: string;
    prompt: string;
    options: { id: string; label: string }[];
    correctId: string;
}

// ── Generate Rounds ───────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRounds(): Round[] {
    const rounds: Round[] = [];

    // Round 1: Letter Identification (3 signs)
    const letters1 = ['A', 'D', 'M'];
    const target1 = pickRandom(letters1);
    rounds.push({
        type: 'identify',
        targetLetter: target1,
        prompt: `Find the letter ${target1}!`,
        options: shuffleArray(letters1.map(l => ({ id: l, label: l }))),
        correctId: target1,
    });

    // Round 2: Letter Identification (3 signs)
    const letters2 = ['B', 'S', 'T'];
    const target2 = pickRandom(letters2);
    rounds.push({
        type: 'identify',
        targetLetter: target2,
        prompt: `Tap the letter ${target2}!`,
        options: shuffleArray(letters2.map(l => ({ id: l, label: l }))),
        correctId: target2,
    });

    // Round 3: Uppercase ↔ Lowercase Match
    const casePairs = [
        { upper: 'A', lowerCorrect: 'a', lowerWrong: 'd' },
        { upper: 'B', lowerCorrect: 'b', lowerWrong: 'p' },
        { upper: 'G', lowerCorrect: 'g', lowerWrong: 'q' },
    ];
    const casePick = pickRandom(casePairs);
    rounds.push({
        type: 'case_match',
        targetLetter: casePick.upper,
        prompt: `Match ${casePick.upper} to its lowercase!`,
        options: shuffleArray([
            { id: casePick.lowerCorrect, label: casePick.lowerCorrect },
            { id: casePick.lowerWrong, label: casePick.lowerWrong },
        ]),
        correctId: casePick.lowerCorrect,
    });

    // Round 4: Odd One Out
    const oddPairs = [
        { same: 'B', odd: 'D' },
        { same: 'O', odd: 'Q' },
        { same: 'P', odd: 'R' },
    ];
    const oddPick = pickRandom(oddPairs);
    rounds.push({
        type: 'odd_one_out',
        targetLetter: oddPick.odd,
        prompt: `Tap the one that's different!`,
        options: shuffleArray([
            { id: `${oddPick.same}_1`, label: oddPick.same },
            { id: oddPick.odd, label: oddPick.odd },
            { id: `${oddPick.same}_2`, label: oddPick.same },
        ]),
        correctId: oddPick.odd,
    });

    // Round 5: Confusion Pairs Drill
    const confusionPairs = [
        { a: 'b', b: 'd' },
        { a: 'p', b: 'q' },
        { a: 'M', b: 'N' },
        { a: 'C', b: 'G' },
    ];
    const confPick = pickRandom(confusionPairs);
    const confTarget = Math.random() > 0.5 ? confPick.a : confPick.b;
    rounds.push({
        type: 'confusion_pair',
        targetLetter: confTarget,
        prompt: `Find the letter ${confTarget}!`,
        options: shuffleArray([
            { id: confPick.a, label: confPick.a },
            { id: confPick.b, label: confPick.b },
        ]),
        correctId: confTarget,
    });

    return rounds;
}

// ── Adaptive Tracking ─────────────────────────────────────────────────────────

interface LetterStats {
    attempts: number;
    correctFirstTry: number;
    retries: number;
}

// Shared state for Stage 4 reference
export const practiceFlags = new Set<string>();

export const flagLetterForPractice = (letter: string) => {
    practiceFlags.add(letter);
};

// ── SVG Road Background ──────────────────────────────────────────────────────

function RoadBackground() {
    return (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Sky */}
            <Rect x={0} y={0} width={W} height={H} fill={PALETTE.sky} />

            {/* Sun */}
            <Circle cx={W * 0.82} cy={H * 0.08} r={45} fill={PALETTE.sun} opacity={0.9} />
            <Circle cx={W * 0.82} cy={H * 0.08} r={55} fill={PALETTE.sun} opacity={0.2} />

            {/* Clouds */}
            <Ellipse cx={W * 0.2} cy={H * 0.06} rx={50} ry={22} fill={PALETTE.white} opacity={0.85} />
            <Ellipse cx={W * 0.25} cy={H * 0.05} rx={35} ry={18} fill={PALETTE.white} opacity={0.75} />
            <Ellipse cx={W * 0.6} cy={H * 0.1} rx={60} ry={20} fill={PALETTE.white} opacity={0.7} />
            <Ellipse cx={W * 0.55} cy={H * 0.09} rx={40} ry={16} fill={PALETTE.white} opacity={0.8} />

            {/* Distant hills */}
            <Ellipse cx={W * 0.3} cy={H * 0.45} rx={W * 0.5} ry={120} fill="#A5D6A7" />
            <Ellipse cx={W * 0.75} cy={H * 0.42} rx={W * 0.4} ry={100} fill="#81C784" />

            {/* Main grass */}
            <Rect x={0} y={H * 0.45} width={W} height={H * 0.55} fill={PALETTE.grass} />
            <Rect x={0} y={H * 0.48} width={W} height={H * 0.52} fill={PALETTE.grassDark} />

            {/* Road */}
            <Path
                d={`M ${W * 0.35} ${H} Q ${W * 0.4} ${H * 0.7} ${W * 0.5} ${H * 0.55} Q ${W * 0.6} ${H * 0.7} ${W * 0.65} ${H}`}
                fill={PALETTE.road}
            />
            <Path
                d={`M ${W * 0.42} ${H} Q ${W * 0.45} ${H * 0.72} ${W * 0.5} ${H * 0.58} Q ${W * 0.55} ${H * 0.72} ${W * 0.58} ${H}`}
                fill={PALETTE.roadDark}
                opacity={0.3}
            />

            {/* Road dashes */}
            <Rect x={W * 0.485} y={H * 0.62} width={W * 0.03} height={18} rx={4} fill={PALETTE.cream} opacity={0.6} />
            <Rect x={W * 0.48} y={H * 0.7} width={W * 0.04} height={22} rx={4} fill={PALETTE.cream} opacity={0.5} />
            <Rect x={W * 0.475} y={H * 0.8} width={W * 0.05} height={26} rx={4} fill={PALETTE.cream} opacity={0.4} />

            {/* Left tree */}
            <Rect x={W * 0.08} y={H * 0.32} width={16} height={H * 0.16} fill={PALETTE.brown} />
            <Circle cx={W * 0.09} cy={H * 0.3} r={35} fill="#4CAF50" />
            <Circle cx={W * 0.06} cy={H * 0.32} r={25} fill="#66BB6A" />
            <Circle cx={W * 0.12} cy={H * 0.31} r={28} fill="#388E3C" />

            {/* Right tree */}
            <Rect x={W * 0.88} y={H * 0.35} width={14} height={H * 0.13} fill={PALETTE.brown} />
            <Circle cx={W * 0.89} cy={H * 0.33} r={30} fill="#4CAF50" />
            <Circle cx={W * 0.86} cy={H * 0.35} r={22} fill="#66BB6A" />
            <Circle cx={W * 0.92} cy={H * 0.34} r={24} fill="#388E3C" />

            {/* Small flowers */}
            <Circle cx={W * 0.15} cy={H * 0.52} r={5} fill="#FF7F6E" />
            <Circle cx={W * 0.22} cy={H * 0.56} r={4} fill="#FFD700" />
            <Circle cx={W * 0.78} cy={H * 0.53} r={5} fill="#E1BEE7" />
            <Circle cx={W * 0.85} cy={H * 0.57} r={4} fill="#FF7F6E" />
            <Circle cx={W * 0.3} cy={H * 0.6} r={3} fill="#FFD700" />
            <Circle cx={W * 0.7} cy={H * 0.59} r={4} fill={PALETTE.mint} />
        </Svg>
    );
}

// ── Milo Character ────────────────────────────────────────────────────────────

type MiloState = 'idle' | 'happy' | 'confused' | 'celebrate' | 'nudge';

function MiloCharacter({ state, onSpeechBubbleTap }: { state: MiloState; onSpeechBubbleTap: () => void }) {
    const [bounceAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(1));
    const [rotateAnim] = useState(new Animated.Value(0));
    const [bubbleAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        // Continuous idle bounce
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: -12, duration: 700, useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
            ])
        ).start();

        // Speech bubble pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(bubbleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(bubbleAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, [bounceAnim, bubbleAnim]);

    useEffect(() => {
        if (state === 'happy') {
            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1.3, friction: 3, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]).start();
        } else if (state === 'confused') {
            Animated.sequence([
                Animated.timing(rotateAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(rotateAnim, { toValue: -1, duration: 200, useNativeDriver: true }),
                Animated.timing(rotateAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        } else if (state === 'celebrate') {
            Animated.loop(
                Animated.sequence([
                    Animated.spring(scaleAnim, { toValue: 1.2, friction: 3, useNativeDriver: true }),
                    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
                ]),
                { iterations: 3 }
            ).start();
        } else if (state === 'nudge') {
            Animated.sequence([
                Animated.timing(rotateAnim, { toValue: 0.5, duration: 300, useNativeDriver: true }),
                Animated.timing(rotateAnim, { toValue: -0.5, duration: 300, useNativeDriver: true }),
                Animated.timing(rotateAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        }
    }, [state, scaleAnim, rotateAnim]);

    const rotate = rotateAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-15deg', '0deg', '15deg'],
    });

    const miloEmoji = state === 'happy' ? '🙌' : state === 'confused' ? '🤔' : state === 'celebrate' ? '🥳' : state === 'nudge' ? '👉' : '🐵';
    const bubbleContent = state === 'confused' ? '❓' : state === 'happy' ? '⭐' : '🔊';

    return (
        <View style={styles.miloContainer} pointerEvents="box-none">
            {/* Speech Bubble */}
            <TouchableOpacity
                onPress={onSpeechBubbleTap}
                activeOpacity={0.7}
                style={styles.speechBubbleTouch}
            >
                <Animated.View style={[styles.speechBubble, { opacity: bubbleAnim }]}>
                    <Text style={styles.speechBubbleText}>{bubbleContent}</Text>
                    <View style={styles.speechBubbleArrow} />
                </Animated.View>
            </TouchableOpacity>

            {/* Milo */}
            <Animated.View
                style={[
                    styles.miloBody,
                    {
                        transform: [
                            { translateY: bounceAnim },
                            { scale: scaleAnim },
                            { rotate },
                        ],
                    },
                ]}
            >
                <Text style={styles.miloEmoji}>{miloEmoji}</Text>
            </Animated.View>
        </View>
    );
}

// ── Road Sign Button ──────────────────────────────────────────────────────────

function RoadSign({
    label,
    color,
    onPress,
    disabled,
    wiggle,
    correct,
}: {
    label: string;
    color: string;
    onPress: () => void;
    disabled: boolean;
    wiggle: boolean;
    correct: boolean;
}) {
    const [pressAnim] = useState(new Animated.Value(1));
    const [wiggleAnim] = useState(new Animated.Value(0));
    const [glowAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        if (wiggle) {
            Animated.sequence([
                Animated.timing(wiggleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
                Animated.timing(wiggleAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
                Animated.timing(wiggleAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
                Animated.timing(wiggleAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
            ]).start();
        }
    }, [wiggle, wiggleAnim]);

    useEffect(() => {
        if (correct) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(glowAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
                ]),
                { iterations: 3 }
            ).start();
        }
    }, [correct, glowAnim]);

    const handlePressIn = () => {
        Animated.spring(pressAnim, { toValue: 0.92, friction: 5, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(pressAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    };

    const wiggleRotate = wiggleAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-8deg', '0deg', '8deg'],
    });

    return (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            activeOpacity={1}
            style={styles.signTouchTarget}
        >
            <Animated.View
                style={[
                    styles.signWrapper,
                    {
                        transform: [
                            { scale: pressAnim },
                            { rotate: wiggleRotate },
                        ],
                    },
                ]}
            >
                {/* Sign post */}
                <View style={styles.signPost} />

                {/* Sign plate */}
                <View style={[styles.signPlate, { backgroundColor: color }]}>
                    {correct && (
                        <Animated.View style={[styles.signGlow, { opacity: glowAnim }]} />
                    )}
                    <Text style={styles.signLetter}>{label}</Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

// ── Star Burst Particles ──────────────────────────────────────────────────────

function StarBurst({ visible }: { visible: boolean }) {
    const [particles] = useState(() =>
        Array.from({ length: 12 }, (_, i) => ({
            anim: new Animated.Value(0),
            angle: (i / 12) * Math.PI * 2,
        }))
    );

    useEffect(() => {
        if (visible) {
            particles.forEach(p => {
                p.anim.setValue(0);
                Animated.timing(p.anim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }).start();
            });
        }
    }, [visible, particles]);

    if (!visible) return null;

    return (
        <View style={styles.starBurstContainer} pointerEvents="none">
            {particles.map((p, i) => {
                const tx = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * 100] });
                const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * 100] });
                const opacity = p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
                const scale = p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.2, 0.5] });
                return (
                    <Animated.Text
                        key={i}
                        style={[
                            styles.starParticle,
                            {
                                transform: [{ translateX: tx }, { translateY: ty }, { scale }],
                                opacity,
                            },
                        ]}
                    >
                        {i % 3 === 0 ? '⭐' : i % 3 === 1 ? '✨' : '🌟'}
                    </Animated.Text>
                );
            })}
        </View>
    );
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function ConfettiDrop({ visible }: { visible: boolean }) {
    const [pieces] = useState(() =>
        Array.from({ length: 20 }, (_, i) => ({
            anim: new Animated.Value(0),
            x: Math.random() * W,
            emoji: pickRandom(['🎊', '🎉', '🌈', '⭐', '🎀', '💫']),
            delay: Math.random() * 400,
        }))
    );

    useEffect(() => {
        if (visible) {
            pieces.forEach(p => {
                p.anim.setValue(0);
                Animated.timing(p.anim, {
                    toValue: 1,
                    duration: 2000,
                    delay: p.delay,
                    useNativeDriver: true,
                }).start();
            });
        }
    }, [visible, pieces]);

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.map((p, i) => {
                const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-50, H + 50] });
                const opacity = p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
                const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
                return (
                    <Animated.Text
                        key={i}
                        style={{
                            position: 'absolute',
                            left: p.x,
                            top: 0,
                            fontSize: 24,
                            transform: [{ translateY: ty }, { rotate }],
                            opacity,
                        }}
                    >
                        {p.emoji}
                    </Animated.Text>
                );
            })}
        </View>
    );
}

// ── Progress Dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current, stars }: { total: number; current: number; stars: number }) {
    return (
        <View style={styles.progressContainer}>
            <View style={styles.progressDots}>
                {Array.from({ length: total }, (_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressDot,
                            i < current && styles.progressDotDone,
                            i === current && styles.progressDotActive,
                        ]}
                    />
                ))}
            </View>
            <View style={styles.starRow}>
                {Array.from({ length: stars }, (_, i) => (
                    <Text key={i} style={styles.starEmoji}>⭐</Text>
                ))}
            </View>
        </View>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TOTAL_ROUNDS = 5;

export default function Stage3Recognition() {
    const [rounds] = useState(() => generateRounds());
    const [currentRound, setCurrentRound] = useState(0);
    const [showCompletion, setShowCompletion] = useState(false);
    const [stars, setStars] = useState(0);
    const [miloState, setMiloState] = useState<MiloState>('idle');
    const [interactionLocked, setInteractionLocked] = useState(false);
    const [wiggleSignIds, setWiggleSignIds] = useState<string[]>([]);
    const [correctSignId, setCorrectSignId] = useState<string | null>(null);
    const [showStarBurst, setShowStarBurst] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Adaptive tracking
    const [letterStats, setLetterStats] = useState<Record<string, LetterStats>>({});
    const [struggledLetters, setStruggledLetters] = useState<string[]>([]);
    const roundMistakesRef = useRef(0);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Mark completion safely via hook
    useWritingCompletion(showCompletion, 3, Math.max(1, stars));

    const round = rounds[currentRound];

    // ── Speech ────────────────────────────────────────────────────────────────

    const speakPrompt = useCallback(() => {
        try {
            Speech.stop();
            Speech.speak(round?.prompt || '', {
                language: 'en-US',
                rate: 0.8,
                pitch: 1.2,
            });
        } catch (_) { /* Speech may not be available */ }
    }, [round]);

    // Auto-speak on round change
    useEffect(() => {
        if (!showCompletion && round) {
            const t = setTimeout(speakPrompt, 600);
            return () => clearTimeout(t);
        }
    }, [currentRound, showCompletion, speakPrompt, round]);

    // Idle nudge timer
    useEffect(() => {
        if (interactionLocked || showCompletion) return;

        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            setMiloState('nudge');
            setTimeout(() => setMiloState('idle'), 2000);
        }, 6000);

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [currentRound, interactionLocked, showCompletion]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSignTap = (optionId: string) => {
        if (interactionLocked || showCompletion) return;
        setInteractionLocked(true);

        const letter = round.targetLetter.toUpperCase();

        // Update tracking
        setLetterStats(prev => {
            const existing = prev[letter] || { attempts: 0, correctFirstTry: 0, retries: 0 };
            const updated = { ...existing, attempts: existing.attempts + 1 };

            if (optionId === round.correctId) {
                if (roundMistakesRef.current === 0) {
                    updated.correctFirstTry = existing.correctFirstTry + 1;
                }
            } else {
                updated.retries = existing.retries + 1;
            }

            return { ...prev, [letter]: updated };
        });

        if (optionId === round.correctId) {
            // ✅ CORRECT
            setMiloState('happy');
            setCorrectSignId(optionId);
            setShowStarBurst(true);
            setStars(s => s + 1);

            setTimeout(() => {
                setShowStarBurst(false);
                setCorrectSignId(null);
                setMiloState('idle');

                if (currentRound < TOTAL_ROUNDS - 1) {
                    setCurrentRound(c => c + 1);
                    roundMistakesRef.current = 0;
                } else {
                    // Round complete!
                    setMiloState('celebrate');
                    setShowConfetti(true);

                    // Calculate struggled letters
                    setLetterStats(prev => {
                        const struggled: string[] = [];
                        Object.entries(prev).forEach(([ltr, stats]) => {
                            if (stats.retries >= 2) {
                                struggled.push(ltr);
                                flagLetterForPractice(ltr);
                            }
                        });
                        setStruggledLetters(struggled);
                        return prev;
                    });

                    setTimeout(() => {
                        setShowCompletion(true);
                    }, 2500);
                }
                setInteractionLocked(false);
            }, 1500);
        } else {
            // ❌ WRONG — gentle response
            roundMistakesRef.current += 1;
            setMiloState('confused');
            setWiggleSignIds(round.options.filter(o => o.id !== round.correctId).map(o => o.id));

            // Flag if wrong 2+ times
            if (roundMistakesRef.current >= 2) {
                flagLetterForPractice(letter);
            }

            setTimeout(() => {
                setWiggleSignIds([]);
                setMiloState('idle');
                setInteractionLocked(false);
                // Auto-replay audio after wrong
                speakPrompt();
            }, 1200);
        }
    };

    // ── Completion Screen ─────────────────────────────────────────────────────

    if (showCompletion) {
        const totalLetters = Object.keys(letterStats).length;
        const perfectLetters = Object.values(letterStats).filter(s => s.retries === 0).length;
        const score = totalLetters > 0 ? Math.round((perfectLetters / totalLetters) * 100) : 100;

        return (
            <View style={styles.completionRoot}>
                <RoadBackground />
                <ConfettiDrop visible={true} />
                <View style={styles.completionCard}>
                    <Text style={styles.completionEmoji}>🎊</Text>
                    <Text style={styles.completionTitle}>Great Exploring!</Text>
                    <Text style={styles.completionSubtitle}>Milo found his way through all the signs!</Text>

                    <View style={styles.completionStars}>
                        {Array.from({ length: Math.min(stars, 5) }, (_, i) => (
                            <Text key={i} style={{ fontSize: 38 }}>⭐</Text>
                        ))}
                    </View>

                    <View style={styles.scoreCard}>
                        <Text style={styles.scoreText}>Score: {score}%</Text>
                    </View>

                    {/* Struggled letters summary */}
                    {struggledLetters.length > 0 && (
                        <View style={styles.struggleCard}>
                            <Text style={styles.struggleTitle}>⭐ Practice More:</Text>
                            <View style={styles.struggleLetters}>
                                {struggledLetters.map(l => (
                                    <View key={l} style={styles.struggleBadge}>
                                        <Text style={styles.struggleLetter}>{l}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Next Level */}
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => router.push('/writing-stage4' as any)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryBtnText}>Next Level → ✍️</Text>
                    </TouchableOpacity>

                    {/* Play Again */}
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => {
                            setCurrentRound(0);
                            setStars(0);
                            setShowCompletion(false);
                            setShowConfetti(false);
                            setMiloState('idle');
                            setLetterStats({});
                            setStruggledLetters([]);
                            roundMistakesRef.current = 0;
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryBtnText}>Play Again 🔁</Text>
                    </TouchableOpacity>

                    {/* Back */}
                    <TouchableOpacity onPress={() => router.push('/writing' as any)} style={{ marginTop: 8 }}>
                        <Text style={styles.backText}>Back to Levels</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Game Screen ───────────────────────────────────────────────────────────

    const signCount = round.options.length;
    const signSpacing = W / (signCount + 1);

    return (
        <View style={styles.gameRoot}>
            {/* Background */}
            <RoadBackground />

            {/* Top: Progress + Stars */}
            <ProgressDots total={TOTAL_ROUNDS} current={currentRound} stars={stars} />

            {/* Prompt Banner */}
            <View style={styles.promptBanner}>
                <Text style={styles.promptText}>{round.prompt}</Text>
            </View>

            {/* Milo (center-left of road) */}
            <View style={styles.miloZone}>
                <MiloCharacter state={miloState} onSpeechBubbleTap={speakPrompt} />
                <StarBurst visible={showStarBurst} />
            </View>

            {/* Signs Zone */}
            <View style={styles.signsZone}>
                {round.options.map((opt, i) => (
                    <View key={opt.id} style={[styles.signSlot, { left: signSpacing * (i + 1) - 55 }]}>
                        <RoadSign
                            label={opt.label}
                            color={SIGN_COLORS[i % SIGN_COLORS.length]}
                            onPress={() => handleSignTap(opt.id)}
                            disabled={interactionLocked}
                            wiggle={wiggleSignIds.includes(opt.id)}
                            correct={correctSignId === opt.id}
                        />
                    </View>
                ))}
            </View>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.bottomBtn} onPress={speakPrompt} activeOpacity={0.7}>
                    <Text style={styles.bottomBtnEmoji}>🔊</Text>
                    <Text style={styles.bottomBtnLabel}>Replay</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomBtn}
                    onPress={() => router.push('/writing' as any)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.bottomBtnEmoji}>🏠</Text>
                    <Text style={styles.bottomBtnLabel}>Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // Game root
    gameRoot: {
        flex: 1,
        backgroundColor: PALETTE.sky,
    },

    // Progress
    progressContainer: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 20,
    },
    progressDots: {
        flexDirection: 'row',
        gap: 8,
    },
    progressDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    progressDotActive: {
        backgroundColor: PALETTE.sun,
        borderColor: '#FFA000',
        transform: [{ scale: 1.3 }],
    },
    progressDotDone: {
        backgroundColor: PALETTE.mint,
        borderColor: '#66BB6A',
    },
    starRow: {
        flexDirection: 'row',
        gap: 2,
    },
    starEmoji: {
        fontSize: 22,
    },

    // Prompt
    promptBanner: {
        position: 'absolute',
        top: 90,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 20,
    },
    promptText: {
        fontSize: 22,
        fontWeight: '900',
        color: PALETTE.textDark,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        overflow: 'hidden',
        textAlign: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },

    // Milo zone
    miloZone: {
        position: 'absolute',
        left: W * 0.08,
        top: H * 0.38,
        alignItems: 'center',
        zIndex: 15,
    },

    // Milo character
    miloContainer: {
        alignItems: 'center',
    },
    speechBubbleTouch: {
        marginBottom: 4,
    },
    speechBubble: {
        backgroundColor: PALETTE.white,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    speechBubbleText: {
        fontSize: 22,
    },
    speechBubbleArrow: {
        position: 'absolute',
        bottom: -8,
        left: '40%' as any,
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: PALETTE.white,
    },
    miloBody: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miloEmoji: {
        fontSize: 65,
    },

    // Signs zone
    signsZone: {
        position: 'absolute',
        top: H * 0.38,
        left: 0,
        right: 0,
        height: 200,
        zIndex: 10,
    },
    signSlot: {
        position: 'absolute',
        top: 0,
    },
    signTouchTarget: {
        minWidth: 90,
        minHeight: 90,
        alignItems: 'center',
    },
    signWrapper: {
        alignItems: 'center',
    },
    signPost: {
        position: 'absolute',
        bottom: -40,
        width: 12,
        height: 60,
        backgroundColor: '#8D6E63',
        borderRadius: 3,
        zIndex: 0,
    },
    signPlate: {
        width: 100,
        height: 100,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 1,
    },
    signGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 18,
        backgroundColor: PALETTE.sun,
    },
    signLetter: {
        fontSize: 50,
        fontWeight: '900',
        color: PALETTE.textDark,
        letterSpacing: 1,
    },

    // Star burst
    starBurstContainer: {
        position: 'absolute',
        top: 30,
        left: 20,
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    starParticle: {
        position: 'absolute',
        fontSize: 20,
    },

    // Bottom bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        paddingBottom: 30,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 25,
    },
    bottomBtn: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 8,
    },
    bottomBtnEmoji: {
        fontSize: 30,
    },
    bottomBtnLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: PALETTE.textDark,
        marginTop: 2,
    },

    // Completion screen
    completionRoot: {
        flex: 1,
        backgroundColor: PALETTE.sky,
    },
    completionCard: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 40,
    },
    completionEmoji: {
        fontSize: 80,
    },
    completionTitle: {
        fontSize: 34,
        fontWeight: '900',
        color: PALETTE.textDark,
        textAlign: 'center',
        marginTop: 8,
    },
    completionSubtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#5D4037',
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 12,
    },
    completionStars: {
        flexDirection: 'row',
        gap: 6,
        marginVertical: 8,
    },
    scoreCard: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    scoreText: {
        fontSize: 24,
        fontWeight: '900',
        color: PALETTE.textDark,
    },
    struggleCard: {
        backgroundColor: 'rgba(255,215,0,0.25)',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'rgba(255,215,0,0.5)',
        alignItems: 'center',
    },
    struggleTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#F57F17',
        marginBottom: 8,
    },
    struggleLetters: {
        flexDirection: 'row',
        gap: 10,
    },
    struggleBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: PALETTE.sun,
        shadowColor: PALETTE.sun,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },
    struggleLetter: {
        fontSize: 22,
        fontWeight: '900',
        color: PALETTE.textDark,
    },

    // Buttons
    primaryBtn: {
        backgroundColor: PALETTE.sun,
        paddingHorizontal: 40,
        paddingVertical: 18,
        borderRadius: 50,
        shadowColor: PALETTE.sun,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        marginTop: 4,
    },
    primaryBtnText: {
        fontSize: 20,
        fontWeight: '900',
        color: PALETTE.textDark,
    },
    secondaryBtn: {
        backgroundColor: PALETTE.mint,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 50,
        marginTop: 12,
        shadowColor: PALETTE.mint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: PALETTE.textDark,
    },
    backText: {
        fontSize: 14,
        color: '#8D6E63',
        fontWeight: '700',
    },
});
