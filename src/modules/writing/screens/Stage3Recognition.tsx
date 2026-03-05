import { router } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LetterRecognitionGame from '../components/LetterRecognitionGame';

// Shared state for Stage 4 reference
export const practiceFlags = new Set<string>();

export const flagLetterForPractice = (letter: string) => {
    console.log(`[Stage 3] Flagging ${letter} for extra Stage 4 practice`);
    practiceFlags.add(letter);
};

const STAGE3_LEVELS = [
    {
        type: 'doors' as const,
        prompt: 'Tap the mountain sign "A"',
        correctId: 'A',
        options: [
            { id: 'A', label: 'A', xNorm: 0.2, yNorm: 0.7 },
            { id: 'B', label: 'B', xNorm: 0.5, yNorm: 0.7 },
            { id: 'C', label: 'C', xNorm: 0.8, yNorm: 0.7 }
        ]
    },
    {
        type: 'forks' as const,
        prompt: 'Match uppercase to lowercase (C ➡️ c)',
        correctId: 'c',
        options: [
            { id: 'a', label: 'a', xNorm: 0.25, yNorm: 0.55 },
            { id: 'c', label: 'c', xNorm: 0.75, yNorm: 0.55 }
        ]
    },
    {
        type: 'doors' as const,
        prompt: 'Find the odd one out!',
        correctId: 'C',
        options: [
            { id: 'O1', label: 'O', xNorm: 0.2, yNorm: 0.7 },
            { id: 'C', label: 'C', xNorm: 0.5, yNorm: 0.7 },
            { id: 'O2', label: 'O', xNorm: 0.8, yNorm: 0.7 }
        ]
    }
];

export default function Stage3Recognition() {
    const [currentLevel, setCurrentLevel] = useState(0);
    const [showCompletion, setShowCompletion] = useState(false);
    const [mistakes, setMistakes] = useState(0);

    const level = STAGE3_LEVELS[currentLevel];

    const handleCorrect = () => {
        // Wait for Milo arrival animation to play fully before moving on
        setTimeout(() => {
            if (currentLevel < STAGE3_LEVELS.length - 1) {
                setCurrentLevel(c => c + 1);
            } else {
                setShowCompletion(true);
            }
        }, 1500);
    };

    const handleIncorrect = (wrongId: string) => {
        setMistakes(m => m + 1);
        // Adaptive logic feed
        flagLetterForPractice(level.correctId.toUpperCase());
    };

    if (showCompletion) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.completeContainer}>
                    <Text style={styles.completeEmoji}>🎊</Text>
                    <Text style={styles.completeTitle}>Stage 3 Complete!</Text>
                    <Text style={styles.completeSubtitle}>Milo found his way through the signs!</Text>

                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 16, marginBottom: 16 }}>
                        <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>
                            Score: {Math.max(0, 100 - (mistakes * 15))}%
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setCurrentLevel(0); setMistakes(0); setShowCompletion(false); }}>
                        <Text style={styles.retryBtnText}>Play Again 🔁</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.retryBtn, { backgroundColor: '#4ECDC4', marginTop: 12 }]} onPress={() => router.push('/writing-stage4')}>
                        <Text style={styles.retryBtnText}>Continue to Stage 4 ➡️</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <LetterRecognitionGame
                key={currentLevel}
                promptText={level.prompt}
                options={level.options}
                correctId={level.correctId}
                miloStartNorm={{ x: 0.5, y: 0.85 }}
                onCorrect={handleCorrect}
                onIncorrect={handleIncorrect}
                sceneLayout={level.type}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#1a1a2e' },
    completeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
    completeEmoji: { fontSize: 80 },
    completeTitle: { fontSize: 36, fontWeight: '900', color: '#FFE066', textAlign: 'center' },
    completeSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 8 },
    retryBtn: { backgroundColor: '#FFE066', paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50 },
    retryBtnText: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' }
});
