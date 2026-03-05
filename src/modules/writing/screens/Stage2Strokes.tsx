import { Circle, Rect, Skia, Path as SkiaPath } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import StrokeLesson from '../components/StrokeLesson';
import expectedPathsData from '../data/expectedPaths.json';

const { width: W, height: H } = Dimensions.get('window');

const STAGE2_SCENES = [
    {
        key: 'stage2_tree', title: '🌳 Build a Tree', hint: '☝️ Draw a vertical line!', strokeType: 'vertical' as const,
        miloStartNorm: { x: 0.5, y: 0.8 }, miloEndNorm: { x: 0.5, y: 0.2 },
        color: '#4CAF50'
    },
    {
        key: 'stage2_bridge', title: '🌉 Build a Bridge', hint: '👉 Draw a horizontal line!', strokeType: 'horizontal' as const,
        miloStartNorm: { x: 0.1, y: 0.5 }, miloEndNorm: { x: 0.9, y: 0.5 },
        color: '#795548'
    },
    {
        key: 'stage2_rainbow', title: '🌈 Make a Rainbow', hint: '〜 Draw a big curve!', strokeType: 'curve' as const,
        miloStartNorm: { x: 0.1, y: 0.6 }, miloEndNorm: { x: 0.9, y: 0.6 },
        color: '#FF4081'
    },
    {
        key: 'stage2_river', title: '🌊 Carve a River', hint: '〰️ Draw an S-curve!', strokeType: 'curve' as const,
        miloStartNorm: { x: 0.5, y: 0.1 }, miloEndNorm: { x: 0.5, y: 0.9 },
        color: '#03A9F4'
    },
    {
        key: 'stage2_mountain', title: '⛰️ Make a Mountain', hint: 'Draw a mountain peak!', strokeType: 'free' as const,
        miloStartNorm: { x: 0.2, y: 0.8 }, miloEndNorm: { x: 0.8, y: 0.8 },
        color: '#9E9E9E'
    },
    {
        key: 'stage2_moon', title: '🌙 Draw the Moon', hint: '☾ Draw a C-curve!', strokeType: 'curve' as const,
        miloStartNorm: { x: 0.6, y: 0.2 }, miloEndNorm: { x: 0.6, y: 0.8 },
        color: '#FFEB3B'
    }
];

function BlueprintGuide({ sceneKey }: { sceneKey: string }) {
    const pts = expectedPathsData[sceneKey as keyof typeof expectedPathsData] as Array<{ x: number, y: number }>;
    if (!pts || pts.length === 0) return null;

    const path = Skia.Path.Make();
    path.moveTo(pts[0].x * W, pts[0].y * H);
    for (let i = 1; i < pts.length; i++) {
        path.lineTo(pts[i].x * W, pts[i].y * H);
    }

    return (
        <SkiaPath
            path={path}
            color="rgba(255,255,255,0.2)"
            style="stroke"
            strokeWidth={20}
            strokeCap="round"
            strokeJoin="round"
        />
    );
}

function Scene2Foreground({ sceneIdx, progress, success }: { sceneIdx: number, progress: number, success: boolean }) {
    // when success, opacity is fully 1.0. Otherwise keep it faintly visible (0.3).
    const op = success ? 1 : Math.max(0.3, progress);

    if (sceneIdx === 0) { // Tree
        return (
            <>
                <Rect x={(W - 60) / 2} y={H * 0.2} width={60} height={H * 0.6} color={`rgba(139,69,19,${op})`} />
                <Circle cx={W / 2} cy={H * 0.2} r={80} color={`rgba(76,175,80,${op})`} />
            </>
        );
    }
    if (sceneIdx === 1) { // Bridge
        return (
            <Rect x={W * 0.1} y={H * 0.48} width={W * 0.8} height={40} color={`rgba(139,69,19,${op})`} />
        );
    }
    if (sceneIdx === 2) { // Rainbow
        const path1 = Skia.Path.Make();
        path1.moveTo(W * 0.1, H * 0.6);
        path1.quadTo(W * 0.5, H * -0.2, W * 0.9, H * 0.6);

        const path2 = Skia.Path.Make();
        path2.moveTo(W * 0.15, H * 0.6);
        path2.quadTo(W * 0.5, H * -0.1, W * 0.85, H * 0.6);

        const path3 = Skia.Path.Make();
        path3.moveTo(W * 0.2, H * 0.6);
        path3.quadTo(W * 0.5, H * 0.0, W * 0.8, H * 0.6);

        return (
            <>
                <SkiaPath path={path1} color={`rgba(255,64,129,${op})`} style="stroke" strokeWidth={20} strokeCap="round" />
                <SkiaPath path={path2} color={`rgba(255,152,0,${op})`} style="stroke" strokeWidth={20} strokeCap="round" />
                <SkiaPath path={path3} color={`rgba(255,235,59,${op})`} style="stroke" strokeWidth={20} strokeCap="round" />
            </>
        );
    }
    if (sceneIdx === 3) { // River
        const riverPath = Skia.Path.Make();
        riverPath.moveTo(W * 0.5, H * 0.1);
        riverPath.lineTo(W * 0.8, H * 0.3);
        riverPath.lineTo(W * 0.2, H * 0.6);
        riverPath.lineTo(W * 0.5, H * 0.9);
        return <SkiaPath path={riverPath} color={`rgba(3,169,244,${op})`} style="stroke" strokeWidth={60} strokeCap="round" strokeJoin="round" />;
    }
    if (sceneIdx === 4) { // Mountain
        const mountainPath = Skia.Path.Make();
        mountainPath.moveTo(W * 0.2, H * 0.8);
        mountainPath.lineTo(W * 0.5, H * 0.2);
        mountainPath.lineTo(W * 0.8, H * 0.8);
        return <SkiaPath path={mountainPath} color={`rgba(158,158,158,${op})`} style="stroke" strokeWidth={20} strokeCap="round" strokeJoin="round" />;
    }
    if (sceneIdx === 5) { // Moon
        const moonPath = Skia.Path.Make();
        moonPath.moveTo(W * 0.6, H * 0.2);
        moonPath.quadTo(W * 0.1, H * 0.5, W * 0.6, H * 0.8);
        moonPath.quadTo(W * 0.3, H * 0.5, W * 0.6, H * 0.2);
        return <SkiaPath path={moonPath} color={`rgba(255,235,59,${op})`} style="fill" />;
    }

    return null;
}

export default function Stage2Strokes() {
    const [currentScene, setCurrentScene] = useState(0);
    const [showCompletion, setShowCompletion] = useState(false);
    const [sceneAccuracies, setSceneAccuracies] = useState<number[]>([]);

    const scene = STAGE2_SCENES[currentScene];
    const expectedPath = expectedPathsData[scene.key as keyof typeof expectedPathsData] as Array<{ x: number, y: number }>;

    const handleNextScene = (acc: number | null) => {
        if (acc !== null) {
            setSceneAccuracies(prev => [...prev, acc]);
        }
        if (currentScene < STAGE2_SCENES.length - 1) {
            setCurrentScene(c => c + 1);
        } else {
            setShowCompletion(true);
        }
    };

    if (showCompletion) {
        return (
            <GestureHandlerRootView style={styles.root}>
                <SafeAreaView style={styles.safe}>
                    <View style={styles.completeContainer}>
                        <Text style={styles.completeEmoji}>🎊</Text>
                        <Text style={styles.completeTitle}>Stage 2 Complete!</Text>
                        <Text style={styles.completeSubtitle}>Milo's world is beautiful now!</Text>

                        {sceneAccuracies.length > 0 && (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 16, marginBottom: 16 }}>
                                <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>
                                    Average Score: {Math.round(sceneAccuracies.reduce((a, b) => a + b, 0) / sceneAccuracies.length)}%
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.retryBtn} onPress={() => { setCurrentScene(0); setSceneAccuracies([]); setShowCompletion(false); }}>
                            <Text style={styles.retryBtnText}>Play Again 🔁</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: '#4ECDC4', marginTop: 12 }]} onPress={() => router.push('/writing-stage3')}>
                            <Text style={styles.retryBtnText}>Continue to Stage 3 ➡️</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={styles.root}>
            <SafeAreaView style={styles.safe}>
                <StrokeLesson
                    key={scene.key}
                    title={scene.title}
                    hint={scene.hint}
                    expectedPath={expectedPath}
                    strokeType={scene.strokeType}
                    miloStartNorm={scene.miloStartNorm}
                    miloEndNorm={scene.miloEndNorm}
                    strokeColor={scene.color}
                    toleranceMultiplier={1.5} // Looser
                    onNext={(acc) => handleNextScene(acc)}
                >
                    {({ drawnPoints, gameState, accuracy }) => {
                        const progress = Math.min(drawnPoints.length / 25, 1);
                        return (
                            <>
                                <BlueprintGuide sceneKey={scene.key} />
                                <Scene2Foreground sceneIdx={currentScene} progress={progress} success={gameState === 'success'} />
                            </>
                        );
                    }}
                </StrokeLesson>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#1a1a2e' },
    safe: { flex: 1 },
    completeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
    completeEmoji: { fontSize: 80 },
    completeTitle: { fontSize: 36, fontWeight: '900', color: '#FFE066', textAlign: 'center' },
    completeSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 8 },
    retryBtn: { backgroundColor: '#FFE066', paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50 },
    retryBtnText: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' }
});
