/**
 * MiloFeedback.tsx — Result overlay shown after evaluation
 *
 * Shown when drawingState === 'success' | 'fail'
 * Displays: emoji, message, accuracy bar, action buttons
 * Consistent across all 4 stages.
 */

import React, { useEffect, useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface MiloFeedbackProps {
  visible: boolean;
  passed: boolean;
  accuracy: number | null;
  message: string;
  emoji: string;
  /** Label for the primary action (e.g. "Next Scene →") */
  primaryLabel?: string;
  /** Label for the secondary action (e.g. "Try Again 🔁") */
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

export function MiloFeedback({
  visible,
  passed,
  accuracy,
  message,
  emoji,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: MiloFeedbackProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(emojiScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.7);
      emojiScale.setValue(0);
    }
  }, [visible, fadeAnim, scaleAnim, emojiScale]);

  if (!visible) return null;

  const accentColor = passed ? "#66BB6A" : "#FF7F6E";
  const bgColor = passed ? "rgba(102,187,106,0.12)" : "rgba(255,127,110,0.12)";

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: bgColor,
            borderColor: accentColor,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Emoji */}
        <Animated.Text
          style={[styles.emoji, { transform: [{ scale: emojiScale }] }]}
        >
          {emoji}
        </Animated.Text>

        {/* Message */}
        <Text style={[styles.message, { color: accentColor }]}>{message}</Text>

        {/* Accuracy bar */}
        {accuracy !== null && (
          <View style={styles.accuracyContainer}>
            <Text style={styles.accuracyLabel}>Accuracy</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${accuracy}%` as any,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.accuracyValue, { color: accentColor }]}>
              {accuracy}%
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.btnRow}>
          {onSecondary && secondaryLabel && (
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={onSecondary}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSecondaryText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
          {onPrimary && primaryLabel && (
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnPrimary,
                { backgroundColor: accentColor },
              ]}
              onPress={onPrimary}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>{primaryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,5,20,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 2,
    padding: 28,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  emoji: {
    fontSize: 80,
  },
  message: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  accuracyContainer: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  accuracyLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  barTrack: {
    width: "100%",
    height: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  accuracyValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 50,
    minWidth: 120,
    alignItems: "center",
  },
  btnPrimary: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1a1a2e",
  },
  btnSecondary: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: "800",
    color: "rgba(255,255,255,0.8)",
  },
});
