import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { FeedbackDisplay } from '../../components/FeedbackDisplay';
import { RecordButton } from '../../components/RecordButton';
import { Scene3D } from '../../components/Scene3D';
import { ChildTheme } from '../../constants/ChildTheme';
import { LearningWord, getRandomWord } from '../../data/learningWords';
import { LipSyncAnimation } from '../../services/lipSyncService';
import { progressTracker } from '../../services/progressTracker';
import { ttsService } from '../../services/textToSpeech';

type LearningState =
    | 'introduce'    // Character shows and pronounces word
    | 'prompt'       // Character asks child to repeat
    | 'listen'       // Waiting for child to speak
    | 'recording'    // Recording audio
    | 'analyzing'    // Processing pronunciation
    | 'feedback';    // Showing results

export default function LearnScreen() {
    const [currentWord, setCurrentWord] = useState<LearningWord>(getRandomWord());
    const [learningState, setLearningState] = useState<LearningState>('introduce');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [accuracy, setAccuracy] = useState<number>(0);
    const [feedbackMessage, setFeedbackMessage] = useState<string>('');
    const [animationType, setAnimationType] = useState<'idle' | 'speaking' | 'celebrating' | 'encouraging'>('idle');

    // Lip-sync animation state
    const [lipSyncAnimation, setLipSyncAnimation] = useState<LipSyncAnimation | null>(null);
    const [currentAnimationTime, setCurrentAnimationTime] = useState<number>(0);

    // Request audio permissions on mount
    useEffect(() => {
        (async () => {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
        })();
    }, []);

    // Start the learning flow when component mounts or word changes
    useEffect(() => {
        startLearningFlow();
    }, [currentWord]);

    const startLearningFlow = async () => {
        // Step 1: Introduce the word
        setLearningState('introduce');
        setAnimationType('speaking');
        await ttsService.speakWordIntroduction(currentWord.word, {
            onAnimationStart: (animation) => setLipSyncAnimation(animation),
            onAnimationUpdate: (time) => setCurrentAnimationTime(time),
            onAnimationEnd: () => {
                setLipSyncAnimation(null);
                setCurrentAnimationTime(0);
            },
        });

        // Small pause
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 2: Prompt child to repeat
        setLearningState('prompt');
        await ttsService.askToRepeat(currentWord.word, {
            onAnimationStart: (animation) => setLipSyncAnimation(animation),
            onAnimationUpdate: (time) => setCurrentAnimationTime(time),
            onAnimationEnd: () => {
                setLipSyncAnimation(null);
                setCurrentAnimationTime(0);
            },
        });

        // Step 3: Ready to listen
        setLearningState('listen');
        setAnimationType('idle');
    };

    const handleRecordPress = async () => {
        if (learningState === 'listen') {
            // Start recording
            await startRecording();
        } else if (learningState === 'recording') {
            // Stop recording
            await stopRecording();
        }
    };

    const startRecording = async () => {
        try {
            setLearningState('recording');
            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
        } catch (error) {
            console.error('Failed to start recording:', error);
            setLearningState('listen');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            setLearningState('analyzing');
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();

            // For now, simulate pronunciation analysis
            // TODO: Integrate ONNX Wav2Vec2 model here
            await analyzePronunciation(uri);

            setRecording(null);
        } catch (error) {
            console.error('Failed to stop recording:', error);
            setLearningState('listen');
        }
    };

    const analyzePronunciation = async (audioUri: string | null) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));

        // For now, generate random accuracy (will be replaced with actual ONNX model)
        const simulatedAccuracy = Math.random() * 100;
        const isSuccess = simulatedAccuracy >= 85;
        const isPartial = simulatedAccuracy >= 60 && simulatedAccuracy < 85;

        setAccuracy(simulatedAccuracy);
        setIsCorrect(isSuccess);
        setLearningState('feedback');

        // Show appropriate feedback
        if (isSuccess) {
            setAnimationType('celebrating');
            setFeedbackMessage('Amazing! Perfect pronunciation! 🎉');
            await ttsService.celebrateSuccess({
                onAnimationStart: (animation) => setLipSyncAnimation(animation),
                onAnimationUpdate: (time) => setCurrentAnimationTime(time),
                onAnimationEnd: () => {
                    setLipSyncAnimation(null);
                    setCurrentAnimationTime(0);
                },
            });
            await progressTracker.recordAttempt(currentWord.id, simulatedAccuracy, true);
        } else if (isPartial) {
            setAnimationType('encouraging');
            setFeedbackMessage('Good try! Let\'s practice more! 👍');
            await ttsService.encourageRetry(undefined, {
                onAnimationStart: (animation) => setLipSyncAnimation(animation),
                onAnimationUpdate: (time) => setCurrentAnimationTime(time),
                onAnimationEnd: () => {
                    setLipSyncAnimation(null);
                    setCurrentAnimationTime(0);
                },
            });
            await progressTracker.recordAttempt(currentWord.id, simulatedAccuracy, false);
        } else {
            setAnimationType('encouraging');
            setFeedbackMessage('Keep trying! You can do it! 💪');
            await ttsService.encourageRetry('Try to say it slowly', {
                onAnimationStart: (animation) => setLipSyncAnimation(animation),
                onAnimationUpdate: (time) => setCurrentAnimationTime(time),
                onAnimationEnd: () => {
                    setLipSyncAnimation(null);
                    setCurrentAnimationTime(0);
                },
            });
            await progressTracker.recordAttempt(currentWord.id, simulatedAccuracy, false);
        }

        // Wait a bit before allowing next attempt
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (isSuccess) {
            // Move to next word
            handleNextWord();
        } else {
            // Try again with same word
            setLearningState('listen');
            setAnimationType('idle');
            setIsCorrect(null);
            setAccuracy(0);
            setFeedbackMessage('');
        }
    };

    const handleNextWord = () => {
        const nextWord = getRandomWord();
        setCurrentWord(nextWord);
        setIsCorrect(null);
        setAccuracy(0);
        setFeedbackMessage('');
        setAnimationType('idle');
    };

    const handleSkip = () => {
        ttsService.stop();
        handleNextWord();
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header with skip button */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                        <Text style={styles.skipText}>Skip →</Text>
                    </TouchableOpacity>
                </View>

                {/* 3D Character (upper half) */}
                <View style={styles.characterContainer}>
                    <Scene3D
                        isAnimating={learningState === 'recording' || learningState === 'analyzing'}
                        animationType={animationType}
                        lipSyncAnimation={lipSyncAnimation}
                        currentAnimationTime={currentAnimationTime}
                    />
                </View>

                {/* Learning Object Display (middle) */}
                <View style={styles.wordContainer}>
                    <View style={styles.wordCard}>
                        <Text style={styles.emoji}>{currentWord.emoji}</Text>
                        <Text style={styles.word}>{currentWord.word}</Text>
                        <Text style={styles.phonemes}>{currentWord.phonemes}</Text>
                    </View>
                </View>

                {/* Feedback Display */}
                {learningState === 'feedback' && (
                    <View style={styles.feedbackContainer}>
                        <FeedbackDisplay
                            isCorrect={isCorrect}
                            accuracy={accuracy}
                            message={feedbackMessage}
                            visible={learningState === 'feedback'}
                        />
                    </View>
                )}

                {/* Record Button (bottom) */}
                <View style={styles.buttonContainer}>
                    <RecordButton
                        onPress={handleRecordPress}
                        isRecording={learningState === 'recording'}
                        isProcessing={learningState === 'analyzing'}
                        disabled={learningState !== 'listen' && learningState !== 'recording'}
                    />

                    {learningState === 'listen' && (
                        <Text style={styles.instruction}>
                            Tap the button and say "{currentWord.word}"
                        </Text>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ChildTheme.colors.backgroundStart,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: ChildTheme.spacing.md,
    },
    skipButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        paddingHorizontal: ChildTheme.spacing.lg,
        paddingVertical: ChildTheme.spacing.sm,
        borderRadius: ChildTheme.borderRadius.lg,
    },
    skipText: {
        color: ChildTheme.colors.textLight,
        fontSize: ChildTheme.fontSize.md,
        fontWeight: 'bold',
    },
    characterContainer: {
        height: height * 0.35,
        marginBottom: ChildTheme.spacing.md,
    },
    wordContainer: {
        alignItems: 'center',
        marginBottom: ChildTheme.spacing.lg,
    },
    wordCard: {
        backgroundColor: ChildTheme.colors.cardBackground,
        padding: ChildTheme.spacing.xl,
        borderRadius: ChildTheme.borderRadius.xl,
        alignItems: 'center',
        ...ChildTheme.shadows.large,
        minWidth: 200,
    },
    emoji: {
        fontSize: 80,
        marginBottom: ChildTheme.spacing.sm,
    },
    word: {
        fontSize: ChildTheme.fontSize.huge,
        fontWeight: 'bold',
        color: ChildTheme.colors.textPrimary,
        marginBottom: ChildTheme.spacing.xs,
    },
    phonemes: {
        fontSize: ChildTheme.fontSize.lg,
        color: ChildTheme.colors.textSecondary,
        fontStyle: 'italic',
    },
    feedbackContainer: {
        marginBottom: ChildTheme.spacing.lg,
    },
    buttonContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: ChildTheme.spacing.xxl,
    },
    instruction: {
        marginTop: ChildTheme.spacing.md,
        fontSize: ChildTheme.fontSize.lg,
        color: ChildTheme.colors.textLight,
        textAlign: 'center',
        fontWeight: '600',
        paddingHorizontal: ChildTheme.spacing.lg,
    },
});
