/**
 * PetCompanion.tsx — 3D pet companion powered by Pet3D
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { playSound } from '../services/audioService';
import {
    PET_STAGES,
    PetEmotion,
    getPetName,
    getPetStage,
    getStarsToNextEvolution,
} from '../services/petService';
import { Pet3D } from './Pet3D';

interface PetCompanionProps {
    totalStars: number;
    profileId: string;
    emotion: PetEmotion;
    size?: 'normal' | 'small';
}

export function PetCompanion({ totalStars, profileId, emotion, size = 'normal' }: PetCompanionProps) {
    const [petName, setPetName] = useState('Buddy');
    const [showModal, setShowModal] = useState(false);
    const glowOpacity = useRef(new Animated.Value(0.4)).current;
    const cardScale = useRef(new Animated.Value(1)).current;

    const petStage = getPetStage(totalStars);
    const starsToNext = getStarsToNextEvolution(totalStars);

    useEffect(() => {
        (async () => {
            const name = await getPetName(profileId);
            setPetName(name);
        })();
    }, [profileId]);

    // Idle glow pulse
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowOpacity, { toValue: 0.95, duration: 1600, useNativeDriver: true }),
                Animated.timing(glowOpacity, { toValue: 0.3, duration: 1600, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // Pulse card and play sound on emotion trigger
    useEffect(() => {
        if (emotion !== 'idle') {
            Animated.sequence([
                Animated.spring(cardScale, { toValue: 1.03, friction: 5, tension: 200, useNativeDriver: true }),
                Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
            ]).start();

            // Play sound based on emotion
            if (emotion === 'happy' || emotion === 'excited' || emotion === 'victory') {
                playSound('PET_HAPPY');
            } else if (emotion === 'sad') {
                playSound('PET_SAD');
            }
        }
    }, [emotion]);

    // ── Small variant (corner of Adventure Map) ───────────────────────────────
    if (size === 'small') {
        return (
            <Pet3D
                petStage={petStage.stage}
                emotion={emotion}
                size={64}
                autoRotate={true}
            />
        );
    }

    // ── Normal variant (full card) ─────────────────────────────────────────────
    return (
        <>
            <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.88}>
                <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                    <LinearGradient
                        colors={['rgba(255,224,102,0.12)', 'rgba(255,100,200,0.08)', 'rgba(100,200,255,0.08)']}
                        style={styles.petCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {/* Glow ring */}
                        <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />

                        {/* 3D Pet */}
                        <Pet3D
                            petStage={petStage.stage}
                            emotion={emotion}
                            size={100}
                            autoRotate={emotion === 'idle'}
                        />

                        {/* Info */}
                        <View style={styles.petInfo}>
                            <Text style={styles.petName}>{petName}</Text>
                            <Text style={styles.petStageName}>
                                {petStage.stage === 5 ? '✨ ' : ''}{petStage.name}
                            </Text>
                            <Text style={styles.petDesc} numberOfLines={2}>
                                {petStage.description}
                            </Text>
                            {starsToNext > 0 ? (
                                <Text style={styles.evolutionHint}>
                                    ⭐ {starsToNext} more to evolve!
                                </Text>
                            ) : (
                                <Text style={styles.maxLevel}>✨ LEGENDARY MAX LEVEL!</Text>
                            )}
                        </View>

                        <Text style={styles.tapHint}>Tap to see evolution →</Text>
                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>

            {/* Evolution Roadmap Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <LinearGradient
                        colors={['#1a1a2e', '#16213e', '#0f3460']}
                        style={styles.modalCard}
                    >
                        <Text style={styles.modalTitle}>🐾 Evolution Journey</Text>
                        <Text style={styles.modalSub}>Keep practicing to evolve your companion!</Text>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
                            {PET_STAGES.map((stage, i) => {
                                const isUnlocked = totalStars >= stage.minStars;
                                const isCurrent = getPetStage(totalStars).stage === stage.stage;
                                return (
                                    <View key={i} style={[
                                        styles.stageRow,
                                        isCurrent && styles.stageRowCurrent,
                                        !isUnlocked && styles.stageRowLocked,
                                    ]}>
                                        {/* Mini 3D model or locked emoji */}
                                        {isUnlocked ? (
                                            <Pet3D
                                                petStage={stage.stage}
                                                emotion="idle"
                                                size={52}
                                                autoRotate={isCurrent}
                                            />
                                        ) : (
                                            <Text style={styles.stageRowEmoji}>🔒</Text>
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.stageRowName, !isUnlocked && styles.lockedText]}>
                                                {stage.name}
                                                {isCurrent ? ' ← YOU' : ''}
                                            </Text>
                                            <Text style={[styles.stageRowDesc, !isUnlocked && styles.lockedText]}>
                                                {isUnlocked ? stage.description : `Unlock at ${stage.minStars} ⭐`}
                                            </Text>
                                        </View>
                                        {isUnlocked && <Text style={styles.checkmark}>✅</Text>}
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity style={styles.modalClose} onPress={() => setShowModal(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    petCard: {
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,224,102,0.3)',
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#FFE066',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    glowRing: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        borderColor: '#FFE066',
        left: 6,
    },
    petInfo: { flex: 1, gap: 3 },
    petName: { fontSize: 20, fontWeight: '900', color: '#FFE066' },
    petStageName: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
    petDesc: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 16 },
    evolutionHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    maxLevel: { fontSize: 12, color: '#FFE066', fontWeight: '800', marginTop: 4 },
    tapHint: {
        position: 'absolute',
        bottom: 8,
        right: 12,
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        maxHeight: '85%',
    },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center' },
    modalSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 4 },
    stageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    stageRowCurrent: {
        borderColor: '#FFE066',
        backgroundColor: 'rgba(255,224,102,0.1)',
    },
    stageRowLocked: { opacity: 0.45 },
    stageRowEmoji: { fontSize: 32, width: 52, textAlign: 'center' },
    stageRowName: { fontSize: 14, fontWeight: '800', color: '#fff' },
    stageRowDesc: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    lockedText: { color: 'rgba(255,255,255,0.3)' },
    checkmark: { fontSize: 18 },
    modalClose: {
        marginTop: 16,
        backgroundColor: '#FFE066',
        borderRadius: 50,
        paddingVertical: 14,
        alignItems: 'center',
    },
    modalCloseText: { fontSize: 16, fontWeight: '900', color: '#1a1a2e' },
});
