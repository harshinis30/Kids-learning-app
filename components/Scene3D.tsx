import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LipSyncAnimation } from '../services/lipSyncService';
import { Character3D } from './Character3D';

interface Scene3DProps {
    isAnimating?: boolean;
    animationType?: 'idle' | 'speaking' | 'celebrating' | 'encouraging';
    lipSyncAnimation?: LipSyncAnimation | null;
    currentAnimationTime?: number;
    width?: number;
    height?: number;
}

export function Scene3D({
    isAnimating,
    animationType,
    lipSyncAnimation,
    currentAnimationTime,
    width,
    height,
}: Scene3DProps) {
    return (
        <View style={[styles.container, width && height ? { width, height } : {}]}>
            <Character3D
                isAnimating={isAnimating}
                animationType={animationType}
                lipSyncAnimation={lipSyncAnimation}
                currentAnimationTime={currentAnimationTime}
                width={width}
                height={height}
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
