/**
 * StoryIntro.tsx — Shared story intro screen for all Writing Module stages.
 *
 * Shows a beautiful jungle-themed screen with Milo, story text, and a CTA
 * button before gameplay begins. Designed for young children (ages 3-5).
 */

import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
    skyTop: '#87CEEB',
    skyMid: '#B4E0F5',
    sun: '#FFD700',
    sunGlow: '#FFF3B0',
    cloud: '#FFFFFF',
    grassLight: '#A8E6A1',
    grassDark: '#7BC67E',
    treeTrunk: '#8D6E63',
    leafDk: '#388E3C',
    leafMd: '#4CAF50',
    leafLt: '#66BB6A',
    flower1: '#FF7F6E',
    flower2: '#E1BEE7',
    flower3: '#FFD700',
    textDark: '#3E2723',
    white: '#FFFFFF',
    btnGreen: '#66BB6A',
    btnGreenDark: '#388E3C',
    cardBg: 'rgba(255,255,255,0.92)',
};

// ── Jungle Background ─────────────────────────────────────────────────────────

function JungleBg() {
    return (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Sky gradient layers */}
            <Rect x={0} y={0} width={W} height={H} fill={C.skyTop} />
            <Rect x={0} y={H * 0.25} width={W} height={H * 0.75} fill={C.skyMid} opacity={0.5} />

            {/* Sun */}
            <Circle cx={W * 0.82} cy={H * 0.08} r={65} fill={C.sunGlow} opacity={0.25} />
            <Circle cx={W * 0.82} cy={H * 0.08} r={45} fill={C.sun} opacity={0.9} />

            {/* Clouds */}
            <Ellipse cx={W * 0.15} cy={H * 0.06} rx={55} ry={20} fill={C.cloud} opacity={0.85} />
            <Ellipse cx={W * 0.2} cy={H * 0.05} rx={35} ry={16} fill={C.cloud} opacity={0.75} />
            <Ellipse cx={W * 0.55} cy={H * 0.09} rx={65} ry={22} fill={C.cloud} opacity={0.7} />
            <Ellipse cx={W * 0.6} cy={H * 0.08} rx={40} ry={16} fill={C.cloud} opacity={0.8} />

            {/* Distant hills */}
            <Ellipse cx={W * 0.3} cy={H * 0.55} rx={W * 0.6} ry={140} fill="#A5D6A7" />
            <Ellipse cx={W * 0.75} cy={H * 0.52} rx={W * 0.45} ry={110} fill="#81C784" />

            {/* Main grass */}
            <Rect x={0} y={H * 0.55} width={W} height={H * 0.45} fill={C.grassLight} />
            <Rect x={0} y={H * 0.6} width={W} height={H * 0.4} fill={C.grassDark} />

            {/* Left tree */}
            <Rect x={W * 0.06} y={H * 0.35} width={18} height={H * 0.22} fill={C.treeTrunk} />
            <Circle cx={W * 0.07} cy={H * 0.33} r={38} fill={C.leafMd} />
            <Circle cx={W * 0.04} cy={H * 0.35} r={26} fill={C.leafLt} />
            <Circle cx={W * 0.1} cy={H * 0.34} r={30} fill={C.leafDk} />

            {/* Right tree */}
            <Rect x={W * 0.88} y={H * 0.38} width={16} height={H * 0.18} fill={C.treeTrunk} />
            <Circle cx={W * 0.89} cy={H * 0.36} r={34} fill={C.leafMd} />
            <Circle cx={W * 0.86} cy={H * 0.38} r={24} fill={C.leafLt} />
            <Circle cx={W * 0.92} cy={H * 0.37} r={27} fill={C.leafDk} />

            {/* Vines */}
            <Path d={`M ${W * 0.04} ${H * 0.3} Q ${W * 0.02} ${H * 0.45} ${W * 0.08} ${H * 0.5}`} stroke={C.leafDk} strokeWidth={3} fill="none" opacity={0.6} />
            <Path d={`M ${W * 0.92} ${H * 0.33} Q ${W * 0.96} ${H * 0.45} ${W * 0.9} ${H * 0.52}`} stroke={C.leafDk} strokeWidth={3} fill="none" opacity={0.6} />

            {/* Flowers */}
            <Circle cx={W * 0.18} cy={H * 0.63} r={5} fill={C.flower1} />
            <Circle cx={W * 0.25} cy={H * 0.67} r={4} fill={C.flower3} />
            <Circle cx={W * 0.75} cy={H * 0.64} r={5} fill={C.flower2} />
            <Circle cx={W * 0.83} cy={H * 0.68} r={4} fill={C.flower1} />
            <Circle cx={W * 0.35} cy={H * 0.72} r={3.5} fill={C.flower3} />
            <Circle cx={W * 0.65} cy={H * 0.71} r={4} fill={C.flower2} />
        </Svg>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface StoryIntroProps {
    /** Stage number (1, 2, 3) */
    stageNumber: number;
    /** Title shown prominently */
    title: string;
    /** Multi-line story text array (each string = one paragraph/line) */
    storyLines: string[];
    /** Goal message shown below story */
    goalMessage: string;
    /** CTA button label */
    buttonLabel: string;
    /** Called when user presses the start button */
    onStart: () => void;
    /** Optional extra background layer (rendered between BG and card, behind Milo) */
    backgroundExtra?: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StoryIntro({
    stageNumber,
    title,
    storyLines,
    goalMessage,
    buttonLabel,
    onStart,
    backgroundExtra,
}: StoryIntroProps) {
    // ── Animations ─────────────
    const [miloY] = useState(new Animated.Value(0));
    const [cardOpacity] = useState(new Animated.Value(0));
    const [cardSlide] = useState(new Animated.Value(40));
    const [btnScale] = useState(new Animated.Value(0.85));

    useEffect(() => {
        // Milo idle bounce
        Animated.loop(
            Animated.sequence([
                Animated.timing(miloY, { toValue: -12, duration: 700, useNativeDriver: true }),
                Animated.timing(miloY, { toValue: 0, duration: 700, useNativeDriver: true }),
            ])
        ).start();

        // Card entrance
        Animated.parallel([
            Animated.timing(cardOpacity, { toValue: 1, duration: 600, delay: 300, useNativeDriver: true }),
            Animated.spring(cardSlide, { toValue: 0, friction: 6, delay: 300, useNativeDriver: true }),
        ]).start();

        // Button pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(btnScale, { toValue: 1.05, duration: 800, useNativeDriver: true }),
                Animated.timing(btnScale, { toValue: 0.95, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, [miloY, cardOpacity, cardSlide, btnScale]);

    return (
        <View style={st.root}>
            <JungleBg />

            {/* Optional extra background scenery (e.g. Stage 2 shapes in Stage 3) */}
            {backgroundExtra}

            {/* Stage badge */}
            <View style={st.stageBadge}>
                <Text style={st.stageBadgeText}>Stage {stageNumber}</Text>
            </View>

            {/* Milo */}
            <Animated.View style={[st.miloWrap, { transform: [{ translateY: miloY }] }]} pointerEvents="none">
                <Text style={st.miloEmoji}>🐒</Text>
            </Animated.View>

            {/* Story card */}
            <Animated.View style={[st.card, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
                <Text style={st.title}>{title}</Text>

                <View style={st.divider} />

                {storyLines.map((line, i) => (
                    <Text key={i} style={st.storyLine}>{line}</Text>
                ))}

                <View style={st.goalBox}>
                    <Text style={st.goalEmoji}>🎯</Text>
                    <Text style={st.goalText}>{goalMessage}</Text>
                </View>

                {/* Start button */}
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                    <TouchableOpacity style={st.startBtn} onPress={onStart} activeOpacity={0.8}>
                        <Text style={st.startBtnText}>{buttonLabel}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_W = Math.min(W * 0.88, 420);

const st = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stageBadge: {
        position: 'absolute',
        top: H * 0.04,
        left: W * 0.5 - 55,
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: C.sun,
    },
    stageBadgeText: {
        fontSize: 16,
        fontWeight: '900',
        color: C.textDark,
        letterSpacing: 1,
    },
    miloWrap: {
        position: 'absolute',
        top: H * 0.12,
        alignSelf: 'center',
    },
    miloEmoji: {
        fontSize: 80,
        textAlign: 'center',
    },
    card: {
        width: CARD_W,
        backgroundColor: C.cardBg,
        borderRadius: 28,
        paddingVertical: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        marginTop: H * 0.15,
        // Soft shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: C.textDark,
        textAlign: 'center',
        marginBottom: 4,
    },
    divider: {
        width: 60,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.sun,
        marginVertical: 12,
    },
    storyLine: {
        fontSize: 16,
        lineHeight: 24,
        color: '#4E342E',
        textAlign: 'center',
        marginBottom: 6,
        fontWeight: '500',
    },
    goalBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginTop: 12,
        marginBottom: 18,
        gap: 8,
        borderWidth: 1.5,
        borderColor: '#FFD54F',
    },
    goalEmoji: {
        fontSize: 22,
    },
    goalText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F57F17',
        flex: 1,
    },
    startBtn: {
        backgroundColor: C.btnGreen,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        borderBottomWidth: 4,
        borderBottomColor: C.btnGreenDark,
        minWidth: 220,
        alignItems: 'center',
    },
    startBtnText: {
        fontSize: 20,
        fontWeight: '900',
        color: C.white,
        letterSpacing: 0.5,
    },
});
