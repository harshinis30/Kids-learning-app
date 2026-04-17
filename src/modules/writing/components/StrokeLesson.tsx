/**
 * StrokeLesson.tsx — Core drawing canvas component (refactored)
 *
 * Now uses useDrawing hook for 25-second inactivity evaluation.
 * Fully backward-compatible with all existing callers (Stage 1–4).
 *
 * Key change: evaluation no longer fires on touch end.
 * Instead, a 25s inactivity timer triggers evaluation.
 * Drawing resumes seamlessly if the user touches again before timer ends.
 */

import { useAudioPlayer } from "expo-audio";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated as RNAnimated,
    StyleSheet,
    Text,
    View,
    useWindowDimensions
} from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import Svg, { Circle, G, Path } from "react-native-svg";
import { useDrawing } from "../hooks/useDrawing";
import { MiloFeedback } from "./shared/MiloFeedback";
import { TouchableOpacity } from "react-native";

const MILO_SIZE = 44;

export type GameState = "idle" | "drawing" | "success" | "fail" | "complete";

// ── Traveling dot guide ────────────────────────────────────────────────────────

function TravelingDotGuide({
  expectedPath,
  isIdle,
  W,
  H,
}: {
  expectedPath: Array<{ x: number; y: number }>;
  isIdle: boolean;
  W: number;
  H: number;
}) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isIdle || !expectedPath || expectedPath.length < 2) return;
    let t = 0;
    const interval = setInterval(() => {
      t += 0.02;
      if (t > 1.3) {
        t = 0;
        setVisible(false);
        setTimeout(() => setVisible(true), 200);
      }
      setProgress(Math.min(t, 1));
    }, 50);
    return () => clearInterval(interval);
  }, [isIdle, expectedPath]);

  if (!isIdle || !expectedPath || expectedPath.length < 2 || !visible)
    return null;

  const distances: number[] = [0];
  let totalDist = 0;
  for (let i = 1; i < expectedPath.length; i++) {
    const dx = (expectedPath[i].x - expectedPath[i - 1].x) * W;
    const dy = (expectedPath[i].y - expectedPath[i - 1].y) * H;
    totalDist += Math.sqrt(dx * dx + dy * dy);
    distances.push(totalDist);
  }

  const targetDist = progress * totalDist;
  let posX = expectedPath[0].x * W;
  let posY = expectedPath[0].y * H;

  for (let i = 1; i < expectedPath.length; i++) {
    if (distances[i] >= targetDist) {
      const segLen = distances[i] - distances[i - 1];
      const segProgress =
        segLen > 0 ? (targetDist - distances[i - 1]) / segLen : 0;
      posX =
        (expectedPath[i - 1].x +
          (expectedPath[i].x - expectedPath[i - 1].x) * segProgress) *
        W;
      posY =
        (expectedPath[i - 1].y +
          (expectedPath[i].y - expectedPath[i - 1].y) * segProgress) *
        H;
      break;
    }
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: posX - 28,
        top: posY - 28,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255, 235, 59, 0.4)",
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.6)",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#FFE066",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 10,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "#FFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 20 }}>☝️</Text>
      </View>
    </View>
  );
}

// ── Exported helper (used by AlphabetTracer) ──────────────────────────────────

export function getSvgPathFromPoints(
  pts: Array<{ x: number; y: number }>,
  makeCurve: boolean = false,
  W: number,
  H: number
) {
  if (!pts || pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x * W} ${pts[0].y * H}`;

  let d = `M ${pts[0].x * W} ${pts[0].y * H}`;
  if (makeCurve && pts.length > 2) {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = ((pts[i].x + pts[i + 1].x) / 2) * W;
      const my = ((pts[i].y + pts[i + 1].y) / 2) * H;
      d += ` Q ${pts[i].x * W} ${pts[i].y * H} ${mx} ${my}`;
    }
    d += ` L ${pts[pts.length - 1].x * W} ${pts[pts.length - 1].y * H}`;
  } else {
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x * W} ${pts[i].y * H}`;
    }
  }
  return d;
}

function StartEndMarkers({
  expectedPath,
  W,
  H,
}: {
  expectedPath: Array<{ x: number; y: number }>;
  W: number;
  H: number;
}) {
  if (!expectedPath || expectedPath.length < 2) return null;
  const s = expectedPath[0];
  const e = expectedPath[expectedPath.length - 1];
  return (
    <G>
      <Circle cx={s.x * W} cy={s.y * H} r={28} fill="rgba(76,217,100,0.15)" />
      <Circle
        cx={s.x * W}
        cy={s.y * H}
        r={20}
        fill="rgba(76,217,100,0.4)"
        stroke="#FFF"
        strokeWidth={2}
      />
      <Circle cx={s.x * W} cy={s.y * H} r={10} fill="#4CD964" />
      <Circle
        cx={s.x * W - 4}
        cy={s.y * H - 4}
        r={3}
        fill="#FFF"
        opacity={0.7}
      />
      <Circle cx={e.x * W} cy={e.y * H} r={24} fill="rgba(255,107,107,0.15)" />
      <Circle
        cx={e.x * W}
        cy={e.y * H}
        r={16}
        fill="rgba(255,107,107,0.4)"
        stroke="#FFF"
        strokeWidth={2}
      />
      <Circle cx={e.x * W} cy={e.y * H} r={6} fill="#FF6B6B" />
    </G>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface StrokeLessonProps {
  title?: string;
  hint?: string;
  expectedPath: Array<{ x: number; y: number }>;
  strokeColor?: string;
  strokeType?:
    | "vertical"
    | "horizontal"
    | "curve"
    | "diagonal"
    | "dot-to-dot"
    | "free";
  toleranceMultiplier?: number;
  miloStartNorm?: { x: number; y: number };
  miloEndNorm?: { x: number; y: number };
  onNext?: (accuracy: number | null) => void;
  onFail?: () => void;
  hideMilo?: boolean;
  hideTrail?: boolean;
  hideHeader?: boolean;
  hideOverlays?: boolean;
  children?: (props: {
    drawnPoints: Array<{ x: number; y: number }>;
    gameState: GameState;
    accuracy: number | null;
    W: number;
    H: number;
  }) => React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StrokeLesson({
  title,
  hint,
  expectedPath,
  strokeColor = "#FF6B6B",
  strokeType = "free",
  toleranceMultiplier = 1.0,
  miloStartNorm,
  miloEndNorm,
  onNext,
  onFail,
  children,
  hideMilo,
  hideTrail,
  hideHeader,
  hideOverlays,
}: StrokeLessonProps) {
  // We use local state for exact canvas dimensions to avoid clipping under the header!
  const [canvasDim, setCanvasDim] = useState({ W: 0, H: 0 });
  const { W, H } = canvasDim;

  // ── Drawing hook (30s global timer) ────────────────────────────────────────
  const {
    drawingState,
    drawnPoints,
    drawnPathD,
    accuracy,
    feedback,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    reset: resetDrawing,
    forceEvaluate,
  } = useDrawing({
    expectedPath,
    toleranceMultiplier,
    W: canvasDim.W > 0 ? canvasDim.W : undefined,
    H: canvasDim.H > 0 ? canvasDim.H : undefined,
    onSuccess: ({ accuracy: acc }) => {
      if (miloEndNorm) {
        miloX.value = withSpring(miloEndNorm.x * W - MILO_SIZE / 2, {
          damping: 12,
          stiffness: 100,
        });
        miloY.value = withSpring(miloEndNorm.y * H - MILO_SIZE / 2, {
          damping: 12,
          stiffness: 100,
        });
      }
      playSuccess();
    },
    onFail: () => {
      playSad();
      if (onFail) onFail();
    },
  });

  const [globalCountdown, setGlobalCountdown] = useState(30);
  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGlobalTimer = useCallback(() => {
    if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    setGlobalCountdown(30);
    globalTimerRef.current = setInterval(() => {
      setGlobalCountdown((prev) => {
        if (prev <= 1) {
          if (globalTimerRef.current) clearInterval(globalTimerRef.current);
          forceEvaluate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [forceEvaluate]);

  useEffect(() => {
    return () => {
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    };
  }, []);

  // Map DrawingState → legacy GameState for backward compat with children prop
  const gameState: GameState = (() => {
    switch (drawingState) {
      case "idle":
        return "idle";
      case "drawing":
        return "drawing";
      case "evaluating":
        return "drawing";
      case "success":
        return "success";
      case "fail":
        return "fail";
      case "complete":
        return "complete";
    }
  })();

  // ── Milo position ──────────────────────────────────────────────────────────
  const initMiloX = miloStartNorm ? miloStartNorm.x * W - MILO_SIZE / 2 : 0;
  const initMiloY = miloStartNorm ? miloStartNorm.y * H - MILO_SIZE / 2 : 0;

  const miloX = useSharedValue(initMiloX);
  const miloY = useSharedValue(initMiloY);

  const miloStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: miloX.value }, { translateY: miloY.value }],
    opacity: hideMilo ? 0 : 1,
  }));

  // ── Idle bobbing ───────────────────────────────────────────────────────────
  const [bobAnim] = useState(new RNAnimated.Value(0));
  useEffect(() => {
    if (gameState === "idle") {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(bobAnim, {
            toValue: -15,
            duration: 800,
            useNativeDriver: true,
          }),
          RNAnimated.timing(bobAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      bobAnim.stopAnimation();
      RNAnimated.spring(bobAnim, {
        toValue: 0,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [gameState, bobAnim]);

  // ── Audio ──────────────────────────────────────────────────────────────────
  const successSound = useAudioPlayer(require("../../../../assets/writing_module_sounds/hip hip hurray.mp3"));
  const sadSound = useAudioPlayer(require("../../../../assets/writing_module_sounds/sad.mp3"));

  const playSuccess = useCallback(() => {
    try {
      successSound.play();
    } catch (_) {}
  }, [successSound]);

  const playSad = useCallback(() => {
    try {
      sadSound.play();
    } catch (_) {}
  }, [sadSound]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetScene = useCallback(() => {
    resetDrawing();
    miloX.value = withSpring(initMiloX, { damping: 14, stiffness: 120 });
    miloY.value = withSpring(initMiloY, { damping: 14, stiffness: 120 });
    startGlobalTimer();
  }, [resetDrawing, initMiloX, initMiloY, miloX, miloY, startGlobalTimer]);

  // ── Gesture — moves Milo with finger ──────────────────────────────────────
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart((e) => {
      handleTouchStart(e.x, e.y);
    })
    .onUpdate((e) => {
      handleTouchMove(e.x, e.y);

      if (miloStartNorm && miloEndNorm) {
        switch (strokeType) {
          case "vertical":
            miloX.value = withSpring(miloStartNorm.x * W - MILO_SIZE / 2, {
              damping: 20,
              stiffness: 200,
            });
            miloY.value = withSpring(e.y - MILO_SIZE / 2, {
              damping: 20,
              stiffness: 200,
            });
            break;
          case "horizontal":
            miloX.value = withSpring(e.x - MILO_SIZE / 2, {
              damping: 20,
              stiffness: 200,
            });
            miloY.value = withSpring(miloStartNorm.y * H - MILO_SIZE / 2, {
              damping: 20,
              stiffness: 200,
            });
            break;
          default:
            miloX.value = withSpring(e.x - MILO_SIZE / 2, {
              damping: 20,
              stiffness: 200,
            });
            miloY.value = withSpring(e.y - MILO_SIZE / 2, {
              damping: 20,
              stiffness: 200,
            });
        }
      } else {
        miloX.value = withSpring(e.x - MILO_SIZE / 2, {
          damping: 20,
          stiffness: 200,
        });
        miloY.value = withSpring(e.y - MILO_SIZE / 2, {
          damping: 20,
          stiffness: 200,
        });
      }
    })
    .onEnd(() => {
      handleTouchEnd();
    });

  return (
    <GestureHandlerRootView style={styles.root}>
      {!hideHeader && title && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      )}

      <GestureDetector gesture={panGesture}>
        <View
          style={styles.canvasWrapper}
          onLayout={(e) =>
            setCanvasDim({
              W: e.nativeEvent.layout.width,
              H: e.nativeEvent.layout.height,
            })
          }
        >
          {W > 0 && H > 0 && (
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              {children && children({ drawnPoints, gameState, accuracy, W, H })}

              <StartEndMarkers expectedPath={expectedPath} W={W} H={H} />

            {!hideTrail && drawnPathD.length > 0 && (
              <G>
                <Path
                  d={drawnPathD}
                  stroke={strokeColor}
                  strokeWidth={32}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.3}
                />
                <Path
                  d={drawnPathD}
                  stroke={strokeColor}
                  strokeWidth={16}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <Path
                  d={drawnPathD}
                  stroke="#FFF"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.6}
                />
              </G>
            )}
            </Svg>
          )}

          {!hideMilo && (
            <Animated.View
              style={[styles.milo, miloStyle]}
              pointerEvents="none"
            >
              <RNAnimated.View style={{ transform: [{ translateY: bobAnim }] }}>
                <Text style={styles.miloEmoji}>🐒</Text>
              </RNAnimated.View>
            </Animated.View>
          )}

          <TravelingDotGuide
            expectedPath={expectedPath}
            isIdle={gameState === "idle"}
            W={W}
            H={H}
          />

          {!hideOverlays && gameState === "idle" && hint && (
            <View style={styles.hintBanner} pointerEvents="none">
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Timer & Done Button UI */}
      {gameState === "drawing" && !hideOverlays && (
        <View style={styles.timerContainer} pointerEvents="box-none">
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>⏳ {globalCountdown}s</Text>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => forceEvaluate()}>
            <Text style={styles.doneBtnText}>Done ✅</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Result overlay */}
      {!hideOverlays &&
        (gameState === "success" || gameState === "fail") &&
        feedback && (
          <MiloFeedback
            visible
            passed={gameState === "success"}
            accuracy={accuracy}
            message={feedback.message}
            emoji={feedback.emoji}
            primaryLabel={
              gameState === "success"
                ? onNext
                  ? "Next Scene →"
                  : "Play Again"
                : undefined
            }
            secondaryLabel={gameState === "fail" ? "Try Again 🔁" : undefined}
            onPrimary={
              gameState === "success"
                ? onNext
                  ? () => onNext(accuracy)
                  : resetScene
                : undefined
            }
            onSecondary={gameState === "fail" ? resetScene : undefined}
          />
        )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1a1a2e" },
  header: {
    padding: 12,
    alignItems: "center",
    backgroundColor: "rgba(26,26,46,0.95)",
    zIndex: 10,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFE066",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  canvasWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    touchAction: "none" as any,
  },
  milo: {
    position: "absolute",
    width: MILO_SIZE,
    height: MILO_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  miloEmoji: {
    fontSize: 55,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 6,
  },
  hintBanner: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  timerContainer: {
    position: "absolute",
    top: 90,
    right: 20,
    alignItems: "flex-end",
    gap: 12,
  },
  timerBadge: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  timerText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFF",
  },
  doneBtn: {
    backgroundColor: "#4CD964",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#4CD964",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },
  doneBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
  },
});
