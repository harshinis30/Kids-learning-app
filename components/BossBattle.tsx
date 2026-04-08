import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Audio } from 'expo-av';
import { CurriculumItem } from '../data/curriculum';
import { playSound } from '../services/audioService';
import { Boss3D, Boss3DRef, BossPhase } from './Boss3D';
import { ConfettiOverlay } from './ConfettiOverlay';
import { RecordButton } from './RecordButton';
import { getPronunciationScore, PronunciationResult, computeStars } from '../services/scoringService';
import { ttsService } from '../services/textToSpeech';
import { problemTracker } from '../services/problemTracker';
import { FeedbackDisplay } from './FeedbackDisplay';

export interface BossDefeatRecord {
    bossId: string;
    defeatedAt: string;
    starsUsed: number;
}

interface BossInfo {
    name: string;
    gradientColors: [string, string];
    bossId: string;
    glowColor: string;
}

const BOSS_BY_STAGE: Record<number, BossInfo> = {
    1: { name: 'The Lava Goblin', gradientColors: ['#7f1d1d', '#b45309'], bossId: 'lava_goblin', glowColor: '#FF6B35' },
    2: { name: 'The Deep Sea Shark', gradientColors: ['#0c1445', '#0e7490'], bossId: 'sea_shark', glowColor: '#00D4FF' },
    3: { name: 'The One-Eyed Beast', gradientColors: ['#14532d', '#1e3a2f'], bossId: 'eyebeast', glowColor: '#4ADE80' },
    4: { name: 'The Space Overlord', gradientColors: ['#0f0623', '#3b0764'], bossId: 'space_overlord', glowColor: '#C084FC' },
};

interface Props {
    visible: boolean;
    bossWord: CurriculumItem | null;
    stage: number;
    profileId: string;
    onAttempt: (stars: number) => void;
    onComplete: (result: 'victory' | 'escaped', bonusStars: number) => void;
}

export function BossBattle({ visible, bossWord, stage, profileId, onAttempt, onComplete }: Props) {
    const boss = BOSS_BY_STAGE[stage] ?? BOSS_BY_STAGE[1];

    const [healthSegments, setHealthSegments] = useState([true, true, true]);
    const [attempts, setAttempts] = useState(0);
    const [maxAttempts, setMaxAttempts] = useState(3);
    const [phase, setPhase] = useState<'battle' | 'victory' | 'escaped'>('battle');
    const [bossPhase, setBossPhase] = useState<BossPhase>('entering');
    const [statusText, setStatusText] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const [waitingForAttempt, setWaitingForAttempt] = useState(true);
    const [bossLoaded, setBossLoaded] = useState(false);

    // New phase config
    const [demoPhase, setDemoPhase] = useState<'watch' | 'your_turn'>('watch');
    const [activeSyllableIdx, setActiveSyllableIdx] = useState(-1);

    // Audio states
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [meteringLevel, setMeteringLevel] = useState<number | undefined>();
    const [lastAudioUri, setLastAudioUri] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<PronunciationResult | null>(null);
    const [sillyVoiceEnabled, setSillyVoiceEnabled] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);

    const boss3DRef = useRef<Boss3DRef>(null);
    const bossLoadedRef = useRef(false);

    // Animations
    const healthBarAnims = [
        useRef(new Animated.Value(1)).current,
        useRef(new Animated.Value(1)).current,
        useRef(new Animated.Value(1)).current,
    ];
    const titleScale = useRef(new Animated.Value(0)).current;
    const starsAnim = useRef(new Animated.Value(0)).current;
    const statusOpacity = useRef(new Animated.Value(0)).current;
    const wordCardScale = useRef(new Animated.Value(0.8)).current;
    const wordCardOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && bossWord) {
            problemTracker.getProblemAreas(profileId).then(problems => {
                const isTricky = problems.some(p => bossWord.targetPhonemes.includes(p.phoneme));
                setMaxAttempts(isTricky ? 4 : 3);
            });

            setHealthSegments([true, true, true]);
            setAttempts(0);
            setPhase('battle');
            setDemoPhase('watch');
            setBossPhase('entering');
            setStatusText('');
            setShowConfetti(false);
            setWaitingForAttempt(true);
            setBossLoaded(false);
            setLastAudioUri(null);
            setLastResult(null);
            bossLoadedRef.current = false;
            
            healthBarAnims.forEach(a => a.setValue(1));
            titleScale.setValue(0);
            starsAnim.setValue(0);
            statusOpacity.setValue(0);
            wordCardScale.setValue(0.8);
            wordCardOpacity.setValue(0);

            Animated.spring(titleScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
            Animated.loop(
                Animated.sequence([
                    Animated.timing(starsAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                    Animated.timing(starsAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            ).start();
        }
        return () => {
            if (soundRef.current) soundRef.current.unloadAsync();
        };
    }, [visible, bossWord]);

    const handleBossLoaded = () => {
        bossLoadedRef.current = true;
        setBossLoaded(true);
        setBossPhase('idle');
        Animated.parallel([
            Animated.spring(wordCardScale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
            Animated.timing(wordCardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start(() => {
            runWatchMePhase();
        });
    };

    const runWatchMePhase = async () => {
        if (!bossWord) return;
        setDemoPhase('watch');
        setWaitingForAttempt(false);
        
        await ttsService.speak("Watch me!", { rate: 0.7 });
        
        await ttsService.speakSyllableByWord(
            bossWord.displayText,
            (idx) => setActiveSyllableIdx(idx),
            { rate: 0.6 }
        );
        
        setActiveSyllableIdx(-1);
        await ttsService.speak("Now your turn!", { rate: 0.8 });
        
        setDemoPhase('your_turn');
        setWaitingForAttempt(true);
    };

    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording: rec } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
                (status) => {
                    if (status.metering !== undefined) {
                        setMeteringLevel(status.metering);
                    }
                },
                100
            );
            setRecording(rec);
            setIsRecording(true);
            setLastResult(null);
        } catch (err) {
            console.error(err);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        try {
            setIsRecording(false);
            setIsProcessing(true);
            setWaitingForAttempt(false);
            
            await recording.stopAndUnloadAsync();
            // Reset audio mode so sound effects can play
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
            const uri = recording.getURI();
            setLastAudioUri(uri);
            setRecording(null);
            
            if (uri && bossWord) {
                const result = await getPronunciationScore(bossWord.displayText, uri);
                handleRecordingResult(result);
            } else {
                setIsProcessing(false);
                setWaitingForAttempt(true);
            }
        } catch (err) {
            console.error(err);
            setIsProcessing(false);
            setWaitingForAttempt(true);
        }
    };

    const toggleRecord = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    const playHearYourself = async () => {
        if (!lastAudioUri || isPlaying) return;
        setIsPlaying(true);
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: lastAudioUri },
                { 
                    shouldPlay: true, 
                    rate: sillyVoiceEnabled ? 1.5 : 1.0, 
                    shouldCorrectPitch: !sillyVoiceEnabled 
                }
            );
            soundRef.current = sound;
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                    sound.unloadAsync();
                    ttsService.speak(bossWord?.displayText || '', { rate: 0.65 });
                }
            });
        } catch (e) {
            setIsPlaying(false);
        }
    };

    const handleRecordingResult = (result: PronunciationResult | null) => {
        setIsProcessing(false);
        if (!result) {
            showStatus('⚠️ Uh oh, could not hear you! Try again.');
            setWaitingForAttempt(true);
            return;
        }

        setLastResult(result);
        const stars = computeStars(result, stage);
        onAttempt(stars);

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (stars === 3) {
            setBossPhase('defeat');
            boss3DRef.current?.triggerDefeat();
            setHealthSegments([false, false, false]);
            healthBarAnims.forEach((a, i) => setTimeout(() => drainHealthSegment(i), i * 200));
            setPhase('victory');
            setShowConfetti(true);
            playSound('BOSS_DEFEAT');
            if (bossWord) ttsService.celebrateSuccessForPhoneme(bossWord.targetPhonemes);
            
            setTimeout(async () => {
                const key = `@boss_defeats_${profileId}`;
                const raw = await AsyncStorage.getItem(key);
                const records: BossDefeatRecord[] = raw ? JSON.parse(raw) : [];
                records.push({ bossId: boss.bossId, defeatedAt: new Date().toISOString(), starsUsed: 3 });
                await AsyncStorage.setItem(key, JSON.stringify(records));
                onComplete('victory', 10);
            }, 3500);

        } else if (stars === 2) {
            setBossPhase('hit');
            boss3DRef.current?.triggerHit();
            playSound('BOSS_HIT');
            const aliveIdx = healthSegments.lastIndexOf(true);
            if (aliveIdx >= 0) {
                drainHealthSegment(aliveIdx);
                const updated = [...healthSegments];
                updated[aliveIdx] = false;
                setHealthSegments(updated);
            }
            showStatus('⚡ HIT! Great job!');
            if (newAttempts >= maxAttempts) {
                setTimeout(() => triggerEscape(), 1800);
            } else {
                setTimeout(() => {
                    setBossPhase('idle');
                    setWaitingForAttempt(true);
                }, 1800);
            }

        } else {
            boss3DRef.current?.triggerHit(); 
            playSound('BOSS_HIT'); 
            showStatus('🛡️ Blocked! Keep trying!');
            if (newAttempts >= maxAttempts) {
                setTimeout(() => triggerEscape(), 1800);
            } else {
                setTimeout(() => {
                    setBossPhase('idle');
                    setWaitingForAttempt(true);
                }, 1800);
            }
        }
    };

    const drainHealthSegment = (index: number) => {
        Animated.sequence([
            Animated.timing(healthBarAnims[index], { toValue: 0.3, duration: 300, useNativeDriver: false }),
            Animated.timing(healthBarAnims[index], { toValue: 0, duration: 400, useNativeDriver: false }),
        ]).start();
    };

    const showStatus = (text: string) => {
        setStatusText(text);
        statusOpacity.setValue(0);
        Animated.sequence([
            Animated.timing(statusOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.delay(1200),
            Animated.timing(statusOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setStatusText(''));
    };

    const triggerEscape = () => {
        setPhase('escaped');
        setBossPhase('escaped');
        boss3DRef.current?.triggerEscape();
        playSound('BOSS_ESCAPE');
        showStatus('💨 The boss fled... for now!');
        setTimeout(() => onComplete('escaped', 3), 2500);
    };

    const renderWordSyllables = () => {
        if (!bossWord) return null;
        const parts = bossWord.displayText.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi) || [bossWord.displayText];
        return (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {parts.map((p, i) => (
                    <Text 
                        key={i} 
                        style={[
                            styles.wordText, 
                            activeSyllableIdx === i && { color: '#4ADE80', transform: [{scale: 1.1}] }
                        ]}
                    >
                        {p}
                    </Text>
                ))}
            </View>
        );
    };

    if (!visible || !bossWord) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <LinearGradient colors={boss.gradientColors} style={styles.overlay}>

                {/* Bg stars */}
                <Animated.Text style={[styles.bgStars, { opacity: starsAnim }]}>
                    ✨ 🌟 ⭐ 💫 ✨ 🌟 ⭐ 💫 ✨ 🌟 ⭐ 💫
                </Animated.Text>

                {/* Boss name glow aura */}
                <View style={[styles.bossAura, { shadowColor: boss.glowColor }]} />

                {/* Title */}
                <Animated.View style={[styles.titleContainer, { transform: [{ scale: titleScale }] }]}>
                    <Text style={styles.battleTitle}>⚔️ BOSS BATTLE!</Text>
                    <Text style={styles.battleSub}>Say the magic word to defeat {boss.name}!</Text>
                </Animated.View>

                {/* 3D Boss */}
                <View style={styles.bossContainer}>
                    <Boss3D
                        ref={boss3DRef}
                        stage={stage}
                        phase={bossPhase}
                        width={220}
                        height={220}
                        onLoaded={handleBossLoaded}
                    />
                    {!bossLoaded && (
                        <View style={styles.loadingOverlay}>
                            <Text style={styles.loadingText}>⚡ Summoning boss...</Text>
                        </View>
                    )}
                </View>

                {/* Boss name */}
                <Text style={[styles.bossName, { color: boss.glowColor }]}>{boss.name}</Text>

                {/* Health bar */}
                <View style={styles.healthContainer}>
                    <Text style={styles.healthLabel}>❤️ Boss Health</Text>
                    <View style={styles.healthBar}>
                        {healthSegments.map((alive, i) => (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.healthSegment,
                                    { opacity: healthBarAnims[i] },
                                    !alive && styles.healthSegmentDead,
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* Word card */}
                <Animated.View style={[
                    styles.wordCard,
                    { borderColor: boss.glowColor + '66' },
                    { transform: [{ scale: wordCardScale }], opacity: wordCardOpacity },
                ]}>
                    <Text style={styles.wordLabel}>
                        {demoPhase === 'watch' ? '👀 Watch and listen!' : 'Say the magic word:'}
                    </Text>
                    {renderWordSyllables()}
                    <Text style={styles.wordPhonemes}>{bossWord.phonemes}</Text>
                </Animated.View>

                {/* Feedback Display */}
                {lastResult && demoPhase === 'your_turn' && phase === 'battle' && (
                    <View style={{ transform: [{ scale: 0.85 }], marginTop: -15, zIndex: 10 }}>
                        <FeedbackDisplay 
                            isCorrect={computeStars(lastResult, stage) >= 2}
                            accuracy={lastResult.compositeScore}
                            message={computeStars(lastResult, stage) >= 2 ? "Great job!" : "Keep practicing!"}
                            phonemes={lastResult.phonemes}
                            fluency={lastResult.fluencyScore}
                            completeness={lastResult.completenessScore}
                            prosody={lastResult.prosodyScore}
                            visible={true}
                        />
                    </View>
                )}

                {/* Status bubble */}
                {statusText !== '' && (
                    <Animated.View style={[styles.statusBox, { opacity: statusOpacity }]}>
                        <Text style={styles.statusText}>{statusText}</Text>
                    </Animated.View>
                )}

                {/* Speak button and playback */}
                {phase === 'battle' && demoPhase === 'your_turn' && bossLoaded && (
                    <View style={styles.recordingSection}>
                        {(waitingForAttempt || isRecording || isProcessing) && (
                            <RecordButton 
                                onPress={toggleRecord}
                                isRecording={isRecording}
                                isProcessing={isProcessing}
                                disabled={!waitingForAttempt && !isRecording && !isProcessing}
                                meteringLevel={meteringLevel}
                            />
                        )}
                        
                        {/* Hear Yourself */}
                        {lastAudioUri && waitingForAttempt && !isRecording && (
                            <View style={styles.playbackRow}>
                                <TouchableOpacity 
                                    style={styles.playbackBtn} 
                                    onPress={playHearYourself}
                                    disabled={isPlaying}
                                >
                                    <Text style={styles.playbackText}>🔊 Hear {isPlaying ? '...' : 'Yourself'}</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.sillyToggle, sillyVoiceEnabled && styles.sillyToggleActive]}
                                    onPress={() => setSillyVoiceEnabled(!sillyVoiceEnabled)}
                                >
                                    <Text style={styles.sillyText}>{sillyVoiceEnabled ? '🐿️ Silly On' : '🎤 Normal'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Victory result */}
                {phase === 'victory' && (
                    <View style={styles.victoryBox}>
                        <Text style={styles.victoryTitle}>🏆 VICTORY!</Text>
                        <Text style={styles.victoryText}>💎 LEGENDARY CRYSTAL EARNED!</Text>
                        <Text style={styles.victoryBonus}>+10 Bonus Stars!</Text>
                    </View>
                )}

                {/* Escaped result */}
                {phase === 'escaped' && (
                    <View style={styles.escapedBox}>
                        <Text style={styles.escapedTitle}>💨 The Boss Fled!</Text>
                        <Text style={styles.escapedText}>Next time you'll get them!</Text>
                        <Text style={styles.escapedBonus}>+3 Consolation Stars</Text>
                    </View>
                )}

                {/* Attempt counter */}
                {phase === 'battle' && (
                    <Text style={styles.attemptCounter}>Attempts: {attempts} / {maxAttempts}</Text>
                )}

                <ConfettiOverlay visible={showConfetti} onComplete={() => setShowConfetti(false)} />
            </LinearGradient>
        </Modal>
    );
}

export function useBossBattleRef() {
    const handlerRef = useRef<((stars: number) => void) | null>(null);
    return handlerRef;
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 12,
    },
    bgStars: {
        position: 'absolute',
        top: 40,
        fontSize: 14,
        color: 'rgba(255,255,255,0.25)',
        textAlign: 'center',
        width: '100%',
    },
    bossAura: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 60,
        elevation: 20,
    },
    titleContainer: { alignItems: 'center', gap: 4 },
    battleTitle: {
        fontSize: 34,
        fontWeight: '900',
        color: '#FFE066',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
        letterSpacing: 2,
    },
    battleSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        fontWeight: '600',
    },
    bossContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 220,
        height: 220,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 16,
    },
    loadingText: {
        color: '#FFE066',
        fontSize: 16,
        fontWeight: '700',
    },
    bossName: {
        fontSize: 18,
        fontWeight: '900',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
        marginTop: -8,
    },
    healthContainer: { width: '100%', gap: 6, alignItems: 'center' },
    healthLabel: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.8)' },
    healthBar: { flexDirection: 'row', gap: 6, width: '80%' },
    healthSegment: {
        flex: 1,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 4,
    },
    healthSegmentDead: { backgroundColor: 'rgba(100,100,100,0.3)', shadowOpacity: 0 },
    wordCard: {
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 20,
        padding: 18,
        alignItems: 'center',
        width: '100%',
        gap: 6,
        borderWidth: 2,
    },
    wordLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
    wordText: { fontSize: 44, fontWeight: '900', color: '#FFE066', letterSpacing: 2 },
    wordPhonemes: { fontSize: 15, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' },
    statusBox: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 14,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    statusText: { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
    recordingSection: { alignItems: 'center', gap: 12 },
    playbackRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    playbackBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    playbackText: { color: '#fff', fontWeight: '800' },
    sillyToggle: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    sillyToggleActive: { backgroundColor: '#C084FC' },
    sillyText: { color: '#fff', fontWeight: '700' },
    victoryBox: { alignItems: 'center', gap: 4 },
    victoryTitle: { fontSize: 32, fontWeight: '900', color: '#FFE066' },
    victoryText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    victoryBonus: { fontSize: 15, color: '#4ADE80', fontWeight: '800' },
    escapedBox: { alignItems: 'center', gap: 4 },
    escapedTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
    escapedText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
    escapedBonus: { fontSize: 14, color: '#4ADE80', fontWeight: '800' },
    attemptCounter: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
});
