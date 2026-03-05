import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AlphabetTracer from '../components/AlphabetTracer';
import { practiceFlags } from './Stage3Recognition';

const LETTERS = ['i', 't', 'u', 'w', 'e', 'l'];
type SubPhase = '4A' | '4B' | '4C';
const PHASES: SubPhase[] = ['4A', '4B', '4C'];

export default function Stage4AlphabetTrace() {
    const [letterIdx, setLetterIdx] = useState(0);
    const [phaseIdx, setPhaseIdx] = useState(0);
    const [showCompletion, setShowCompletion] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);

    const currentLetter = LETTERS[letterIdx];
    const currentPhase = PHASES[phaseIdx];

    const [practiceRep, setPracticeRep] = useState(0);

    const handleLetterComplete = (mistakes: number) => {
        setTotalMistakes(m => m + mistakes);

        // If they struggled inside word
        if (mistakes > 5) {
            console.log('High mistakes, repeating phase');
            setPracticeRep(r => r + 1);
            return;
        }

        const needsPractice = practiceFlags.has(currentLetter.toUpperCase()) && currentPhase === '4A' && practiceRep === 0;

        if (needsPractice) {
            console.log('Doing extra practice guided by Stage 3 failure');
            setPracticeRep(1);
            return;
        }

        // Move to next phase
        if (phaseIdx < PHASES.length - 1) {
            setPhaseIdx(p => p + 1);
            setPracticeRep(0);
        } else {
            // Next letter
            if (letterIdx < LETTERS.length - 1) {
                setLetterIdx(l => l + 1);
                setPhaseIdx(0);
                setPracticeRep(0);
            } else {
                setShowCompletion(true);
            }
        }
    };

    const handleStruggle = () => {
        // childFailsSameStroke3Times
        if (phaseIdx > 0) {
            console.log('Downgrading phase to help child');
            setPhaseIdx(p => p - 1);
        }
    };

    if (showCompletion) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.completeContainer}>
                    <Text style={styles.completeEmoji}>🎊</Text>
                    <Text style={styles.completeTitle}>Stage 4 Complete!</Text>
                    <Text style={styles.completeSubtitle}>Milo mastered cursive handwriting! ✍️</Text>

                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 16, marginBottom: 16 }}>
                        <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>
                            Overall Score: {Math.max(0, 100 - (totalMistakes * 5))}%
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLetterIdx(0); setPhaseIdx(0); setTotalMistakes(0); setShowCompletion(false); }}>
                        <Text style={styles.retryBtnText}>Play Again 🔁</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Cursive:  {currentLetter}</Text>
                <Text style={styles.cursiveBadge}>✍️ Cursive Handwriting</Text>
            </View>

            <AlphabetTracer
                key={currentLetter + currentPhase + practiceRep}
                letterId={currentLetter}
                subPhase={currentPhase}
                onLetterComplete={handleLetterComplete}
                onStruggle={handleStruggle}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#1a1a2e' },
    header: { padding: 12, alignItems: 'center', backgroundColor: 'rgba(26,26,46,0.95)', zIndex: 10, paddingTop: 40 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFE066' },
    cursiveBadge: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFE066',
        backgroundColor: 'rgba(255,225,100,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
        overflow: 'hidden',
    },
    completeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
    completeEmoji: { fontSize: 80 },
    completeTitle: { fontSize: 36, fontWeight: '900', color: '#FFE066', textAlign: 'center' },
    completeSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 8 },
    retryBtn: { backgroundColor: '#FFE066', paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50 },
    retryBtnText: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' }
});
