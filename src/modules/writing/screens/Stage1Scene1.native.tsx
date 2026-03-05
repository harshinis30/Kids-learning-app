/**
 * Stage1Scene1.native.tsx — "Help Milo Move" · Level 1 (iOS + Android)
 * Writing Module · Level 1 · 5 Sequential Story Moments
 *
 * Story moments (Level 1 only):
 *  Scene 0 – Milo Climbs the Tree    (Vertical stroke   ↑)
 *  Scene 1 – Milo Swings on a Vine   (Curve stroke)
 *  Scene 2 – Milo Crosses the Bridge (Horizontal stroke →)
 *  Scene 3 – Milo Walks the Cave     (Dot-to-dot tracing)
 *  Scene 4 – Milo Slides Down Hill   (Diagonal stroke   ↘)
 *
 * Architecture:
 *  - Scene configs   → SCENES constant below
 *  - Accuracy math   → utils/accuracy.js
 *  - Feedback/gates  → utils/scoring.js
 *  - Path waypoints  → data/expectedPaths.json
 *
 * Performance rules:
 *  - useRef for drawing points (no re-render per frame)
 *  - useSharedValue for Milo position (Reanimated worklet)
 *  - Score computed only on finger lift (onEnd)
 *  - Skia canvas draws without React re-renders mid-stroke
 */

import {
  Canvas,
  Circle,
  Rect,
  Skia,
  Path as SkiaPath
} from '@shopify/react-native-skia';
import { useAudioPlayer } from 'expo-audio';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import expectedPathsData from '../data/expectedPaths.json';
import { computeAccuracy } from '../utils/accuracy.js';
import { canProgress, getFeedback } from '../utils/scoring.js';

import { router } from 'expo-router';

// ── Screen dimensions ─────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('window');
const DIMS = { width: W, height: H };

// ── Milo ──────────────────────────────────────────────────────────────────────

const MILO_SIZE = 44;

// ── Trail colours (cycle on retry) ───────────────────────────────────────────

const TRAIL_COLORS = ['#FF6B6B', '#FFE066', '#4ECDC4', '#FF9F43', '#A29BFE'];

// ── Scene Configurations ──────────────────────────────────────────────────────

type StrokeType = 'vertical' | 'curve' | 'horizontal' | 'dot-to-dot' | 'diagonal';

interface SceneConfig {
  key: keyof typeof expectedPathsData;
  title: string;
  hint: string;
  strokeType: StrokeType;
  /** Milo's start position (normalized) */
  miloStartNorm: { x: number; y: number };
  /** Where Milo jumps when success (normalized) */
  miloEndNorm: { x: number; y: number };
}

const SCENES: SceneConfig[] = [
  {
    key: 'tree_climb',
    title: '🌳 Milo Climbs the Tree',
    hint: '☝️ Drag UP to help Milo climb!',
    strokeType: 'vertical',
    miloStartNorm: { x: 0.5, y: 0.78 },
    miloEndNorm: { x: 0.5, y: 0.15 },
  },
  {
    key: 'vine_swing',
    title: '🌿 Milo Swings on the Vine',
    hint: '〜 Trace the swinging arc!',
    strokeType: 'curve',
    miloStartNorm: { x: 0.2, y: 0.25 },
    miloEndNorm: { x: 0.8, y: 0.25 },
  },
  {
    key: 'bridge_cross',
    title: '🌉 Milo Crosses the Bridge',
    hint: '👉 Drag RIGHT across the stones!',
    strokeType: 'horizontal',
    miloStartNorm: { x: 0.1, y: 0.55 },
    miloEndNorm: { x: 0.9, y: 0.55 },
  },
  {
    key: 'cave_tunnel',
    title: '🦇 Milo Walks Through the Cave',
    hint: '✨ Follow the glowing dots!',
    strokeType: 'dot-to-dot',
    miloStartNorm: { x: 0.15, y: 0.35 },
    miloEndNorm: { x: 0.85, y: 0.40 },
  },
  {
    key: 'hill_slide',
    title: '⛰️ Milo Slides Down the Hill',
    hint: '↘ Slide diagonally downward!',
    strokeType: 'diagonal',
    miloStartNorm: { x: 0.15, y: 0.2 },
    miloEndNorm: { x: 0.85, y: 0.78 },
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type GameState = 'idle' | 'drawing' | 'success' | 'fail' | 'complete';

// ── Scene Background Renderer ─────────────────────────────────────────────────

function SceneBackground({ sceneIdx }: { sceneIdx: number }) {
  switch (sceneIdx) {
    case 0: // Tree climb — night sky, trunk, canopy
      return (
        <>
          <Rect x={0} y={0} width={W} height={H} color="#1a3a5c" />
          <Rect x={0} y={H * 0.88} width={W} height={H * 0.12} color="#2d5a27" />
          {/* Trunk */}
          <Rect x={(W - 120) / 2} y={0} width={120} height={H * 0.88} color="#6B3A2A" />
          <Rect x={(W - 120) / 2 + 12} y={0} width={18} height={H * 0.88} color="rgba(255,200,150,0.12)" />
          {/* Canopy */}
          <Circle cx={W / 2} cy={H * 0.12} r={90} color="#2d7a27" />
          <Circle cx={W / 2 - 60} cy={H * 0.16} r={65} color="#3a9e32" />
          <Circle cx={W / 2 + 60} cy={H * 0.16} r={65} color="#3a9e32" />
        </>
      );

    case 1: { // Vine swing — sky, trees, hanging vine arc
      const vinePts = expectedPathsData.vine_swing;
      const vineSkPath = Skia.Path.Make();
      vineSkPath.moveTo(vinePts[0].x * W, vinePts[0].y * H);
      // Cubic bezier through arc points
      vineSkPath.cubicTo(
        vinePts[1].x * W, vinePts[1].y * H,
        vinePts[5].x * W, vinePts[5].y * H,
        vinePts[6].x * W, vinePts[6].y * H,
      );
      return (
        <>
          {/* Sky gradient layers */}
          <Rect x={0} y={0} width={W} height={H} color="#87CEEB" />
          <Rect x={0} y={H * 0.75} width={W} height={H * 0.25} color="#3a8c32" />
          {/* Left tree */}
          <Rect x={0} y={H * 0.1} width={60} height={H * 0.65} color="#5C3A1E" />
          <Circle cx={30} cy={H * 0.1} r={55} color="#2d7a27" />
          {/* Right tree */}
          <Rect x={W - 60} y={H * 0.1} width={60} height={H * 0.65} color="#5C3A1E" />
          <Circle cx={W - 30} cy={H * 0.1} r={55} color="#2d7a27" />
          {/* Vine rope */}
          <SkiaPath
            path={vineSkPath}
            color="#5C3A1E"
            style="stroke"
            strokeWidth={6}
            strokeCap="round"
          />
          {/* Hanging knot at start */}
          <Circle cx={vinePts[0].x * W} cy={vinePts[0].y * H} r={8} color="#5C3A1E" />
        </>
      );
    }

    case 2: { // Bridge — river, stepping stones
      const stones = expectedPathsData.bridge_cross;
      return (
        <>
          <Rect x={0} y={0} width={W} height={H} color="#1a3a5c" />
          {/* River */}
          <Rect x={0} y={H * 0.45} width={W} height={H * 0.3} color="#1565C0" />
          {/* River shimmer */}
          <Rect x={W * 0.1} y={H * 0.5} width={W * 0.8} height={8} color="rgba(255,255,255,0.15)" />
          <Rect x={W * 0.2} y={H * 0.62} width={W * 0.6} height={6} color="rgba(255,255,255,0.10)" />
          {/* Ground on both sides */}
          <Rect x={0} y={H * 0.75} width={W} height={H * 0.25} color="#2d5a27" />
          <Rect x={0} y={0} width={W} height={H * 0.25} color="#2d5a27" />
          {/* Stepping stones */}
          {stones.map((pt, i) => (
            <React.Fragment key={i}>
              <Circle cx={pt.x * W} cy={pt.y * H} r={28} color="#795548" />
              <Circle cx={pt.x * W} cy={pt.y * H} r={22} color="#8D6E63" />
            </React.Fragment>
          ))}
        </>
      );
    }

    case 3: { // Cave — dark tunnel, glowing entry/exit
      const dots = expectedPathsData.cave_tunnel;
      return (
        <>
          <Rect x={0} y={0} width={W} height={H} color="#1A0A2E" />
          {/* Cave walls */}
          <Rect x={0} y={0} width={W * 0.18} height={H} color="#2E1A47" />
          <Rect x={W * 0.82} y={0} width={W * 0.18} height={H} color="#2E1A47" />
          {/* Rock texture streaks */}
          <Rect x={W * 0.05} y={H * 0.2} width={4} height={H * 0.4} color="rgba(100,80,120,0.4)" />
          <Rect x={W * 0.88} y={H * 0.3} width={4} height={H * 0.35} color="rgba(100,80,120,0.4)" />
          {/* Entry glow */}
          <Circle cx={dots[0].x * W} cy={dots[0].y * H} r={32} color="rgba(255,240,100,0.18)" />
          {/* Exit glow */}
          <Circle cx={dots[dots.length - 1].x * W} cy={dots[dots.length - 1].y * H} r={32} color="rgba(100,220,255,0.15)" />
        </>
      );
    }

    case 4: { // Hill slide — green hill, sky
      return (
        <>
          <Rect x={0} y={0} width={W} height={H} color="#87CEEB" />
          {/* Hill — large circle offset so we just see the top quarter */}
          <Circle cx={W * 0.5} cy={H * 1.5} r={H * 1.2} color="#4CAF50" />
          <Circle cx={W * 0.5} cy={H * 1.5} r={H * 1.15} color="#66BB6A" />
          {/* Sky accent */}
          <Circle cx={W * 0.8} cy={H * 0.12} r={50} color="#FFE066" />
        </>
      );
    }

    default:
      return <Rect x={0} y={0} width={W} height={H} color="#1a1a2e" />;
  }
}

// ── Guide Path Renderer ───────────────────────────────────────────────────────

function GuidePathLayer({ scene }: { scene: SceneConfig }) {
  const pts = expectedPathsData[scene.key] as Array<{ x: number; y: number }>;

  if (scene.strokeType === 'dot-to-dot') {
    // Large glowing waypoint dots
    return (
      <>
        {pts.map((pt, i) => (
          <React.Fragment key={i}>
            <Circle cx={pt.x * W} cy={pt.y * H} r={22} color="rgba(255,240,80,0.25)" />
            <Circle cx={pt.x * W} cy={pt.y * H} r={14} color="rgba(255,240,80,0.55)" />
            <Circle cx={pt.x * W} cy={pt.y * H} r={7} color="rgba(255,255,255,0.95)" />
          </React.Fragment>
        ))}
      </>
    );
  }

  if (scene.strokeType === 'curve') {
    // Smooth cubic-bezier arc path + dots
    const curvePath = Skia.Path.Make();
    curvePath.moveTo(pts[0].x * W, pts[0].y * H);
    // Use quadratic curves through midpoints for a smooth arc
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2 * W;
      const my = (pts[i].y + pts[i + 1].y) / 2 * H;
      curvePath.quadTo(pts[i].x * W, pts[i].y * H, mx, my);
    }
    curvePath.lineTo(pts[pts.length - 1].x * W, pts[pts.length - 1].y * H);
    return (
      <>
        {/* Glow halo underneath */}
        <SkiaPath
          path={curvePath}
          color="rgba(255,255,255,0.18)"
          style="stroke"
          strokeWidth={22}
          strokeCap="round"
          strokeJoin="round"
        />
        {/* Main visible guide line */}
        <SkiaPath
          path={curvePath}
          color="rgba(255,255,255,0.75)"
          style="stroke"
          strokeWidth={5}
          strokeCap="round"
          strokeJoin="round"
        />
        {pts.map((pt, i) => (
          <React.Fragment key={i}>
            <Circle cx={pt.x * W} cy={pt.y * H} r={12} color="rgba(255,255,255,0.30)" />
            <Circle cx={pt.x * W} cy={pt.y * H} r={6} color="rgba(255,255,255,0.95)" />
          </React.Fragment>
        ))}
      </>
    );
  }

  if (scene.strokeType === 'diagonal') {
    // Star markers + clearly visible diagonal guide line
    const starPath = Skia.Path.Make();
    starPath.moveTo(pts[0].x * W, pts[0].y * H);
    pts.slice(1).forEach(pt => starPath.lineTo(pt.x * W, pt.y * H));
    return (
      <>
        {/* Glow halo */}
        <SkiaPath
          path={starPath}
          color="rgba(255,230,100,0.20)"
          style="stroke"
          strokeWidth={24}
          strokeCap="round"
        />
        {/* Main guide line */}
        <SkiaPath
          path={starPath}
          color="rgba(255,230,100,0.85)"
          style="stroke"
          strokeWidth={6}
          strokeCap="round"
          strokeJoin="round"
        />
        {pts.map((pt, i) => (
          <React.Fragment key={i}>
            <Circle cx={pt.x * W} cy={pt.y * H} r={16} color="rgba(255,230,100,0.30)" />
            <Circle cx={pt.x * W} cy={pt.y * H} r={8} color="rgba(255,230,100,0.95)" />
          </React.Fragment>
        ))}
      </>
    );
  }

  // vertical / horizontal — clearly visible guide line + dots
  const linePath = Skia.Path.Make();
  linePath.moveTo(pts[0].x * W, pts[0].y * H);
  pts.slice(1).forEach(pt => linePath.lineTo(pt.x * W, pt.y * H));
  return (
    <>
      {/* Soft glow halo */}
      <SkiaPath
        path={linePath}
        color="rgba(255,255,255,0.18)"
        style="stroke"
        strokeWidth={24}
        strokeCap="round"
        strokeJoin="round"
      />
      {/* Main guide line */}
      <SkiaPath
        path={linePath}
        color="rgba(255,255,255,0.80)"
        style="stroke"
        strokeWidth={6}
        strokeCap="round"
        strokeJoin="round"
      />
      {pts.map((pt, i) => (
        <React.Fragment key={i}>
          <Circle cx={pt.x * W} cy={pt.y * H} r={12} color="rgba(255,255,255,0.30)" />
          <Circle cx={pt.x * W} cy={pt.y * H} r={6} color="rgba(255,255,255,0.95)" />
        </React.Fragment>
      ))}
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Stage1Scene1() {
  const [currentScene, setCurrentScene] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; emoji: string } | null>(null);
  const [colorIndex, setColorIndex] = useState(0);

  const scene = SCENES[currentScene];
  const expectedPath = expectedPathsData[scene.key] as Array<{ x: number; y: number }>;

  const drawnPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const skiaPathRef = useRef(Skia.Path.Make());
  const [, forceRepaint] = useState(0);
  const repaint = useCallback(() => forceRepaint(n => n + 1), []);

  const miloX = useSharedValue(scene.miloStartNorm.x * W - MILO_SIZE / 2);
  const miloY = useSharedValue(scene.miloStartNorm.y * H - MILO_SIZE / 2);

  const miloStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: miloX.value },
      { translateY: miloY.value },
    ],
  }));

  // ── Sound ───────────────────────────────────────────────────────────────────
  const player = useAudioPlayer('https://www.soundjay.com/buttons/sounds/button-09.mp3');

  const playSuccess = useCallback(() => {
    player.play();
  }, [player]);

  // ── Reset current scene ─────────────────────────────────────────────────────
  const resetScene = useCallback(() => {
    drawnPointsRef.current = [];
    skiaPathRef.current = Skia.Path.Make();
    miloX.value = withSpring(scene.miloStartNorm.x * W - MILO_SIZE / 2, { damping: 14, stiffness: 120 });
    miloY.value = withSpring(scene.miloStartNorm.y * H - MILO_SIZE / 2, { damping: 14, stiffness: 120 });
    setColorIndex(c => c + 1);
    setAccuracy(null);
    setFeedback(null);
    setGameState('idle');
    repaint();
  }, [scene, miloX, miloY, repaint]);

  // ── Advance to next scene ────────────────────────────────────────────────────
  const nextScene = useCallback(() => {
    const next = currentScene + 1;
    if (next >= SCENES.length) {
      setGameState('complete');
      return;
    }
    const nextCfg = SCENES[next];
    setCurrentScene(next);
    drawnPointsRef.current = [];
    skiaPathRef.current = Skia.Path.Make();
    miloX.value = nextCfg.miloStartNorm.x * W - MILO_SIZE / 2;
    miloY.value = nextCfg.miloStartNorm.y * H - MILO_SIZE / 2;
    setColorIndex(0);
    setAccuracy(null);
    setFeedback(null);
    setGameState('idle');
    repaint();
  }, [currentScene, miloX, miloY, repaint]);

  // ── Pan Gesture ─────────────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart((e) => {
      drawnPointsRef.current = [];
      skiaPathRef.current = Skia.Path.Make();
      skiaPathRef.current.moveTo(e.x, e.y);
      drawnPointsRef.current.push({ x: e.x / W, y: e.y / H });
      setAccuracy(null);
      setFeedback(null);
      setGameState('drawing');
    })
    .onUpdate((e) => {
      skiaPathRef.current.lineTo(e.x, e.y);
      drawnPointsRef.current.push({ x: e.x / W, y: e.y / H });

      // Milo follows finger — axis depends on stroke type
      switch (scene.strokeType) {
        case 'vertical':
          miloX.value = withSpring(scene.miloStartNorm.x * W - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
          miloY.value = withSpring(e.y - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
          break;
        case 'horizontal':
          miloX.value = withSpring(e.x - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
          miloY.value = withSpring(scene.miloStartNorm.y * H - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
          break;
        default:
          miloX.value = withSpring(e.x - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
          miloY.value = withSpring(e.y - MILO_SIZE / 2, { damping: 20, stiffness: 200 });
      }
      repaint();
    })
    .onEnd(() => {
      // ── Accuracy (from accuracy.js) ───
      const acc = computeAccuracy(drawnPointsRef.current, expectedPath, DIMS);
      // ── Feedback (from scoring.js) ────
      const fb = getFeedback(acc);
      const progresses = canProgress(acc);

      setAccuracy(acc);
      setFeedback(fb);

      if (progresses) {
        // Animate Milo to end position
        miloX.value = withSpring(scene.miloEndNorm.x * W - MILO_SIZE / 2, { damping: 12, stiffness: 100 });
        miloY.value = withSpring(scene.miloEndNorm.y * H - MILO_SIZE / 2, { damping: 12, stiffness: 100 });
        setGameState('success');
        playSuccess();
      } else {
        setGameState('fail');
      }
    });

  const strokeColor = TRAIL_COLORS[colorIndex % TRAIL_COLORS.length];

  // ── Level 1 Complete screen ─────────────────────────────────────────────────
  if (gameState === 'complete') {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaView style={[styles.safe, styles.completeBg]}>
          <View style={styles.completeContainer}>
            <Text style={styles.completeEmoji}>🎊</Text>
            <Text style={styles.completeTitle}>Level 1 Complete!</Text>
            <Text style={styles.completeSubtitle}>You helped Milo through every adventure!</Text>
            <View style={styles.sceneList}>
              {SCENES.map((s, i) => (
                <Text key={i} style={styles.sceneListItem}>✅  {s.title}</Text>
              ))}
            </View>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setCurrentScene(0);
                miloX.value = SCENES[0].miloStartNorm.x * W - MILO_SIZE / 2;
                miloY.value = SCENES[0].miloStartNorm.y * H - MILO_SIZE / 2;
                setAccuracy(null);
                setFeedback(null);
                setColorIndex(0);
                drawnPointsRef.current = [];
                skiaPathRef.current = Skia.Path.Make();
                setGameState('idle');
              }}
            >
              <Text style={styles.retryBtnText}>Play Again 🔁</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.retryBtn} onPress={() => router.push('/writing-stage2')}>
              <Text style={styles.retryBtnText}>Continue to Stage 2 ➡️</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // ── Main Game Screen ────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{scene.title}</Text>
          <View style={styles.progressRow}>
            {SCENES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i === currentScene && styles.progressDotActive,
                  i < currentScene && styles.progressDotDone,
                ]}
              />
            ))}
          </View>
        </View>

        <GestureDetector gesture={panGesture}>
          <View style={styles.canvasWrapper}>
            <Canvas style={StyleSheet.absoluteFill}>
              {/* Scene background */}
              <SceneBackground sceneIdx={currentScene} />

              {/* Guide path */}
              <GuidePathLayer scene={scene} />

              {/* Drawing trail */}
              {(gameState === 'drawing' || gameState === 'success' || gameState === 'fail') && (
                <SkiaPath
                  path={skiaPathRef.current}
                  color={strokeColor}
                  style="stroke"
                  strokeWidth={8}
                  strokeCap="round"
                  strokeJoin="round"
                />
              )}
            </Canvas>

            {/* Milo */}
            <Animated.View style={[styles.milo, miloStyle]} pointerEvents="none">
              <Text style={styles.miloEmoji}>🐒</Text>
            </Animated.View>

            {/* Idle hint */}
            {gameState === 'idle' && (
              <View style={styles.hintBanner} pointerEvents="none">
                <Text style={styles.hintText}>{scene.hint}</Text>
              </View>
            )}

            {/* Success overlay */}
            {gameState === 'success' && feedback && (
              <View style={styles.overlay}>
                <Text style={styles.overlayEmoji}>{feedback.emoji}</Text>
                <Text style={styles.overlayTitle}>{feedback.message}</Text>
                {accuracy !== null && (
                  <View style={styles.accuracyBadge}>
                    <Text style={styles.accuracyText}>Accuracy: {accuracy}%</Text>
                  </View>
                )}
                {currentScene < SCENES.length - 1 ? (
                  <TouchableOpacity style={styles.nextBtn} onPress={nextScene}>
                    <Text style={styles.retryBtnText}>Next Scene →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.nextBtn} onPress={nextScene}>
                    <Text style={styles.retryBtnText}>Finish Level 🎊</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.retryBtn, styles.retryBtnAlt]} onPress={resetScene}>
                  <Text style={styles.retryBtnTextSmall}>Try Again 🔁</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Fail overlay */}
            {gameState === 'fail' && feedback && (
              <View style={styles.overlay}>
                <Text style={styles.overlayEmoji}>{feedback.emoji}</Text>
                <Text style={styles.overlayTitle}>{feedback.message}</Text>
                {accuracy !== null && (
                  <View style={[styles.accuracyBadge, styles.accuracyBadgeFail]}>
                    <Text style={styles.accuracyText}>Accuracy: {accuracy}%</Text>
                  </View>
                )}
                <Text style={styles.needScoreText}>Need 60% to advance</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={resetScene}>
                  <Text style={styles.retryBtnText}>Try Again 🔁</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </GestureDetector>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1a2e' },
  safe: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(26,26,46,0.95)',
    zIndex: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFE066', letterSpacing: 0.5 },
  progressRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  progressDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressDotActive: { backgroundColor: '#FFE066', transform: [{ scale: 1.3 }] },
  progressDotDone: { backgroundColor: '#4ECDC4' },

  // Canvas
  canvasWrapper: { flex: 1, position: 'relative', overflow: 'hidden' },

  // Milo
  milo: {
    position: 'absolute',
    width: MILO_SIZE,
    height: MILO_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miloEmoji: { fontSize: 40 },

  // Overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  overlayEmoji: { fontSize: 72 },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFE066',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Accuracy badge
  accuracyBadge: {
    backgroundColor: 'rgba(78,205,196,0.25)',
    borderWidth: 1.5,
    borderColor: '#4ECDC4',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
  },
  accuracyBadgeFail: {
    backgroundColor: 'rgba(255,107,107,0.18)',
    borderColor: '#FF6B6B',
  },
  accuracyText: { fontSize: 20, fontWeight: '800', color: '#fff' },

  needScoreText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },

  // Buttons
  nextBtn: {
    backgroundColor: '#FFE066',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 50,
    shadowColor: '#FFE066',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  retryBtn: {
    backgroundColor: '#FFE066',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 50,
    shadowColor: '#FFE066',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  retryBtnAlt: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  retryBtnText: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' },
  retryBtnTextSmall: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },

  // Hint
  hintBanner: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  hintText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // Level Complete screen
  completeBg: { backgroundColor: '#1a1a2e' },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 32,
  },
  completeEmoji: { fontSize: 80 },
  completeTitle: { fontSize: 36, fontWeight: '900', color: '#FFE066', textAlign: 'center' },
  completeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  sceneList: { gap: 6, alignItems: 'flex-start' },
  sceneListItem: { fontSize: 15, color: '#4ECDC4', fontWeight: '700' },
});
