import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface StarRatingProps {
    stars: number; // 0–3
    size?: 'small' | 'medium' | 'large';
    animate?: boolean;
}

export function StarRating({ stars, size = 'medium', animate = true }: StarRatingProps) {
    const star1 = useRef(new Animated.Value(0)).current;
    const star2 = useRef(new Animated.Value(0)).current;
    const star3 = useRef(new Animated.Value(0)).current;

    const anims = [star1, star2, star3];

    useEffect(() => {
        if (!animate) {
            anims.forEach((a, i) => a.setValue(i < stars ? 1 : 0));
            return;
        }
        // Reset
        anims.forEach(a => a.setValue(0));
        // Animate each earned star with a stagger
        const animations = Array.from({ length: stars }, (_, i) =>
            Animated.sequence([
                Animated.delay(i * 200),
                Animated.spring(anims[i], {
                    toValue: 1,
                    friction: 4,
                    tension: 60,
                    useNativeDriver: true,
                }),
            ])
        );
        Animated.parallel(animations).start();
    }, [stars]);

    const sizes = {
        small: { star: 28, gap: 4 },
        medium: { star: 44, gap: 6 },
        large: { star: 60, gap: 8 },
    };
    const { star: starSize, gap } = sizes[size];

    return (
        <View style={[styles.container, { gap }]}>
            {[0, 1, 2].map(i => {
                const earned = i < stars;
                const scale = anims[i].interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1.3, 1],
                });
                return (
                    <Animated.Text
                        key={i}
                        style={[
                            styles.star,
                            { fontSize: starSize, transform: [{ scale: earned ? scale : new Animated.Value(1) }] },
                            !earned && styles.emptyStar,
                        ]}
                    >
                        {earned ? '⭐' : '☆'}
                    </Animated.Text>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    star: {
        textShadowColor: 'rgba(255, 200, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    emptyStar: {
        opacity: 0.35,
        fontSize: 40,
        color: '#fff',
    },
});
