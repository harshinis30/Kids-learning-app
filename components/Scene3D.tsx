import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LipSyncAnimation } from '../services/lipSyncService';
import { Character3D } from './Character3D';

interface Scene3DProps {
    isAnimating?: boolean;
    animationType?: 'idle' | 'speaking' | 'celebrating' | 'encouraging';
    lipSyncAnimation?: LipSyncAnimation | null;
    currentAnimationTime?: number;
}

export function Scene3D({
    isAnimating,
    animationType,
    lipSyncAnimation,
    currentAnimationTime
}: Scene3DProps) {
    return (
        <View style={styles.container}>
            <Character3D
                isAnimating={isAnimating}
                animationType={animationType}
                lipSyncAnimation={lipSyncAnimation}
                currentAnimationTime={currentAnimationTime}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
