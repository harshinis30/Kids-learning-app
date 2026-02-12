import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { CinematicIntro } from "../components/CinematicIntro";
import { ParticleSystem } from "../components/ParticleSystem";
import { StoryOverlay } from "../components/StoryOverlay";
import { audioService } from "../services/audioService";

const { width, height } = Dimensions.get("window");

type IntroScene =
  | "solar-system"
  | "rocket-malfunction"
  | "crash-landing"
  | "ziblo-emerges"
  | "complete";

export default function LandingPage() {
  const router = useRouter();
  const [buttonScale] = useState(new Animated.Value(1));
  const [buttonGlow] = useState(new Animated.Value(1));
  const [buttonOpacity] = useState(new Animated.Value(0));
  const [isStarting, setIsStarting] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [currentScene, setCurrentScene] = useState<IntroScene>("solar-system");

  useEffect(() => {
    // Initialize audio
    audioService.initialize();
    audioService.playBackgroundMusic();

    // Track scene progression
    const sceneTimings = [
      { scene: "solar-system" as IntroScene, time: 0 },
      { scene: "rocket-malfunction" as IntroScene, time: 7000 },
      { scene: "crash-landing" as IntroScene, time: 15000 },
      { scene: "ziblo-emerges" as IntroScene, time: 20000 },
    ];

    const timers = sceneTimings.map(({ scene, time }) =>
      setTimeout(() => setCurrentScene(scene), time),
    );

    return () => {
      timers.forEach(clearTimeout);
      audioService.stopBackgroundMusic();
    };
  }, []);

  useEffect(() => {
    if (introComplete) {
      // Fade in button
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();

      // Pulsing button animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonGlow, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(buttonGlow, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [introComplete]);

  const handleIntroComplete = () => {
    setIntroComplete(true);
  };

  const handleStartMission = async () => {
    setIsStarting(true);
    setShowParticles(true);

    // Play sound effects
    await audioService.playButtonClick();
    await audioService.playJetpackGlow();

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after animation
    setTimeout(() => {
      router.push("/(tabs)/learn");
    }, 1500);
  };

  return (
    <View style={styles.container}>
      {/* 3D Cinematic Scene */}
      <View style={styles.sceneContainer}>
        <CinematicIntro
          onComplete={handleIntroComplete}
          isStarting={isStarting}
        />
      </View>

      {/* Story Text Overlay */}
      {!introComplete && <StoryOverlay currentScene={currentScene} />}

      {/* Gradient Overlay (subtle) */}
      {introComplete && (
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]}
          style={styles.gradientOverlay}
          pointerEvents="none"
        />
      )}

      {/* Particle Effects */}
      <ParticleSystem active={showParticles} color="#FF6B9D" />

      {/* Call to Action UI (appears after intro) */}
      {introComplete && (
        <Animated.View style={[styles.uiContainer, { opacity: buttonOpacity }]}>
          {/* Title Section */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Become a Language Pilot</Text>
            <Text style={styles.subtitle}>
              Learning isn't homework.{"\n"}It's saving a planet.
            </Text>
          </View>

          {/* Start Button */}
          <View style={styles.buttonContainer}>
            <Animated.View
              style={{
                transform: [
                  { scale: Animated.multiply(buttonScale, buttonGlow) },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartMission}
                activeOpacity={0.8}
                disabled={isStarting}
              >
                <LinearGradient
                  colors={["#FF6B9D", "#C44569", "#FF6B9D"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {isStarting ? "🚀 Launching..." : "✨ Start Mission"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.helperText}>Help Ziblo save Lexiconia</Text>
          </View>
        </Animated.View>
      )}

      {/* Skip Button (during intro) */}
      {!introComplete && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleIntroComplete}
        >
          <Text style={styles.skipText}>Skip Intro →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  sceneContainer: {
    position: "absolute",
    width: width,
    height: height,
  },
  gradientOverlay: {
    position: "absolute",
    width: width,
    height: height,
    bottom: 0,
  },
  uiContainer: {
    position: "absolute",
    bottom: 0,
    width: width,
    paddingBottom: height * 0.08,
  },
  titleContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    textShadowColor: "rgba(255, 215, 0, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: "#E0E0FF",
    textAlign: "center",
    lineHeight: 26,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  buttonContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  startButton: {
    borderRadius: 50,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#FF6B9D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  helperText: {
    marginTop: 16,
    fontSize: 14,
    color: "#B0B0D0",
    textAlign: "center",
    fontStyle: "italic",
  },
  skipButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  skipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
