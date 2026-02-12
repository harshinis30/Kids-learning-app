import React, { useEffect, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

interface StoryOverlayProps {
  currentScene:
    | "solar-system"
    | "rocket-malfunction"
    | "crash-landing"
    | "ziblo-emerges"
    | "complete";
}

export function StoryOverlay({ currentScene }: StoryOverlayProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [currentText, setCurrentText] = useState("");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    let text = "";
    let sub = "";

    switch (currentScene) {
      case "solar-system":
        text = "In a distant galaxy...";
        sub = "The planet Lexiconia shines bright";
        break;
      case "rocket-malfunction":
        text = "⚠️ System Malfunction!";
        sub = "Ziblo's rocket is in trouble";
        break;
      case "crash-landing":
        text = "Emergency Landing!";
        sub = "Approaching unknown planet...";
        break;
      case "ziblo-emerges":
        text = '"My planet Lexiconia is fading..."';
        sub = '"I need your help!"';
        break;
      case "complete":
        text = "";
        sub = "";
        break;
    }

    setCurrentText(text);
    setSubtitle(sub);

    // Fade in animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentScene]);

  if (currentScene === "complete" || !currentText) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
        <Text style={styles.mainText}>{currentText}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </Animated.View>

      {currentScene === "ziblo-emerges" && (
        <Animated.View style={[styles.bottomContainer, { opacity: fadeAnim }]}>
          <Text style={styles.glowText}>
            ✨ When spoken correctly, words glow ✨
          </Text>
          <Text style={styles.glowText}>
            🏗️ When written properly, they build worlds 🏗️
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingVertical: height * 0.1,
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  mainText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    textShadowColor: "rgba(255, 215, 0, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    fontStyle: "italic",
  },
  bottomContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  glowText: {
    fontSize: 16,
    color: "#E0E0FF",
    textAlign: "center",
    textShadowColor: "rgba(255, 255, 255, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginVertical: 6,
    fontWeight: "600",
  },
});
