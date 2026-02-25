/**
 * Pet3D.tsx
 * 3D animated pet companion that replaces the emoji in PetCompanion.
 * Maps pet evolution stages to GLB models and drives emotion animations.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { PetEmotion } from '../services/petService';
import { ModelViewer3D, ModelViewer3DRef } from './ModelViewer3D';

// ── Stage → model mapping ─────────────────────────────────────────────────────
// Stages 0-2: baby bird, Stages 3-4: phoenix, Stage 5: legendary dragon
const PET_MODEL_BY_STAGE: Record<number, number> = {
    0: require('../assets/models/bird_orange.glb'),
    1: require('../assets/models/bird_orange.glb'),
    2: require('../assets/models/bird_orange.glb'),
    3: require('../assets/models/phoenix_bird.glb'),
    4: require('../assets/models/phoenix_bird.glb'),
    5: require('../assets/models/tarisland_-_dragon_high_poly.glb'),
};

interface Props {
    petStage: number;     // 0-5
    emotion: PetEmotion;
    size?: number;        // rendered square size in px
    autoRotate?: boolean;
}

export function Pet3D({ petStage, emotion, size = 88, autoRotate = false }: Props) {
    const modelRef = useRef<ModelViewer3DRef>(null);
    const containerScale = useRef(new Animated.Value(1)).current;
    const containerY = useRef(new Animated.Value(0)).current;
    const containerX = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(0.5)).current;

    const modelAsset = PET_MODEL_BY_STAGE[petStage] ?? PET_MODEL_BY_STAGE[0];

    // ── Idle glow pulse ───────────────────────────────────────────────────────
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowOpacity, { toValue: 0.9, duration: 1500, useNativeDriver: true }),
                Animated.timing(glowOpacity, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // ── Emotion → animation ───────────────────────────────────────────────────
    useEffect(() => {
        containerScale.setValue(1);
        containerY.setValue(0);
        containerX.setValue(0);

        switch (emotion) {
            case 'happy':
                Animated.sequence([
                    Animated.spring(containerScale, { toValue: 1.35, friction: 4, tension: 220, useNativeDriver: true }),
                    Animated.spring(containerScale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
                ]).start();
                modelRef.current?.pulseScale(1.25, 200);
                break;

            case 'excited':
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(containerY, { toValue: -12, duration: 160, useNativeDriver: true }),
                        Animated.timing(containerY, { toValue: 0, duration: 160, useNativeDriver: true }),
                        Animated.timing(containerY, { toValue: -8, duration: 160, useNativeDriver: true }),
                        Animated.timing(containerY, { toValue: 0, duration: 160, useNativeDriver: true }),
                    ]),
                    { iterations: 5 }
                ).start(() => containerY.setValue(0));
                modelRef.current?.pulseScale(1.2, 180);
                break;

            case 'victory':
                Animated.sequence([
                    Animated.parallel([
                        Animated.spring(containerScale, { toValue: 1.5, friction: 3, tension: 250, useNativeDriver: true }),
                        Animated.timing(containerY, { toValue: -24, duration: 300, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.spring(containerScale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
                        Animated.timing(containerY, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ]),
                ]).start();
                modelRef.current?.pulseScale(1.4, 300);
                break;

            case 'sad':
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(containerY, { toValue: 8, duration: 500, useNativeDriver: true }),
                        Animated.timing(containerY, { toValue: 0, duration: 500, useNativeDriver: true }),
                    ]),
                    { iterations: 4 }
                ).start(() => containerY.setValue(0));
                break;

            case 'wave':
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(containerX, { toValue: -10, duration: 100, useNativeDriver: true }),
                        Animated.timing(containerX, { toValue: 10, duration: 100, useNativeDriver: true }),
                        Animated.timing(containerX, { toValue: -10, duration: 100, useNativeDriver: true }),
                        Animated.timing(containerX, { toValue: 10, duration: 100, useNativeDriver: true }),
                        Animated.timing(containerX, { toValue: 0, duration: 100, useNativeDriver: true }),
                    ]),
                    { iterations: 4 }
                ).start(() => containerX.setValue(0));
                break;

            case 'listening':
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(containerX, { toValue: -5, duration: 300, useNativeDriver: true }),
                        Animated.timing(containerX, { toValue: 5, duration: 300, useNativeDriver: true }),
                    ]),
                    { iterations: 5 }
                ).start(() => containerX.setValue(0));
                break;

            default:
                // idle — natural floating bob from autoRotate in ModelViewer3D
                break;
        }
    }, [emotion]);

    // Glow color by stage
    const glowColors: Record<number, string> = {
        0: 'rgba(255,200,100,0.3)',
        1: 'rgba(255,200,100,0.3)',
        2: 'rgba(255,200,100,0.35)',
        3: 'rgba(100,200,255,0.4)',
        4: 'rgba(255,100,200,0.4)',
        5: 'rgba(200,100,255,0.6)',
    };
    const glowColor = glowColors[petStage] ?? glowColors[0];

    return (
        <Animated.View style={[
            styles.wrapper,
            {
                width: size,
                height: size,
                transform: [
                    { scale: containerScale },
                    { translateY: containerY },
                    { translateX: containerX },
                ],
            },
        ]}>
            {/* Aura glow */}
            <Animated.View style={[
                styles.glow,
                {
                    width: size * 1.1,
                    height: size * 1.1,
                    borderRadius: size,
                    backgroundColor: glowColor,
                    opacity: glowOpacity,
                },
            ]} />

            <ModelViewer3D
                ref={modelRef}
                modelAsset={modelAsset}
                width={size}
                height={size}
                autoRotate={autoRotate}
                rotationSpeed={0.012}
                cameraZ={2.5}
                lightIntensity={2.8}
                backgroundColor="transparent"
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    glow: {
        position: 'absolute',
    },
});
