/**
 * WritingCanvas.tsx — Standardized drawing canvas for all Writing Module stages
 *
 * Wraps GestureDetector + SVG overlay.
 * Connects to useDrawing hook via onTouchStart/Move/End callbacks.
 * Renders: guide path, user stroke trail, start/end markers, traveling dot.
 */

import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import Svg, { Circle, G, Path } from "react-native-svg";
import { DrawingState } from "../../hooks/useDrawing";

interface WritingCanvasProps {
  /** Normalized expected path points (0-1) */
  expectedPath: Array<{ x: number; y: number }>;
  /** SVG path string of user's drawn stroke */
  drawnPathD: string;
  /** Current drawing state */
  drawingState: DrawingState;
  /** Stroke color for user trail */
  strokeColor?: string;
  /** Whether to show the guide path */
  showGuidePath?: boolean;
  /** Whether to show start/end markers */
  showMarkers?: boolean;
  /** Whether to show the traveling dot guide */
  showTravelingDot?: boolean;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Touch handlers from useDrawing */
  onTouchStart: (x: number, y: number) => void;
  onTouchMove: (x: number, y: number) => void;
  onTouchEnd: () => void;
  /** Optional children rendered inside the SVG (e.g. scene backgrounds) */
  children?: React.ReactNode;
}

function buildSvgPath(
  pts: Array<{ x: number; y: number }>,
  W: number,
  H: number,
  smooth = false,
): string {
  if (!pts || pts.length < 2) return "";
  if (!smooth) {
    return pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x * W} ${p.y * H}`)
      .join(" ");
  }
  // Smooth catmull-rom-like path
  let d = `M ${pts[0].x * W} ${pts[0].y * H}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = ((pts[i].x + pts[i + 1].x) / 2) * W;
    const my = ((pts[i].y + pts[i + 1].y) / 2) * H;
    d += ` Q ${pts[i].x * W} ${pts[i].y * H} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x * W} ${last.y * H}`;
  return d;
}

function TravelingDot({
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
    if (!isIdle || expectedPath.length < 2) return;
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

  if (!isIdle || expectedPath.length < 2 || !visible) return null;

  // Interpolate position along path
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
    <G>
      <Circle cx={posX} cy={posY} r={22} fill="rgba(255,235,59,0.35)" />
      <Circle cx={posX} cy={posY} r={14} fill="rgba(255,255,255,0.9)" />
      <Circle cx={posX} cy={posY} r={6} fill="#FFE066" />
    </G>
  );
}

export function WritingCanvas({
  expectedPath,
  drawnPathD,
  drawingState,
  strokeColor = "#FF6B6B",
  showGuidePath = true,
  showMarkers = true,
  showTravelingDot = true,
  width: W,
  height: H,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  children,
}: WritingCanvasProps) {
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart((e) => onTouchStart(e.x, e.y))
    .onUpdate((e) => onTouchMove(e.x, e.y))
    .onEnd(() => onTouchEnd());

  const guidePathD = buildSvgPath(expectedPath, W, H, true);
  const isIdle = drawingState === "idle";
  const hasStroke = drawnPathD.length > 0;

  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={panGesture}>
        <View style={[styles.canvas, { width: W, height: H }]}>
          <Svg style={StyleSheet.absoluteFill} width={W} height={H}>
            {/* Scene background children */}
            {children}

            {/* Guide path */}
            {showGuidePath && guidePathD ? (
              <G>
                {/* Outer glow */}
                <Path
                  d={guidePathD}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={28}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray="12 10"
                />
                {/* Dashed guide line */}
                <Path
                  d={guidePathD}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray="12 10"
                />
              </G>
            ) : null}

            {/* Start/end markers */}
            {showMarkers && expectedPath.length >= 2 && (
              <G>
                {/* Start dot — green */}
                <Circle
                  cx={expectedPath[0].x * W}
                  cy={expectedPath[0].y * H}
                  r={14}
                  fill="rgba(78,205,196,0.3)"
                />
                <Circle
                  cx={expectedPath[0].x * W}
                  cy={expectedPath[0].y * H}
                  r={8}
                  fill="#4ECDC4"
                />
                {/* End dot — gold */}
                <Circle
                  cx={expectedPath[expectedPath.length - 1].x * W}
                  cy={expectedPath[expectedPath.length - 1].y * H}
                  r={14}
                  fill="rgba(255,224,102,0.3)"
                />
                <Circle
                  cx={expectedPath[expectedPath.length - 1].x * W}
                  cy={expectedPath[expectedPath.length - 1].y * H}
                  r={8}
                  fill="#FFE066"
                />
              </G>
            )}

            {/* User stroke trail */}
            {hasStroke && (
              <G>
                {/* Outer glow */}
                <Path
                  d={drawnPathD}
                  stroke={strokeColor}
                  strokeWidth={32}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.3}
                />
                {/* Core stroke */}
                <Path
                  d={drawnPathD}
                  stroke={strokeColor}
                  strokeWidth={16}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {/* White center highlight */}
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

            {/* Traveling dot guide (idle only) */}
            {showTravelingDot && (
              <TravelingDot
                expectedPath={expectedPath}
                isIdle={isIdle}
                W={W}
                H={H}
              />
            )}
          </Svg>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvas: { flex: 1, overflow: "hidden" },
});
