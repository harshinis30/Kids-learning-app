/**
 * InstructionPanel.tsx — Bottom instruction area for all Writing Module stages
 *
 * Shows:
 *  - Hint text (child-friendly instruction)
 *  - Milo emoji character
 *  - State-aware messaging (idle / drawing / paused / success / fail)
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { DrawingState } from "../../hooks/useDrawing";

interface InstructionPanelProps {
  hint: string;
  drawingState: DrawingState;
  /** Optional custom message override */
  message?: string;
}

const STATE_MESSAGES: Record<DrawingState, string> = {
  idle: "",
  drawing: "✏️ Keep going!",
  paused: "⏳ Milo is waiting…",
  evaluating: "🔍 Checking your drawing…",
  success: "🎉 Amazing!",
  fail: "💪 Try again!",
  complete: "🏆 Level complete!",
};

const STATE_COLORS: Record<DrawingState, string> = {
  idle: "#FFE066",
  drawing: "#4ECDC4",
  paused: "#C5B4E3",
  evaluating: "#87CEEB",
  success: "#66BB6A",
  fail: "#FF7F6E",
  complete: "#FFD700",
};

export function InstructionPanel({
  hint,
  drawingState,
  message,
}: InstructionPanelProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevState = useRef(drawingState);

  useEffect(() => {
    if (prevState.current !== drawingState) {
      prevState.current = drawingState;
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [drawingState, fadeAnim]);

  const stateMsg = message ?? STATE_MESSAGES[drawingState];
  const color = STATE_COLORS[drawingState];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.miloRow}>
        <Text style={styles.miloEmoji}>🐒</Text>
        <View style={styles.bubble}>
          <Text style={[styles.stateText, { color }]}>{stateMsg || hint}</Text>
          {stateMsg && hint && stateMsg !== hint && (
            <Text style={styles.hintText}>{hint}</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(26,26,46,0.97)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  miloRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  miloEmoji: {
    fontSize: 40,
  },
  bubble: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  stateText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  hintText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginTop: 3,
    fontWeight: "600",
  },
});
