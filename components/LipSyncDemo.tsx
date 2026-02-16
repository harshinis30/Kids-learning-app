/**
 * Lip-Sync Animation Demo
 * 
 * This component demonstrates the automatic lip-sync animation system.
 * It can be used to test different phrases and verify the animation quality.
 */

import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { LipSyncAnimation } from '../services/lipSyncService';
import { ttsService } from '../services/textToSpeech';
import { Scene3D } from './Scene3D';

const TEST_PHRASES = [
    'Hello, how are you?',
    'Apple, elephant, octopus',
    'Mom made me muffins',
    'The quick brown fox jumps',
    'Beautiful butterfly',
    'Say cheese!',
    'Wonderful world',
];

export function LipSyncDemo() {
    const [customText, setCustomText] = useState('');
    const [animationType, setAnimationType] = useState<'idle' | 'speaking'>('idle');
    const [lipSyncAnimation, setLipSyncAnimation] = useState<LipSyncAnimation | null>(null);
    const [currentAnimationTime, setCurrentAnimationTime] = useState<number>(0);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const handleSpeak = async (text: string) => {
        if (isSpeaking) {
            ttsService.stop();
            setIsSpeaking(false);
            setAnimationType('idle');
            setLipSyncAnimation(null);
            setCurrentAnimationTime(0);
            return;
        }

        setIsSpeaking(true);
        setAnimationType('speaking');

        await ttsService.speak(text, {
            rate: 0.7,
            onAnimationStart: (animation) => {
                console.log('Animation started, duration:', animation.duration);
                setLipSyncAnimation(animation);
            },
            onAnimationUpdate: (time) => {
                setCurrentAnimationTime(time);
            },
            onAnimationEnd: () => {
                console.log('Animation ended');
                setLipSyncAnimation(null);
                setCurrentAnimationTime(0);
                setAnimationType('idle');
                setIsSpeaking(false);
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Lip-Sync Animation Demo</Text>
                <Text style={styles.subtitle}>
                    Test the automatic lip-sync with different phrases
                </Text>
            </View>

            {/* 3D Character */}
            <View style={styles.characterContainer}>
                <Scene3D
                    isAnimating={isSpeaking}
                    animationType={animationType}
                    lipSyncAnimation={lipSyncAnimation}
                    currentAnimationTime={currentAnimationTime}
                />
            </View>

            {/* Animation Info */}
            <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                    Status: {isSpeaking ? 'Speaking' : 'Idle'}
                </Text>
                {lipSyncAnimation && (
                    <Text style={styles.infoText}>
                        Time: {currentAnimationTime.toFixed(2)}s / {lipSyncAnimation.duration.toFixed(2)}s
                    </Text>
                )}
            </View>

            {/* Test Phrases */}
            <ScrollView style={styles.phrasesContainer}>
                <Text style={styles.sectionTitle}>Test Phrases:</Text>
                {TEST_PHRASES.map((phrase, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.phraseButton}
                        onPress={() => handleSpeak(phrase)}
                    >
                        <Text style={styles.phraseText}>{phrase}</Text>
                    </TouchableOpacity>
                ))}

                {/* Custom Text Input */}
                <View style={styles.customInputContainer}>
                    <Text style={styles.sectionTitle}>Custom Text:</Text>
                    <TextInput
                        style={styles.textInput}
                        value={customText}
                        onChangeText={setCustomText}
                        placeholder="Enter custom text..."
                        placeholderTextColor="#999"
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.phraseButton, styles.customButton]}
                        onPress={() => customText && handleSpeak(customText)}
                        disabled={!customText}
                    >
                        <Text style={styles.phraseText}>
                            {isSpeaking ? 'Stop' : 'Speak Custom Text'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        padding: 20,
        backgroundColor: '#16213e',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#aaa',
    },
    characterContainer: {
        height: 300,
        backgroundColor: '#0f3460',
    },
    infoContainer: {
        padding: 15,
        backgroundColor: '#16213e',
        borderBottomWidth: 1,
        borderBottomColor: '#0f3460',
    },
    infoText: {
        fontSize: 14,
        color: '#fff',
        marginBottom: 5,
    },
    phrasesContainer: {
        flex: 1,
        padding: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        marginTop: 10,
    },
    phraseButton: {
        backgroundColor: '#0f3460',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    phraseText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    customInputContainer: {
        marginTop: 20,
    },
    textInput: {
        backgroundColor: '#16213e',
        color: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    customButton: {
        backgroundColor: '#e94560',
    },
});
