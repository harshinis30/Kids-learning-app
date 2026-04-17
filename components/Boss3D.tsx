/**
 * Boss3D.tsx
 * Animated 3D boss renderer for BossBattle screen.
 * Maps each stage to a GLB model and provides dramatic battle animations.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { ModelViewer3D, ModelViewer3DRef } from './ModelViewer3D';

// ── Model mapping per stage ───────────────────────────────────────────────────
const BOSS_MODELS: Record<number, number> = {
    1: require('../assets/models/gobelin_monster.glb'),
    2: require('../assets/models/cartoon_shark_animated.glb'),
    3: require('../assets/models/one-eyed_monster_with_animations.glb'),
    4: require('../assets/models/alien_fish_animated.glb'),
};

export type BossPhase = 'entering' | 'idle' | 'hit' | 'defeat' | 'escaped';

export interface Boss3DRef {
    triggerHit: () => void;
    triggerDefeat: () => void;
    triggerEscape: () => void;
}

interface Props {
    stage: number;
    phase: BossPhase;
    width?: number;
    height?: number;
    onLoaded?: () => void;
}

// ── Particle burst on hit ─────────────────────────────────────────────────────
function HitParticles({ trigger }: { trigger: number }) {
    const particles = Array.from({ length: 10 }, (_, i) => ({
        angle: (i / 10) * Math.PI * 2,
        distance: 40 + Math.random() * 40,
        anim: useRef(new Animated.ValueXY({ x: 0, y: 0 })).current,
        opacity: useRef(new Animated.Value(0)).current,
        scale: useRef(new Animated.Value(0)).current,
    }));

    useEffect(() => {
        if (trigger === 0) return;
        particles.forEach((p) => {
            p.anim.setValue({ x: 0, y: 0 });
            p.opacity.setValue(1);
            p.scale.setValue(1);
            Animated.parallel([
                Animated.timing(p.anim, {
                    toValue: {
                        x: Math.cos(p.angle) * p.distance,
                        y: Math.sin(p.angle) * p.distance,
                    },
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(p.opacity, { toValue: 1, duration: 50, useNativeDriver: true }),
                    Animated.timing(p.opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.spring(p.scale, { toValue: 1.4, friction: 4, tension: 200, useNativeDriver: true }),
                    Animated.timing(p.scale, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]),
            ]).start();
        });
    }, [trigger]);

    const COLORS = ['#FF6B6B', '#FFE066', '#FF8C42', '#FF3CAC', '#fff'];

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.particle,
                        {
                            backgroundColor: COLORS[i % COLORS.length],
                            opacity: p.opacity,
                            transform: [
                                { translateX: p.anim.x },
                                { translateY: p.anim.y },
                                { scale: p.scale },
                            ],
                        },
                    ]}
                />
            ))}
        </View>
    );
}

// ── Boss3D ────────────────────────────────────────────────────────────────────
export const Boss3D = forwardRef<Boss3DRef, Props>(({
    stage,
    phase,
    width = 240,
    height = 240,
    onLoaded,
}, ref) => {
    const modelRef = useRef<ModelViewer3DRef>(null);
    const entranceAnim = useRef(new Animated.Value(0)).current;
    const containerOpacity = useRef(new Animated.Value(0)).current;
    const [hitTrigger, setHitTrigger] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const modelAsset = BOSS_MODELS[stage] ?? BOSS_MODELS[1];

    // Imperative API
    useImperativeHandle(ref, () => ({
        triggerHit() {
            modelRef.current?.shake();
            modelRef.current?.flashRed();
            modelRef.current?.pulseScale(1.15, 150);
            setHitTrigger(t => t + 1);
        },
        triggerDefeat() {
            modelRef.current?.dissolve(1400);
        },
        triggerEscape() {
            modelRef.current?.dissolve(800);
        },
    }));

    // Entrance animation when loaded
    useEffect(() => {
        if (!loaded) return;
        containerOpacity.setValue(1);
        entranceAnim.setValue(-60);
        Animated.spring(entranceAnim, {
            toValue: 0,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
        }).start();
    }, [loaded]);

    // Phase transitions
    useEffect(() => {
        if (!loaded) return;
        if (phase === 'hit') {
            modelRef.current?.shake();
            modelRef.current?.flashRed();
            setHitTrigger(t => t + 1);
        } else if (phase === 'defeat') {
            modelRef.current?.dissolve(1400);
        } else if (phase === 'escaped') {
            modelRef.current?.dissolve(800);
        }
    }, [phase, loaded]);

    const handleLoaded = () => {
        setLoaded(true);
        onLoaded?.();
    };

    return (
        <Animated.View style={[
            styles.container,
            {
                width,
                height,
                opacity: containerOpacity,
                transform: [{ translateY: entranceAnim }],
            },
        ]}>
            {/* Glow ring behind model */}
            <View style={[styles.glowRing, { width: width * 0.85, height: width * 0.85, borderRadius: width }]} />

            <ModelViewer3D
                ref={modelRef}
                modelAsset={modelAsset}
                width={width}
                height={height}
                autoRotate={false}
                cameraZ={2.8}
                lightIntensity={3}
                backgroundColor="transparent"
                onLoaded={handleLoaded}
            />

            {/* Hit particle burst */}
            <HitParticles trigger={hitTrigger} />
        </Animated.View>
    );
});

Boss3D.displayName = 'Boss3D';

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    glowRing: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 100, 50, 0.12)',
        borderWidth: 2,
        borderColor: 'rgba(255, 150, 50, 0.3)',
    },
    particle: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        top: '50%',
        left: '50%',
        marginTop: -5,
        marginLeft: -5,
    },
});
