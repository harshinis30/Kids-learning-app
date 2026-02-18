import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AgeGroup, profileService } from '../services/profileService';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
    const [step, setStep] = useState<'welcome' | 'name' | 'age'>('welcome');
    const [name, setName] = useState('');
    const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
    const [loading, setLoading] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const transition = (nextStep: 'welcome' | 'name' | 'age') => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            setStep(nextStep);
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        });
    };

    const handleStart = async () => {
        if (!name.trim() || !selectedAge) return;
        setLoading(true);
        try {
            await profileService.createProfile(name.trim(), selectedAge);
            router.replace('/(tabs)');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.container}
        >
            <SafeAreaView style={styles.safe}>
                {/* Decorative stars */}
                <View style={styles.starsDecor}>
                    {['⭐', '🌟', '✨', '💫', '⭐', '🌟'].map((s, i) => (
                        <Text key={i} style={[styles.decorStar, { top: Math.random() * 200, left: (i / 6) * width }]}>{s}</Text>
                    ))}
                </View>

                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {step === 'welcome' && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.bigEmoji}>🎓</Text>
                            <Text style={styles.appName}>SpeakStar</Text>
                            <Text style={styles.tagline}>Learn to speak, one word at a time!</Text>
                            <Text style={styles.description}>
                                A fun, interactive pronunciation adventure for little learners 🚀
                            </Text>
                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => transition('name')}
                            >
                                <Text style={styles.primaryBtnText}>Let's Get Started! 🌟</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 'name' && (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.stepContainer}
                        >
                            <Text style={styles.bigEmoji}>👋</Text>
                            <Text style={styles.stepTitle}>What's your name?</Text>
                            <Text style={styles.stepSub}>Tell us your name so we can cheer for you!</Text>
                            <TextInput
                                style={styles.nameInput}
                                placeholder="Type your name here..."
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                value={name}
                                onChangeText={setName}
                                maxLength={20}
                                autoFocus
                                returnKeyType="next"
                                onSubmitEditing={() => name.trim() && transition('age')}
                            />
                            <TouchableOpacity
                                style={[styles.primaryBtn, !name.trim() && styles.disabledBtn]}
                                onPress={() => name.trim() && transition('age')}
                                disabled={!name.trim()}
                            >
                                <Text style={styles.primaryBtnText}>Next →</Text>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    )}

                    {step === 'age' && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.bigEmoji}>🎂</Text>
                            <Text style={styles.stepTitle}>How old are you?</Text>
                            <Text style={styles.stepSub}>We'll pick the perfect words for you!</Text>

                            <TouchableOpacity
                                style={[styles.ageCard, selectedAge === 'toddler' && styles.ageCardSelected]}
                                onPress={() => setSelectedAge('toddler')}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={selectedAge === 'toddler' ? ['#FF6B6B', '#FF8E53'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                    style={styles.ageCardGradient}
                                >
                                    <Text style={styles.ageEmoji}>🐣</Text>
                                    <View>
                                        <Text style={styles.ageTitle}>Little Learner</Text>
                                        <Text style={styles.ageRange}>Ages 2 – 4</Text>
                                        <Text style={styles.ageDesc}>Vowel sounds, syllables & simple words</Text>
                                    </View>
                                    {selectedAge === 'toddler' && <Text style={styles.checkmark}>✓</Text>}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.ageCard, selectedAge === 'explorer' && styles.ageCardSelected]}
                                onPress={() => setSelectedAge('explorer')}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={selectedAge === 'explorer' ? ['#4ECDC4', '#44A08D'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                    style={styles.ageCardGradient}
                                >
                                    <Text style={styles.ageEmoji}>🚀</Text>
                                    <View>
                                        <Text style={styles.ageTitle}>Word Explorer</Text>
                                        <Text style={styles.ageRange}>Ages 5 – 7</Text>
                                        <Text style={styles.ageDesc}>Blends, digraphs & longer words</Text>
                                    </View>
                                    {selectedAge === 'explorer' && <Text style={styles.checkmark}>✓</Text>}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.primaryBtn, (!selectedAge || loading) && styles.disabledBtn]}
                                onPress={handleStart}
                                disabled={!selectedAge || loading}
                            >
                                <Text style={styles.primaryBtnText}>
                                    {loading ? 'Setting up...' : `Start Learning, ${name}! 🎉`}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>

                {/* Step indicators */}
                <View style={styles.dots}>
                    {['welcome', 'name', 'age'].map((s, i) => (
                        <View
                            key={i}
                            style={[styles.dot, step === s && styles.dotActive]}
                        />
                    ))}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1, justifyContent: 'space-between' },
    starsDecor: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
    decorStar: { position: 'absolute', fontSize: 20, opacity: 0.3 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
    stepContainer: { alignItems: 'center', gap: 16 },
    bigEmoji: { fontSize: 80, marginBottom: 8 },
    appName: { fontSize: 42, fontWeight: '900', color: '#FFE066', letterSpacing: 1 },
    tagline: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
    description: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
    stepTitle: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center' },
    stepSub: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
    nameInput: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: 18,
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        marginVertical: 8,
    },
    ageCard: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    ageCardSelected: { borderColor: '#FFE066', borderWidth: 3 },
    ageCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    ageEmoji: { fontSize: 44 },
    ageTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    ageRange: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    ageDesc: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
    checkmark: { fontSize: 24, color: '#FFE066', marginLeft: 'auto' },
    primaryBtn: {
        backgroundColor: '#FFE066',
        paddingHorizontal: 40,
        paddingVertical: 18,
        borderRadius: 50,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#FFE066',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
        marginTop: 8,
    },
    disabledBtn: { opacity: 0.4, shadowOpacity: 0 },
    primaryBtnText: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 32 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
    dotActive: { backgroundColor: '#FFE066', width: 24 },
});
