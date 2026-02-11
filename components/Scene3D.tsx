import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Character3D } from './Character3D';

interface Scene3DProps {
    isAnimating?: boolean;
    animationType?: 'idle' | 'speaking' | 'celebrating' | 'encouraging';
}

export function Scene3D({ isAnimating, animationType }: Scene3DProps) {
    return (
        <View style={styles.container}>
            <Character3D
                isAnimating={isAnimating}
                animationType={animationType}
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
