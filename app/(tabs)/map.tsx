import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { AdventureMap } from '../../components/AdventureMap';
import { ChildProfile, profileService } from '../../services/profileService';

export default function MapScreen() {
    const [profile, setProfile] = useState<ChildProfile | null>(null);

    const load = useCallback(async () => {
        const p = await profileService.getActiveProfile();
        setProfile(p);
    }, []);

    useEffect(() => {
        load();
    }, []);

    if (!profile) {
        return (
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.loading}>
                <Text style={styles.loadingEmoji}>🗺️</Text>
                <Text style={styles.loadingText}>Loading map...</Text>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
            <SafeAreaView style={styles.safe}>
                <AdventureMap
                    profile={profile}
                    onNavigateToLearn={() => router.push('/(tabs)/learn')}
                />
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1 },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingEmoji: { fontSize: 64 },
    loadingText: { fontSize: 22, fontWeight: '700', color: '#fff' },
});
