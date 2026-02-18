import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const EMOJIS = ['⭐', '🎉', '✨', '🌟', '💫', '🎊', '🏆', '🎈'];
const PARTICLE_COUNT = 20;

interface Particle {
    x: Animated.Value;
    y: Animated.Value;
    opacity: Animated.Value;
    rotate: Animated.Value;
    emoji: string;
    startX: number;
}

interface ConfettiOverlayProps {
    visible: boolean;
    onComplete?: () => void;
}

export function ConfettiOverlay({ visible, onComplete }: ConfettiOverlayProps) {
    const particles = useRef<Particle[]>(
        Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            opacity: new Animated.Value(0),
            rotate: new Animated.Value(0),
            emoji: EMOJIS[i % EMOJIS.length],
            startX: (Math.random() * width * 0.8) + width * 0.1,
        }))
    ).current;

    useEffect(() => {
        if (!visible) return;

        // Reset all particles
        particles.forEach(p => {
            p.x.setValue(p.startX);
            p.y.setValue(-50);
            p.opacity.setValue(1);
            p.rotate.setValue(0);
        });

        // Animate all particles falling
        const animations = particles.map((p, i) =>
            Animated.sequence([
                Animated.delay(i * 80),
                Animated.parallel([
                    Animated.timing(p.y, {
                        toValue: height + 100,
                        duration: 2000 + Math.random() * 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.x, {
                        toValue: p.startX + (Math.random() - 0.5) * 150,
                        duration: 2000 + Math.random() * 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.rotate, {
                        toValue: (Math.random() > 0.5 ? 1 : -1) * 3,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(p.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
                        Animated.delay(1500),
                        Animated.timing(p.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
                    ]),
                ]),
            ])
        );

        Animated.parallel(animations).start(() => {
            onComplete?.();
        });
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.map((p, i) => {
                const rotate = p.rotate.interpolate({
                    inputRange: [-3, 0, 3],
                    outputRange: ['-270deg', '0deg', '270deg'],
                });
                return (
                    <Animated.Text
                        key={i}
                        style={[
                            styles.particle,
                            {
                                opacity: p.opacity,
                                transform: [
                                    { translateX: p.x },
                                    { translateY: p.y },
                                    { rotate },
                                ],
                            },
                        ]}
                    >
                        {p.emoji}
                    </Animated.Text>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        pointerEvents: 'none',
    },
    particle: {
        position: 'absolute',
        fontSize: 28,
        top: 0,
        left: 0,
    },
});
