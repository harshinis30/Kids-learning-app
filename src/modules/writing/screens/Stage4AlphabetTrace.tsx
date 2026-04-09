import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import * as Speech from 'expo-speech';
import AlphabetTracer from '../components/AlphabetTracer';

function AnimatedEmoji({ emoji }: { emoji: string }) {
    const [imgError, setImgError] = useState(false);
    let hex = emoji.codePointAt(0)?.toString(16) || '';
    if (emoji === '☀️') hex = '2600';
    if (emoji === '☂️') hex = '2602';
    if (imgError) return <Text style={styles.emoji}>{emoji}</Text>;
    return (
        <Image 
            source={{ uri: `https://fonts.gstatic.com/s/e/notoemoji/latest/${hex}/512.gif` }}
            style={{ width: 140, height: 140, marginBottom: -10 }}
            onError={() => setImgError(true)}
        />
    );
}
import { practiceFlags } from './Stage3Recognition';
import { useWritingCompletion } from './WritingLevelHub';

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
type SubPhase = '4A' | '4B' | '4C';
const PHASES: SubPhase[] = ['4A', '4B', '4C'];

const ASSOCIATIONS: Record<string, { word: string; emoji: string; prompt: string }> = {
    'a': { word: 'Apple', emoji: '🍎', prompt: 'A is for Apple! Trace along the dotted line with the hand to draw a cursive a!' },
    'b': { word: 'Bear', emoji: '🐻', prompt: 'B is for Bear! Follow the hand up to drop down the cursive b!' },
    'c': { word: 'Cat', emoji: '🐱', prompt: 'C is for Cat! Curve around the dotted line for a cursive c!' },
    'd': { word: 'Dog', emoji: '🐶', prompt: 'D is for Dog! Draw the loop for d!' },
    'e': { word: 'Elephant', emoji: '🐘', prompt: 'E is for Elephant! Loop the little e along the dots!' },
    'f': { word: 'Frog', emoji: '🐸', prompt: 'F is for Frog! Leap over the cursive f!' },
    'g': { word: 'Giraffe', emoji: '🦒', prompt: 'G is for Giraffe! Go around the g!' },
    'h': { word: 'Helicopter', emoji: '🚁', prompt: 'H is for Helicopter! Hover around the h!' },
    'i': { word: 'Ice Cream', emoji: '🍦', prompt: 'I is for Ice Cream! Dot the cursive i!' },
    'j': { word: 'Juice', emoji: '🧃', prompt: 'J is for Juice! Jump down for j!' },
    'k': { word: 'Kite', emoji: '🪁', prompt: 'K is for Kite! Kick out the k!' },
    'l': { word: 'Lion', emoji: '🦁', prompt: 'L is for Lion! Loop the tall l!' },
    'm': { word: 'Monkey', emoji: '🐒', prompt: 'M is for Monkey! Make the bumps for m!' },
    'n': { word: 'Nest', emoji: '🪹', prompt: 'N is for Nest! Nod along the n!' },
    'o': { word: 'Octopus', emoji: '🐙', prompt: 'O is for Octopus! Orbit the o along the guides!' },
    'p': { word: 'Penguin', emoji: '🐧', prompt: 'P is for Penguin! Plunge the p down the dotted line!' },
    'q': { word: 'Queen', emoji: '👑', prompt: 'Q is for Queen! Quick loop for q!' },
    'r': { word: 'Rocket', emoji: '🚀', prompt: 'R is for Rocket! Ride the r up!' },
    's': { word: 'Sun', emoji: '☀️', prompt: 'S is for Sun! Slide around the s!' },
    't': { word: 'Turtle', emoji: '🐢', prompt: 'T is for Turtle! Cross the tall t!' },
    'u': { word: 'Umbrella', emoji: '☂️', prompt: 'U is for Umbrella! Up and under for u!' },
    'v': { word: 'Volcano', emoji: '🌋', prompt: 'V is for Volcano! Valley down the v!' },
    'w': { word: 'Watermelon', emoji: '🍉', prompt: 'W is for Watermelon! Wiggle the w!' },
    'x': { word: 'X-ray', emoji: '🦴', prompt: 'X is for X-ray! Cross the x!' },
    'y': { word: 'Yarn', emoji: '🧶', prompt: 'Y is for Yarn! Yo-yo down the y!' },
    'z': { word: 'Zebra', emoji: '🦓', prompt: 'Z is for Zebra! Zigzag the cursive z!' },
};

export default function Stage4AlphabetTrace() {
    const [letterIdx, setLetterIdx] = useState(0);
    const [phaseIdx, setPhaseIdx] = useState(0);
    const [showCompletion, setShowCompletion] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);
    const [letterAccuracies, setLetterAccuracies] = useState<number[]>([]);

    const avgAccuracy = letterAccuracies.length > 0
        ? Math.round(letterAccuracies.reduce((a, b) => a + b, 0) / letterAccuracies.length)
        : 0;
    const finalStars = avgAccuracy >= 90 ? 3 : avgAccuracy >= 70 ? 2 : 1;
    useWritingCompletion(showCompletion, 4, finalStars);

    const currentLetter = LETTERS[letterIdx];
    const currentPhase = PHASES[phaseIdx];
    const association = ASSOCIATIONS[currentLetter];

    useEffect(() => {
        if (showCompletion) return;
        
        const playVoice = async () => {
            Speech.stop();
            let bestVoice;
            try {
                const voices = await Speech.getAvailableVoicesAsync();
                // Target high-quality default female engines across Windows, iOS, Mac, and Chrome
                const female = voices.find(v => 
                    v.name.includes('Female') || 
                    v.name.includes('Zira') || 
                    v.name.includes('Samantha') || 
                    v.name.includes('Google US English') ||
                    v.name.includes('Victoria')
                );
                if (female) bestVoice = female.identifier;
            } catch (e) {
                console.log("Voice fetch error:", e);
            }

            Speech.speak(`${association.word}! ... ${association.prompt}`, {
                pitch: 1.15, // Higher pitch usually yields a warmer, more maternal tone
                rate: 0.85,  // Slower speed makes the articulation less robotic
                language: 'en-US',
                voice: bestVoice
            });
        };
        
        playVoice();
        return () => { Speech.stop(); };
    }, [currentLetter, association.prompt, showCompletion]);

    const [practiceRep, setPracticeRep] = useState(0);

    const handleLetterComplete = (mistakes: number, accuracy: number) => {
        setTotalMistakes(m => m + mistakes);
        setLetterAccuracies(prev => [...prev, accuracy]);

        if (mistakes > 5) {
            setPracticeRep(r => r + 1);
            return;
        }

        const needsPractice = practiceFlags.has(currentLetter.toUpperCase()) && currentPhase === '4A' && practiceRep === 0;

        if (needsPractice) {
            setPracticeRep(1);
            return;
        }

        if (phaseIdx < PHASES.length - 1) {
            setPhaseIdx(p => p + 1);
            setPracticeRep(0);
        } else {
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
        if (phaseIdx > 0) {
            setPhaseIdx(p => p - 1);
        }
    };

    if (showCompletion) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.completeContainer}>
                    <Text style={styles.completeEmoji}>🎉</Text>
                    <Text style={styles.completeTitle}>A-Z Safari Complete!</Text>
                    <Text style={styles.completeSubtitle}>Milo mastered all cursive letters! ✍️{'\n'}You finished ALL levels! 🏆</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
                        <Text style={{ fontSize: 36 }}>⭐</Text>
                        <Text style={{ fontSize: 36 }}>⭐</Text>
                        <Text style={{ fontSize: 36 }}>⭐</Text>
                    </View>

                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 16, marginBottom: 16 }}>
                        <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>
                            Overall Accuracy: {avgAccuracy}%
                        </Text>
                    </View>

                    <TouchableOpacity style={[styles.retryBtn, { backgroundColor: '#4CD964' }]} onPress={() => router.push('/writing' as any)}>
                        <Text style={styles.retryBtnText}>All Done! Levels 🏆</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.retryBtn, { backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }]} onPress={() => { setLetterIdx(0); setPhaseIdx(0); setTotalMistakes(0); setLetterAccuracies([]); setShowCompletion(false); }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>Play Again 🔁</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/writing' as any)} style={{ position: 'absolute', left: 20, top: 44, padding: 8 }}>
                    <Text style={{ fontSize: 28 }}>🏠</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Alphabet Safari 🦓</Text>
                <Text style={styles.cursiveBadge}>✍️ Cursive Handwriting</Text>
            </View>

            <View style={styles.content}>
                 <AlphabetTracer
                    key={currentLetter + currentPhase + practiceRep}
                    letterId={currentLetter}
                    subPhase={currentPhase}
                    onLetterComplete={handleLetterComplete}
                    onStruggle={handleStruggle}
                />

                {/* Floating Interactive Sidebar */}
                <View style={styles.floatingSidebar} pointerEvents="none">
                    <View style={styles.card}>
                        <AnimatedEmoji emoji={association.emoji} />
                        <Text style={styles.word}>{association.word}</Text>
                        <Text style={styles.letter}>{currentLetter.toUpperCase()}{currentLetter}</Text>
                    </View>
                    <View style={styles.promptBubble}>
                        <Text style={styles.promptText}>{association.prompt}</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#1a1a2e' },
    header: { padding: 12, alignItems: 'center', backgroundColor: 'rgba(26,26,46,0.95)', zIndex: 10, paddingTop: 45, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#FFE066' },
    cursiveBadge: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFE066',
        backgroundColor: 'rgba(255,225,100,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        marginTop: 6,
        overflow: 'hidden',
    },
    content: { flex: 1, position: 'relative' },
    floatingSidebar: {
        position: 'absolute',
        top: '25%',
        left: '5%',
        width: '35%',
        zIndex: 5,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: 'rgba(60,40,90,0.85)',
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(220,180,255,0.3)',
        marginBottom: 16,
        shadowColor: '#FECA57',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    emoji: { fontSize: 110, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 6 }, textShadowRadius: 10 },
    word: { fontSize: 28, fontWeight: '900', color: '#FFF', marginTop: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
    letter: { fontSize: 48, fontWeight: 'bold', color: '#FFE066', marginTop: 8, fontStyle: 'italic' },
    promptBubble: {
        backgroundColor: '#FF6B6B',
        padding: 20,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#FFF',
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    promptText: { fontSize: 18, color: '#FFF', fontWeight: '800', textAlign: 'center', lineHeight: 26 },
    completeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
    completeEmoji: { fontSize: 80 },
    completeTitle: { fontSize: 36, fontWeight: '900', color: '#FFE066', textAlign: 'center' },
    completeSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 8 },
    retryBtn: { backgroundColor: '#FFE066', paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50 },
    retryBtnText: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' }
});
