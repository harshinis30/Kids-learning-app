/**
 * PauseOverlay.tsx — Shown when drawing is paused (25s inactivity timer running)
 *
 * Displays:
 *  - "Milo is waiting…" message
 *  - Countdown timer
 *  - Subtle Milo animation
 *  - "Done!" button to force-evaluate early
 *
 * Rendered as a non-blocking bottom sheet (not full-screen) so the
 * canvas remains visible and the child can resume drawing.
 */

import React, { useEffect, useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface PauseOverlayProps {
  visible: boolean;
  countdown: number; // seconds remaining
  onForceEvaluate: () => void;
  onResume?: () => void;
}

export function PauseOverlay({
  visible,
  countdown,
  onForceEvaluate,
}: PauseOverlayProps) {
  const slideAnim = useRef(new Animated.Value(120)).current;
  const miloFloat = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 120,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  // Milo floating animation
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(miloFloat, {
          toValue: -8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(miloFloat, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, miloFloat]);

  // Dot pulse animation
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, dotAnim]);

  const dotOpacity = dotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  // Countdown color: green → yellow → red
  const countdownColor =
    countdown > 15 ? "#4ECDC4" : countdown > 8 ? "#FFE066" : "#FF7F6E";

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents={visible ? "box-none" : "none"}
    >
      <View style={styles.card}>
        {/* Milo character */}
        <Animated.Text
          style={[styles.miloEmoji, { transform: [{ translateY: miloFloat }] }]}
        >
          🐒
        </Animated.Text>

        {/* Message */}
        <View style={styles.textBlock}>
          <View style={styles.waitingRow}>
            <Text style={styles.waitingText}>Milo is waiting</Text>
            <Animated.Text style={[styles.dots, { opacity: dotOpacity }]}>
              …
            </Animated.Text>
          </View>
          <Text style={styles.subText}>
            Lift your finger to check your drawing
          </Text>
        </View>

        {/* Countdown */}
        <View style={styles.countdownBadge}>
          <Text style={[styles.countdownNumber, { color: countdownColor }]}>
            {countdown}
          </Text>
          <Text style={styles.countdownLabel}>sec</Text>
        </View>

        {/* Done button */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={onForceEvaluate}
          activeOpacity={0.8}
        >
          <Text style={styles.doneBtnText}>Done! ✓</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 50,
  },
  card: {
    backgroundColor: "rgba(26,26,46,0.97)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(197,180,227,0.4)",
    shadowColor: "#C5B4E3",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  miloEmoji: {
    fontSize: 36,
  },
  textBlock: {
    flex: 1,
  },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  waitingText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#C5B4E3",
  },
  dots: {
    fontSize: 16,
    fontWeight: "800",
    color: "#C5B4E3",
  },
  subText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
    fontWeight: "600",
  },
  countdownBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  countdownNumber: {
    fontSize: 22,
    fontWeight: "900",
  },
  countdownLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "700",
    marginTop: -2,
  },
  doneBtn: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1a1a2e",
  },
});
