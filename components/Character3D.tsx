/**
 * Character3D.tsx — 2D Animated Character with Full Viseme Lip-Sync
 *
 * Renders a vivid, expressive character using only React Native Animated + Views.
 * Supports 13 distinct mouth shapes matching each viseme from lipSyncService.
 *
 * Mouth shapes per viseme:
 *   sil  → thin closed line
 *   AA   → wide tall oval  (apple, father)
 *   E    → wide flat smile (bed, said)
 *   I    → narrow smile    (bee, see)
 *   O    → round circle    (boat, show)
 *   U    → small pucker    (boot, blue)
 *   M    → pressed closed  (mom)
 *   F    → lower lip rolled up (fun)
 *   L    → slightly open   (love)
 *   W    → small round     (wow)
 *   TH   → slightly open + wide (think)
 *   S    → tiny slit       (see)
 *   R    → medium round    (red)
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import {
    LipSyncAnimation,
    VisemeType,
    getBlendWeightsAtTime,
} from '../services/lipSyncService';

interface Character3DProps {
    isAnimating?: boolean;
    animationType?: 'idle' | 'speaking' | 'celebrating' | 'encouraging';
    lipSyncAnimation?: LipSyncAnimation | null;
    currentAnimationTime?: number;
}

// Per-viseme mouth geometry: [width, height, borderRadius, isSmile]
// isSmile → use upward curve; false → use downward oval
const VISEME_MOUTH: Record<VisemeType, {
    w: number; h: number; r: number;
    smile: boolean;   // widen mouth corners up
    pucker: boolean;  // narrow & round
    fTeeth: boolean;  // show "F" lower-lip contact
}> = {
    sil: { w: 22, h: 4, r: 2, smile: false, pucker: false, fTeeth: false },
    AA: { w: 38, h: 26, r: 14, smile: false, pucker: false, fTeeth: false },
    E: { w: 40, h: 14, r: 6, smile: true, pucker: false, fTeeth: false },
    I: { w: 32, h: 8, r: 4, smile: true, pucker: false, fTeeth: false },
    O: { w: 26, h: 28, r: 14, smile: false, pucker: false, fTeeth: false },
    U: { w: 18, h: 20, r: 12, smile: false, pucker: true, fTeeth: false },
    M: { w: 24, h: 3, r: 2, smile: false, pucker: true, fTeeth: false },
    F: { w: 28, h: 10, r: 5, smile: false, pucker: false, fTeeth: true },
    L: { w: 30, h: 14, r: 7, smile: false, pucker: false, fTeeth: false },
    W: { w: 20, h: 20, r: 12, smile: false, pucker: true, fTeeth: false },
    TH: { w: 34, h: 10, r: 5, smile: false, pucker: false, fTeeth: false },
    S: { w: 28, h: 5, r: 3, smile: true, pucker: false, fTeeth: false },
    R: { w: 24, h: 16, r: 10, smile: false, pucker: true, fTeeth: false },
};

export function Character3D({
    animationType = 'idle',
    lipSyncAnimation = null,
    currentAnimationTime = 0,
}: Character3DProps) {

    // ── Mouth animated values ─────────────────────────────────────────────────
    const mouthW = useRef(new Animated.Value(22)).current;
    const mouthH = useRef(new Animated.Value(4)).current;
    const mouthR = useRef(new Animated.Value(2)).current;
    const smileAmt = useRef(new Animated.Value(0)).current;  // 0–1 → corner lift
    const puckerAmt = useRef(new Animated.Value(0)).current;  // 0–1 → narrow ring
    const fTeethAmt = useRef(new Animated.Value(0)).current;  // 0–1 → lower-lip show

    // ── Body animations ───────────────────────────────────────────────────────
    const bodyBounce = useRef(new Animated.Value(0)).current;
    const bodyRotate = useRef(new Animated.Value(0)).current;
    const bodyScale = useRef(new Animated.Value(1)).current;

    // ── Face extras ───────────────────────────────────────────────────────────
    const eyeBlink = useRef(new Animated.Value(1)).current;
    const eyeSquint = useRef(new Animated.Value(1)).current; // 1=normal, 0=happy
    const cheekGlow = useRef(new Animated.Value(0)).current;
    const eyebrowY = useRef(new Animated.Value(0)).current;
    const starOpacity = useRef(new Animated.Value(0)).current;
    const starY = useRef(new Animated.Value(0)).current;
    const starScale = useRef(new Animated.Value(0)).current;

    // ── Live refs so closures always see latest props ─────────────────────────
    const lipSyncRef = useRef(lipSyncAnimation);
    const animTimeRef = useRef(currentAnimationTime);
    const animTypeRef = useRef(animationType);
    lipSyncRef.current = lipSyncAnimation;
    animTimeRef.current = currentAnimationTime;
    animTypeRef.current = animationType;

    // ── Helper: animate mouth to a target viseme shape ────────────────────────
    const animateMouth = (v: VisemeType, durationMs = 80) => {
        const target = VISEME_MOUTH[v];
        const cfg = { duration: durationMs, useNativeDriver: false };
        Animated.parallel([
            Animated.timing(mouthW, { toValue: target.w, ...cfg }),
            Animated.timing(mouthH, { toValue: target.h, ...cfg }),
            Animated.timing(mouthR, { toValue: target.r, ...cfg }),
            Animated.timing(smileAmt, { toValue: target.smile ? 1 : 0, ...cfg }),
            Animated.timing(puckerAmt, { toValue: target.pucker ? 1 : 0, ...cfg }),
            Animated.timing(fTeethAmt, { toValue: target.fTeeth ? 1 : 0, ...cfg }),
        ]).start();
    };

    // ── Resolve current viseme from blend weights (dominant wins) ─────────────
    const resolveViseme = (): VisemeType => {
        const ls = lipSyncRef.current;
        const t = animTimeRef.current;
        if (!ls) return 'sil';
        const w = getBlendWeightsAtTime(ls, t);

        // Score each viseme by euclidean-style distance to current weights
        const keys: (keyof typeof w)[] = ['jawOpen', 'mouthSmile', 'mouthFunnel', 'mouthPucker'];
        let best: VisemeType = 'sil';
        let bestScore = Infinity;

        (Object.keys(VISEME_MOUTH) as VisemeType[]).forEach(viseme => {
            const vshape = VISEME_MOUTH[viseme];
            // Quick proxy: jaw ~ h/30, smile ~ smile, funnel ~ pucker
            const jaw = (w.jawOpen ?? 0);
            const smile = (w.mouthSmile ?? 0);
            const pucker = (w.mouthPucker ?? 0);
            const funnel = (w.mouthFunnel ?? 0);

            const dJaw = Math.abs(jaw - vshape.h / 30);
            const dSmile = Math.abs(smile - (vshape.smile ? 0.8 : 0));
            const dPucker = Math.abs(pucker - (vshape.pucker ? 0.7 : 0));
            const dFunnel = Math.abs(funnel - (vshape.fTeeth ? 0 : 0));
            const score = dJaw + dSmile + dPucker + dFunnel;
            if (score < bestScore) { bestScore = score; best = viseme; }
        });
        return best;
    };

    // ── Blink loop ────────────────────────────────────────────────────────────
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const blink = () => {
            Animated.sequence([
                Animated.timing(eyeBlink, { toValue: 0, duration: 80, useNativeDriver: false }),
                Animated.timing(eyeBlink, { toValue: 1, duration: 80, useNativeDriver: false }),
            ]).start(() => {
                timeout = setTimeout(blink, 2000 + Math.random() * 3000);
            });
        };
        timeout = setTimeout(blink, 1800);
        return () => clearTimeout(timeout);
    }, []);

    // ── Idle breathing ────────────────────────────────────────────────────────
    useEffect(() => {
        if (animationType !== 'idle') {
            animateMouth('sil');
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(bodyBounce, { toValue: -5, duration: 1800, useNativeDriver: true }),
                Animated.timing(bodyBounce, { toValue: 0, duration: 1800, useNativeDriver: true }),
            ])
        );
        loop.start();
        animateMouth('sil');
        return () => loop.stop();
    }, [animationType]);

    // ── Speaking — poll viseme at 20fps ───────────────────────────────────────
    useEffect(() => {
        if (animationType !== 'speaking') {
            animateMouth('sil', 150);
            return;
        }

        // Gentle speaking bob
        const bobLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(bodyBounce, { toValue: -3, duration: 250, useNativeDriver: true }),
                Animated.timing(bodyBounce, { toValue: 0, duration: 250, useNativeDriver: true }),
            ])
        );
        bobLoop.start();

        let running = true;
        const poll = setInterval(() => {
            if (!running) return;
            const ls = lipSyncRef.current;
            if (ls) {
                // Use actual viseme data
                const viseme = resolveViseme();
                animateMouth(viseme, 60);
            } else {
                // Generic oscillation when no lip-sync data yet
                const phase = (Date.now() / 220) % (2 * Math.PI);
                const v: VisemeType = phase < 1 ? 'AA' : phase < 2 ? 'M' : phase < 3 ? 'O' : 'sil';
                animateMouth(v, 80);
            }
        }, 50); // 20fps mouth updates

        return () => {
            running = false;
            clearInterval(poll);
            bobLoop.stop();
            animateMouth('sil', 200);
        };
    }, [animationType]);

    // ── Celebrating ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (animationType !== 'celebrating') return;

        Animated.sequence([
            Animated.parallel([
                Animated.spring(bodyScale, { toValue: 1.2, friction: 4, tension: 200, useNativeDriver: true }),
                Animated.timing(bodyBounce, { toValue: -44, duration: 280, useNativeDriver: true }),
                Animated.timing(bodyRotate, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.spring(bodyScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
                Animated.timing(bodyBounce, { toValue: 0, duration: 380, useNativeDriver: true }),
                Animated.timing(bodyRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
        ]).start();

        Animated.timing(eyeSquint, { toValue: 0, duration: 200, useNativeDriver: false }).start();
        Animated.timing(cheekGlow, { toValue: 1, duration: 300, useNativeDriver: false }).start();
        Animated.timing(eyebrowY, { toValue: -6, duration: 200, useNativeDriver: false }).start();
        animateMouth('E', 200); // Big smile "E" = wide happy mouth

        // ✨ Stars burst
        Animated.sequence([
            Animated.parallel([
                Animated.timing(starOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(starScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
                Animated.timing(starY, { toValue: -36, duration: 600, useNativeDriver: true }),
            ]),
            Animated.timing(starOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();

        return () => {
            Animated.timing(eyeSquint, { toValue: 1, duration: 300, useNativeDriver: false }).start();
            Animated.timing(cheekGlow, { toValue: 0, duration: 300, useNativeDriver: false }).start();
            Animated.timing(eyebrowY, { toValue: 0, duration: 200, useNativeDriver: false }).start();
            starOpacity.setValue(0);
            starScale.setValue(0);
            starY.setValue(0);
        };
    }, [animationType]);

    // ── Encouraging ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (animationType !== 'encouraging') return;
        const nodLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(bodyBounce, { toValue: -5, duration: 280, useNativeDriver: true }),
                Animated.timing(bodyBounce, { toValue: 0, duration: 280, useNativeDriver: true }),
            ]),
            { iterations: 3 }
        );
        nodLoop.start();
        Animated.timing(eyebrowY, { toValue: -4, duration: 180, useNativeDriver: false }).start();
        animateMouth('L', 180);
        return () => {
            nodLoop.stop();
            Animated.timing(eyebrowY, { toValue: 0, duration: 180, useNativeDriver: false }).start();
        };
    }, [animationType]);

    // ── Derived animated styles ───────────────────────────────────────────────
    const spin = bodyRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });
    const eyeH = eyeBlink.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 18],
    });
    const eyeTopR = eyeSquint.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 10],
    });
    const cheekBg = cheekGlow.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,130,130,0)', 'rgba(255,130,130,0.55)'],
    });

    // Smile: top of mouth curves up at corners when smileAmt > 0
    const mouthTopR = smileAmt.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 18],
    });
    const mouthBotR = mouthR; // bottom stays round

    // Pucker: dark ring border to simulate rounded lips
    const puckerBorder = puckerAmt.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 4],
    });
    const puckerColor = puckerAmt.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', '#A04040'],
    });

    // F-teeth: a thin white strip inside mouth
    const fTeethH = fTeethAmt.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 5],
    });

    return (
        <View style={styles.wrapper}>
            {/* Floating stars (celebrations) */}
            <Animated.Text style={[
                styles.stars,
                { opacity: starOpacity, transform: [{ scale: starScale }, { translateY: starY }] }
            ]}>
                ✨⭐🌟
            </Animated.Text>

            {/* ── Main body ─────────────────────────────────────── */}
            <Animated.View style={[styles.body, {
                transform: [
                    { translateY: bodyBounce },
                    { rotate: spin },
                    { scale: bodyScale },
                ]
            }]}>

                {/* ── Head ─────────────────────────────────────── */}
                <View style={styles.head}>

                    {/* Eyebrows */}
                    <Animated.View style={[styles.eyebrowRow, { transform: [{ translateY: eyebrowY }] }]}>
                        <View style={styles.eyebrow} />
                        <View style={styles.eyebrow} />
                    </Animated.View>

                    {/* Eyes */}
                    <View style={styles.eyeRow}>
                        {[0, 1].map(i => (
                            <View key={i} style={styles.eyeOuter}>
                                <Animated.View style={[
                                    styles.eyeInner,
                                    { height: eyeH, borderTopLeftRadius: eyeTopR, borderTopRightRadius: eyeTopR }
                                ]} />
                            </View>
                        ))}
                    </View>

                    {/* Cheeks */}
                    <View style={styles.cheekRow}>
                        <Animated.View style={[styles.cheek, { backgroundColor: cheekBg }]} />
                        <Animated.View style={[styles.cheek, { backgroundColor: cheekBg }]} />
                    </View>

                    {/* ── MOUTH ──────────────────────────────────────
                         Uses animated width/height/radius + border ring (pucker)
                         and an inner strip (F-teeth) for maximum clarity.
                    ─────────────────────────────────────────────── */}
                    <View style={styles.mouthOuter}>
                        <Animated.View style={[
                            styles.mouthBase,
                            {
                                width: mouthW,
                                height: mouthH,
                                borderTopLeftRadius: mouthTopR,
                                borderTopRightRadius: mouthTopR,
                                borderBottomLeftRadius: mouthBotR,
                                borderBottomRightRadius: mouthBotR,
                                borderWidth: puckerBorder,
                                borderColor: puckerColor,
                            }
                        ]}>
                            {/* Upper lip highlight */}
                            <View style={styles.upperLip} />
                            {/* F / TH teeth strip */}
                            <Animated.View style={[styles.teethStrip, { height: fTeethH }]} />
                        </Animated.View>
                    </View>
                </View>

                {/* Neck */}
                <View style={styles.neck} />

                {/* Torso */}
                <View style={styles.torso}>
                    <View style={[styles.arm, styles.armLeft]} />
                    <View style={[styles.arm, styles.armRight]} />
                    <Text style={styles.badge}>⭐</Text>
                </View>

                {/* Legs */}
                <View style={styles.legRow}>
                    <View style={[styles.leg, { transform: [{ rotate: '-2deg' }] }]} />
                    <View style={[styles.leg, { transform: [{ rotate: '2deg' }] }]} />
                </View>

                {/* Feet */}
                <View style={styles.footRow}>
                    <View style={styles.foot} />
                    <View style={styles.foot} />
                </View>
            </Animated.View>

            {/* Ground shadow */}
            <View style={styles.shadow} />
        </View>
    );
}

// ── Palette ───────────────────────────────────────────────────────────────────
const SKIN = '#FFDAB0';
const HAIR = '#3B2A1A';
const SHIRT = '#6C63FF';
const PANTS = '#2A2A5A';
const SHOE = '#222';
const LIP_DARK = '#9B3A35';  // dark lip colour
const LIP_TOP = 'rgba(255,180,170,0.5)'; // highlight

const styles = StyleSheet.create({
    wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    stars: { position: 'absolute', top: '8%', fontSize: 28, zIndex: 10 },

    body: { alignItems: 'center' },

    // Head
    head: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: SKIN,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        borderTopWidth: 16,
        borderTopColor: HAIR,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },

    // Eyebrows
    eyebrowRow: { flexDirection: 'row', gap: 22, marginBottom: 4, marginTop: -10 },
    eyebrow: { width: 22, height: 5, borderRadius: 3, backgroundColor: HAIR },

    // Eyes
    eyeRow: { flexDirection: 'row', gap: 18, marginBottom: 2 },
    eyeOuter: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'flex-end',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    eyeInner: {
        width: 14,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        backgroundColor: '#1a1a2e',
    },

    // Cheeks
    cheekRow: {
        position: 'absolute',
        flexDirection: 'row',
        gap: 64,
        bottom: 22,
    },
    cheek: { width: 22, height: 13, borderRadius: 10 },

    // Mouth area
    mouthOuter: {
        marginTop: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 30,
    },
    mouthBase: {
        backgroundColor: LIP_DARK,
        overflow: 'hidden',
        alignItems: 'center',
        minHeight: 3,
        minWidth: 16,
    },
    upperLip: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: 4,
        backgroundColor: LIP_TOP,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    teethStrip: {
        position: 'absolute',
        bottom: 0,
        width: '85%',
        backgroundColor: '#F8F4F0',
        borderRadius: 2,
    },

    // Neck
    neck: { width: 24, height: 12, backgroundColor: SKIN },

    // Torso
    torso: {
        width: 80, height: 90,
        borderRadius: 16,
        backgroundColor: SHIRT,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
        zIndex: 2,
    },
    badge: { fontSize: 28 },
    arm: {
        position: 'absolute',
        width: 20, height: 64,
        borderRadius: 10,
        backgroundColor: SHIRT,
        top: 4,
    },
    armLeft: { left: -20, transform: [{ rotate: '8deg' }] },
    armRight: { right: -20, transform: [{ rotate: '-8deg' }] },

    // Legs
    legRow: { flexDirection: 'row', gap: 8, marginTop: -4, zIndex: 1 },
    leg: { width: 26, height: 56, borderRadius: 8, backgroundColor: PANTS },

    // Feet
    footRow: { flexDirection: 'row', gap: 10 },
    foot: { width: 34, height: 16, borderRadius: 8, backgroundColor: SHOE },

    // Shadow
    shadow: {
        marginTop: 4,
        width: 80, height: 12,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
});