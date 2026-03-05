/**
 * Lip-Sync Animation Demo
 * 
 * This component demonstrates the automatic lip-sync animation system.
 * It can be used to test different phrases and verify the animation quality.
 */

import React, { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
                <Text style={styles.title}>Pronunciation Test</Text>
            </View>

            {/* Character */}
            <View style={styles.characterContainer}>
                <Scene3D
                    isAnimating={isSpeaking}
                    animationType={animationType}
                    lipSyncAnimation={lipSyncAnimation}
                    currentAnimationTime={currentAnimationTime}
                />
            </View>

            <View style={styles.inputSection}>
                <Text style={styles.instructionText}>
                    Enter a word to see it pronounced:
                </Text>

                <TextInput
                    style={styles.textInput}
                    value={customText}
                    onChangeText={setCustomText}
                    placeholder="e.g. apple, elephant..."
                    placeholderTextColor="#999"
                />

                <TouchableOpacity
                    style={[styles.speakButton, isSpeaking && styles.stopButton]}
                    onPress={() => customText && handleSpeak(customText)}
                    disabled={!customText && !isSpeaking}
                >
                    <Text style={styles.speakButtonText}>
                        {isSpeaking ? 'Stop' : 'Pronounce'}
                    </Text>
                </TouchableOpacity>
            </View>
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
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    characterContainer: {
        flex: 1,
        backgroundColor: '#0f3460',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputSection: {
        padding: 25,
        backgroundColor: '#16213e',
        borderTopWidth: 1,
        borderTopColor: '#2a2a4e',
    },
    instructionText: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 10,
        textAlign: 'center',
    },
    textInput: {
        backgroundColor: '#0f3460',
        color: '#fff',
        padding: 15,
        borderRadius: 12,
        fontSize: 18,
        marginBottom: 15,
        textAlign: 'center',
    },
    speakButton: {
        backgroundColor: '#4ade80',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    stopButton: {
        backgroundColor: '#f87171',
    },
    speakButtonText: {
        color: '#1a1a2e',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
