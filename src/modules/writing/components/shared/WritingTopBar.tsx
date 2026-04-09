/**
 * WritingTopBar.tsx — Standardized top bar for all Writing Module stages
 *
 * Renders:
 *  - Back/home button (left)
 *  - Activity title (center)
 *  - Optional progress dots (below title)
 */

import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface WritingTopBarProps {
  title: string;
  /** Total number of steps/scenes */
  totalSteps?: number;
  /** Current step index (0-based) */
  currentStep?: number;
  /** Override back navigation */
  onBack?: () => void;
  /** Back destination route */
  backRoute?: string;
}

export function WritingTopBar({
  title,
  totalSteps,
  currentStep = 0,
  onBack,
  backRoute = "/writing",
}: WritingTopBarProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(backRoute as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backIcon}>🏠</Text>
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>

        {/* Spacer to balance the back button */}
        <View style={styles.spacer} />
      </View>

      {totalSteps !== undefined && totalSteps > 1 && (
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentStep && styles.dotActive,
                i < currentStep && styles.dotDone,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(26,26,46,0.97)",
    paddingTop: 44,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    alignItems: "flex-start",
  },
  backIcon: {
    fontSize: 22,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: "#FFE066",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  spacer: {
    width: 40,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: "#FFE066",
    borderColor: "#FFE066",
    transform: [{ scale: 1.3 }],
  },
  dotDone: {
    backgroundColor: "#4ECDC4",
    borderColor: "#4ECDC4",
  },
});
