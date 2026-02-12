import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
}

interface ParticleSystemProps {
  active?: boolean;
  color?: string;
}

export function ParticleSystem({
  active = false,
  color = "#FFD700",
}: ParticleSystemProps) {
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (active) {
      createParticleBurst();
    }
  }, [active]);

  const createParticleBurst = () => {
    const particleCount = 20;
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle: Particle = {
        id: Date.now() + i,
        x: new Animated.Value(width / 2),
        y: new Animated.Value(height * 0.7),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(1),
      };

      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 100 + Math.random() * 100;
      const targetX = width / 2 + Math.cos(angle) * velocity;
      const targetY = height * 0.7 + Math.sin(angle) * velocity;

      Animated.parallel([
        Animated.timing(particle.x, {
          toValue: targetX,
          duration: 1000 + Math.random() * 500,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: targetY,
          duration: 1000 + Math.random() * 500,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      newParticles.push(particle);
    }

    particlesRef.current = newParticles;
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {particlesRef.current.map((particle) => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              backgroundColor: color,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale },
              ],
              opacity: particle.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
