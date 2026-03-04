import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BossBattle } from '../../components/BossBattle';
import { ConfettiOverlay } from '../../components/ConfettiOverlay';
import { FeedbackDisplay } from '../../components/FeedbackDisplay';
import { PetCompanion } from '../../components/PetCompanion';
import { RecordButton } from '../../components/RecordButton';
import { Scene3D } from '../../components/Scene3D';
import { SessionSummary } from '../../components/SessionSummary';
import { StarRating } from '../../components/StarRating';
import { CurriculumItem, STAGE_NAMES, STAGE_REQUIRED_STARS, getStageItems } from '../../data/curriculum';
import { playSound } from '../../services/audioService';
import { LipSyncAnimation } from '../../services/lipSyncService';
import { PetEmotion, triggerEmotion } from '../../services/petService';
import { problemTracker } from '../../services/problemTracker';
import { ChildProfile, profileService } from '../../services/profileService';
import { progressTracker } from '../../services/progressTracker';
import { ttsService } from '../../services/textToSpeech';

type LearningState = 'loading' | 'introduce' | 'prompt' | 'listen' | 'recording' | 'analyzing' | 'feedback';

const { width, height } = Dimensions.get('window');
const COLUMN_W = Math.floor((width - 32) / 3); // 3 columns minus padding
const SESSION_LENGTH = 5; // Show summary every 5 items

function computeStars(accuracy: number): number {
    if (accuracy >= 90) return 3;
    if (accuracy >= 70) return 2;
    if (accuracy >= 50) return 1;
    return 0;
}

export default function LearnScreen() {
    const [profile, setProfile] = useState<ChildProfile | null>(null);
    const [items, setItems] = useState<CurriculumItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [learningState, setLearningState] = useState<LearningState>('loading');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [accuracy, setAccuracy] = useState(0);
    const [stars, setStars] = useState(0);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [animationType, setAnimationType] = useState<'idle' | 'speaking' | 'celebrating' | 'encouraging'>('idle');
    const [attemptCount, setAttemptCount] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Session tracking
    const [sessionStars, setSessionStars] = useState(0);
    const [sessionItems, setSessionItems] = useState(0);
    const [sessionBest, setSessionBest] = useState<{ text: string; stars: number } | undefined>();
    const [showSummary, setShowSummary] = useState(false);
    const sessionStartTime = useRef(Date.now());
    const [petEmotion, setPetEmotion] = useState<PetEmotion>('idle');

    // Boss battle
    const [showBoss, setShowBoss] = useState(false);
    const [bossWord, setBossWord] = useState<CurriculumItem | null>(null);
    const wordsCompletedInSession = useRef(0);
    const BOSS_EVERY_N_WORDS = 4;

    // Lip-sync
    const [lipSyncAnimation, setLipSyncAnimation] = useState<LipSyncAnimation | null>(null);
    const [currentAnimationTime, setCurrentAnimationTime] = useState(0);

    // Animations
    const cardScale = useRef(new Animated.Value(0)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const headerFade = useRef(new Animated.Value(0)).current;

    const currentItem = items[currentIndex];

    // ── Load profile & curriculum ──────────────────────────────────────────
    useEffect(() => {
        (async () => {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

            const p = await profileService.getActiveProfile();
            if (!p) return;
            setProfile(p);

            const stageItems = getStageItems(p.ageGroup, p.currentStage as 1 | 2 | 3 | 4);
            // Shuffle items for variety
            const shuffled = [...stageItems].sort(() => Math.random() - 0.5);
            setItems(shuffled);

            Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
            setLearningState('introduce');
        })();
    }, []);

    // ── Start flow when item changes ───────────────────────────────────────
    useEffect(() => {
        if (learningState !== 'loading' && currentItem) {
            startItemFlow();
        }
    }, [currentIndex, items]);

    // ── Card entrance animation ────────────────────────────────────────────
    useEffect(() => {
        if (currentItem) {
            cardScale.setValue(0);
            cardOpacity.setValue(0);
            Animated.parallel([
                Animated.spring(cardScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
                Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
        }
    }, [currentItem]);

    // ── Pulse animation for listen state ──────────────────────────────────
    useEffect(() => {
        if (learningState === 'listen') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [learningState]);

    const lipSyncCallbacks = {
        onAnimationStart: (anim: LipSyncAnimation) => setLipSyncAnimation(anim),
        onAnimationUpdate: (t: number) => setCurrentAnimationTime(t),
        onAnimationEnd: () => { setLipSyncAnimation(null); setCurrentAnimationTime(0); },
    };

    const startItemFlow = async () => {
        if (!currentItem) return;
        setAttemptCount(0);
        setShowHint(false);
        setLearningState('introduce');
        setAnimationType('speaking');

        const introText = currentItem.type === 'sound'
            ? `This sound is "${currentItem.text}". Listen carefully: ${currentItem.text}.`
            : currentItem.type === 'syllable'
                ? `This syllable is "${currentItem.text}". Say it with me: ${currentItem.text}.`
                : `This word is "${currentItem.text}". ${currentItem.text}.`;

        await ttsService.speak(introText, { rate: 0.65, ...lipSyncCallbacks });
        await delay(400);

        setLearningState('prompt');
        const promptText = currentItem.type === 'sound'
            ? `Now you try! Make the "${currentItem.text}" sound.`
            : `Now you try! Say "${currentItem.text}".`;
        await ttsService.speak(promptText, { rate: 0.7, ...lipSyncCallbacks });

        setLearningState('listen');
        setAnimationType('idle');
    };

    const handleRecordPress = async () => {
        if (learningState === 'listen') await startRecording();
        else if (learningState === 'recording') await stopRecording();
    };

    const startRecording = async () => {
        try {
            setLearningState('recording');
            const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(rec);
        } catch (e) {
            console.error('Recording error:', e);
            setLearningState('listen');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        try {
            setLearningState('analyzing');
            await recording.stopAndUnloadAsync();
            setRecording(null);
            await analyzePronunciation();
        } catch (e) {
            console.error('Stop recording error:', e);
            setLearningState('listen');
        }
    };

    const analyzePronunciation = async () => {
        if (!currentItem || !profile) return;
        await delay(1200);

        // Simulated accuracy — in production, replace with real speech recognition
        const base = 60 + Math.random() * 40;
        const attempt = attemptCount + 1;
        setAttemptCount(attempt);

        const simulatedAccuracy = Math.min(100, base + (attempt > 1 ? 5 : 0));
        const earnedStars = computeStars(simulatedAccuracy);

        setAccuracy(simulatedAccuracy);
        setStars(earnedStars);
        setLearningState('feedback');

        // Record to problem tracker
        await problemTracker.recordPhonemeAttempt(profile.id, currentItem.targetPhonemes, simulatedAccuracy);

        // Record to progress tracker
        await progressTracker.recordItemAttempt(profile.id, currentItem.id, simulatedAccuracy, earnedStars);
        await progressTracker.updateStageProgress(profile.id, currentItem.stage, currentItem.id, earnedStars);

        if (earnedStars === 3) {
            setAnimationType('celebrating');
            setPetEmotion('victory');
            setFeedbackMessage('Perfect! Amazing job! 🌟');
            setShowConfetti(true);
            playSound('VICTORY');
            await ttsService.speak('Wonderful! Perfect! You are amazing!', { rate: 0.8, pitch: 1.2, ...lipSyncCallbacks });
        } else if (earnedStars === 2) {
            setAnimationType('celebrating');
            setPetEmotion('happy');
            setFeedbackMessage('Great job! Almost perfect! ⭐⭐');
            await ttsService.speak('Great job! Well done!', { rate: 0.8, ...lipSyncCallbacks });
        } else if (earnedStars === 1) {
            setAnimationType('encouraging');
            setPetEmotion('sad');
            setFeedbackMessage('Good try! Keep practicing! 💪');
            await ttsService.speak('Good try! Let\'s keep going!', { rate: 0.75, ...lipSyncCallbacks });
        } else {
            setAnimationType('encouraging');
            setPetEmotion('sad');
            setFeedbackMessage('Let\'s try again! You can do it! 🎯');
            await ttsService.speak('Let\'s try again. Listen carefully.', { rate: 0.7, ...lipSyncCallbacks });
        }

        if (earnedStars > 0 && earnedStars < 3) {
            playSound('STARS');
        }

        // Update session stats
        const newSessionStars = sessionStars + earnedStars;
        const newSessionItems = sessionItems + 1;
        setSessionStars(newSessionStars);
        setSessionItems(newSessionItems);

        if (!sessionBest || earnedStars > sessionBest.stars) {
            setSessionBest({ text: currentItem.displayText, stars: earnedStars });
        }

        // Add stars to profile and check for stage advancement
        await profileService.addStars(profile.id, earnedStars);

        // ── Stage progression check ────────────────────────────────────────
        const newTotalStars = profile.totalStars + earnedStars;
        const requiredForNext = STAGE_REQUIRED_STARS[profile.currentStage];
        if (
            profile.currentStage < 4 &&
            requiredForNext > 0 &&
            newTotalStars >= requiredForNext
        ) {
            await profileService.advanceStage(profile.id);
        }

        // Re-read the updated profile so stage & stars display correctly
        const updatedProfile = await profileService.getActiveProfile();
        if (updatedProfile) {
            setProfile(updatedProfile);
            // If stage changed, reload the curriculum items for the new stage
            if (updatedProfile.currentStage !== profile.currentStage) {
                const newItems = getStageItems(
                    updatedProfile.ageGroup,
                    updatedProfile.currentStage as 1 | 2 | 3 | 4
                );
                const reshuffled = [...newItems].sort(() => Math.random() - 0.5);
                setItems(reshuffled);
                setCurrentIndex(0);
            }
        }

        await delay(earnedStars >= 2 ? 3000 : 2500);

        // If failed (0 stars) and < 3 attempts, retry
        if (earnedStars === 0 && attempt < 3) {
            setLearningState('listen');
            setAnimationType('idle');
            setAccuracy(0);
            setStars(0);
            setFeedbackMessage('');
            return;
        }

        // Check session summary
        if (newSessionItems % SESSION_LENGTH === 0) {
            setShowSummary(true);
            playSound('VICTORY');
        } else {
            // Count completed word, check boss trigger
            wordsCompletedInSession.current += 1;
            if (wordsCompletedInSession.current % BOSS_EVERY_N_WORDS === 0 && !showBoss) {
                // Pick the hardest word in this stage as boss word
                const hard = items.find(it => it.difficulty === 'hard') ?? items[items.length - 1];
                setBossWord(hard);
                setShowBoss(true);
            } else {
                advanceToNext();
            }
        }
    };

    const advanceToNext = () => {
        setAccuracy(0);
        setStars(0);
        setFeedbackMessage('');
        setAnimationType('idle');
        setPetEmotion('idle');
        setShowConfetti(false);

        if (currentIndex + 1 < items.length) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Loop back with reshuffle
            const reshuffled = [...items].sort(() => Math.random() - 0.5);
            setItems(reshuffled);
            setCurrentIndex(0);
        }
    };

    const handleReplay = async () => {
        if (!currentItem || learningState !== 'listen') return;
        setAnimationType('speaking');
        await ttsService.speak(currentItem.text, { rate: 0.6, ...lipSyncCallbacks });
        setAnimationType('idle');
    };

    const handleHint = async () => {
        if (!currentItem) return;
        setShowHint(true);
        setAnimationType('speaking');
        await ttsService.speak(currentItem.hint, { rate: 0.65, ...lipSyncCallbacks });
        setAnimationType('idle');
    };

    const handleSkip = () => {
        ttsService.stop();
        advanceToNext();
    };

    const handleSummaryContinue = () => {
        setShowSummary(false);
        advanceToNext();
    };

    const handleSummaryBreak = () => {
        setShowSummary(false);
        // Save session
        if (profile) {
            progressTracker.saveSession({
                date: new Date().toISOString(),
                profileId: profile.id,
                itemsAttempted: sessionItems,
                starsEarned: sessionStars,
                stage: profile.currentStage,
                durationSeconds: Math.round((Date.now() - sessionStartTime.current) / 1000),
            });
        }
    };

    if (!profile || !currentItem) {
        return (
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingEmoji}>🌟</Text>
                    <Text style={styles.loadingText}>Getting ready...</Text>
                </View>
            </LinearGradient>
        );
    }

    const stageColor = profile.currentStage === 1 ? '#FF6B6B' :
        profile.currentStage === 2 ? '#4ECDC4' :
            profile.currentStage === 3 ? '#45B7D1' : '#96CEB4';

    return (
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <SafeAreaView style={styles.safeArea}>
                {/* Confetti */}
                <ConfettiOverlay visible={showConfetti} onComplete={() => setShowConfetti(false)} />

                {/* Boss Battle overlay */}
                <BossBattle
                    visible={showBoss}
                    bossWord={bossWord}
                    stage={profile.currentStage}
                    profileId={profile.id}
                    onAttempt={(_stars: number) => {
                        // Boss uses its own recording button internally
                    }}
                    onComplete={async (result: 'victory' | 'escaped', bonusStars: number) => {
                        setShowBoss(false);
                        await profileService.addStars(profile.id, bonusStars);
                        if (result === 'victory') {
                            triggerEmotion('victory');
                        }
                        advanceToNext();
                    }}
                />

                {/* Session Summary */}
                <SessionSummary
                    visible={showSummary}
                    starsEarned={sessionStars}
                    itemsCompleted={sessionItems}
                    bestItem={sessionBest}
                    onContinue={handleSummaryContinue}
                    onTakeBreak={handleSummaryBreak}
                />

                {/* Header */}
                <Animated.View style={[styles.header, { opacity: headerFade }]}>
                    {/* Stage badge */}
                    <View style={[styles.stageBadge, { backgroundColor: stageColor }]}>
                        <Text style={styles.stageBadgeText}>
                            Stage {profile.currentStage} · {STAGE_NAMES[profile.currentStage]}
                        </Text>
                    </View>

                    {/* Stats row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statChip}>
                            <Text style={styles.statChipText}>🔥 {profile.currentStreak}</Text>
                        </View>
                        <View style={styles.statChip}>
                            <Text style={styles.statChipText}>⭐ {profile.totalStars}</Text>
                        </View>
                        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                            <Text style={styles.skipText}>Skip →</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / items.length) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{currentIndex + 1} / {items.length}</Text>
                </Animated.View>

                {/* 3-Column Split View */}
                <View style={styles.columnsContainer}>

                    {/* Column 1: The Word */}
                    <View style={styles.column}>
                        <Animated.View style={[styles.wordContainer, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
                            <View style={styles.wordCard}>
                                <Text style={styles.word}>{currentItem.displayText}</Text>
                            </View>
                        </Animated.View>
                    </View>

                    {/* Column 2: The Character (Teacher) */}
                    <View style={styles.column}>
                        <Scene3D
                            isAnimating={learningState === 'recording' || learningState === 'analyzing'}
                            animationType={animationType}
                            lipSyncAnimation={lipSyncAnimation}
                            currentAnimationTime={currentAnimationTime}
                            width={COLUMN_W}
                            height={COLUMN_W * 2}
                        />
                    </View>

                    {/* Column 3: The Pet Companion */}
                    <View style={styles.column}>
                        <View style={styles.petContainer}>
                            <PetCompanion
                                totalStars={profile.totalStars}
                                profileId={profile.id}
                                emotion={petEmotion}
                                size="learnColumn"
                            />
                        </View>
                    </View>

                </View>

                {/* Feedback */}
                {learningState === 'feedback' && (
                    <View style={styles.feedbackContainer}>
                        <StarRating stars={stars} size="large" animate />
                        <FeedbackDisplay
                            isCorrect={stars >= 2}
                            accuracy={accuracy}
                            message={feedbackMessage}
                            visible={learningState === 'feedback'}
                        />
                    </View>
                )}

                {/* Attempt counter */}
                {learningState === 'listen' && attemptCount > 0 && (
                    <Text style={styles.attemptText}>Attempt {attemptCount + 1} of 3</Text>
                )}

                {/* Bottom controls */}
                <View style={styles.bottomControls}>
                    {/* Hint & Replay buttons */}
                    {(learningState === 'listen' || learningState === 'prompt') && (
                        <View style={styles.helperButtons}>
                            <TouchableOpacity style={styles.helperBtn} onPress={handleReplay}>
                                <Text style={styles.helperBtnEmoji}>🔁</Text>
                                <Text style={styles.helperBtnText}>Replay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.helperBtn} onPress={handleHint}>
                                <Text style={styles.helperBtnEmoji}>💡</Text>
                                <Text style={styles.helperBtnText}>Hint</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Record button */}
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <RecordButton
                            onPress={handleRecordPress}
                            isRecording={learningState === 'recording'}
                            isProcessing={learningState === 'analyzing'}
                            disabled={learningState !== 'listen' && learningState !== 'recording'}
                        />
                    </Animated.View>

                    {learningState === 'listen' && (
                        <Text style={styles.instruction}>
                            Tap and say "{currentItem.displayText}"
                        </Text>
                    )}
                    {learningState === 'introduce' && (
                        <Text style={styles.instruction}>🎧 Listen carefully...</Text>
                    )}
                    {learningState === 'prompt' && (
                        <Text style={styles.instruction}>Get ready to speak! 🎤</Text>
                    )}
                    {learningState === 'analyzing' && (
                        <Text style={styles.instruction}>✨ Checking your pronunciation...</Text>
                    )}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    loadingEmoji: { fontSize: 64 },
    loadingText: { fontSize: 24, fontWeight: '700', color: '#fff' },

    // Header
    header: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
    stageBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    stageBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statChip: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statChipText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    skipButton: {
        marginLeft: 'auto',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
    },
    skipText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFE066',
        borderRadius: 3,
    },
    progressText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },

    // Columns
    columnsContainer: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 8,
        marginTop: 10,
    },
    column: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },

    // Character container (no box — floats on gradient)
    characterContainer: { width: '100%', height: '100%' },

    // Pet
    petContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Word card
    wordContainer: { alignItems: 'center', width: '100%' },
    wordCard: {
        paddingHorizontal: 16,
        paddingVertical: 40,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
    word: { fontSize: 36, fontWeight: '900', color: '#1a1a2e', letterSpacing: 1 },

    // Feedback
    feedbackContainer: { alignItems: 'center', marginBottom: 4, gap: 8 },
    attemptText: { textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },

    // Bottom
    bottomControls: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 16, gap: 12 },
    helperButtons: { flexDirection: 'row', gap: 16 },
    helperBtn: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 16,
        gap: 2,
    },
    helperBtnEmoji: { fontSize: 24 },
    helperBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },
    instruction: {
        fontSize: 17,
        color: '#fff',
        textAlign: 'center',
        fontWeight: '700',
        paddingHorizontal: 24,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});