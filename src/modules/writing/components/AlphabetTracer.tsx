import { Skia, Path as SkiaPath } from '@shopify/react-native-skia';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import expectedPathsData from '../data/expectedPaths.json';
import StrokeLesson, { GameState } from './StrokeLesson';

const { width: W, height: H } = Dimensions.get('window');

const LETTER_STROKES: Record<string, string[]> = {
    'A': ['alpha_A_1', 'alpha_A_2', 'alpha_A_3'],
    'B': ['alpha_B_1', 'alpha_B_2', 'alpha_B_3'],
    'C': ['alpha_C_1'],
    'O': ['alpha_O_1']
};

export interface AlphabetTracerProps {
    letterId: string;
    subPhase: '4A' | '4B' | '4C';
    onLetterComplete: (mistakes: number) => void;
    onStruggle: () => void;
}

function renderGuidePath(pts: Array<{ x: number, y: number }>, style: 'full' | 'partial' | 'none', keyVal: string) {
    if (style === 'none' || !pts || pts.length === 0) return null;
    const path = Skia.Path.Make();
    path.moveTo(pts[0].x * W, pts[0].y * H);
    for (let i = 1; i < pts.length; i++) {
        path.lineTo(pts[i].x * W, pts[i].y * H);
    }

    if (style === 'partial') {
        return (
            <SkiaPath
                key={keyVal}
                path={path}
                color="rgba(255,255,255,0.4)"
                style="stroke"
                strokeWidth={10}
                strokeCap="round"
            />
        );
    }

    return (
        <SkiaPath
            key={keyVal}
            path={path}
            color="rgba(255,255,255,0.2)"
            style="stroke"
            strokeWidth={30}
            strokeCap="round"
            strokeJoin="round"
        />
    );
}

// Inner layer that reacts to gameState inside Skia Canvas child context
function TraceEffectLayer({
    gameState, drawnPoints, onStrokeSuccess
}: {
    gameState: GameState;
    drawnPoints: Array<{ x: number, y: number }>;
    onStrokeSuccess: (pts: Array<{ x: number, y: number }>) => void;
}) {
    const triggeredData = useRef<Array<{ x: number, y: number }> | null>(null);

    useEffect(() => {
        if (gameState === 'success' && drawnPoints.length > 0 && triggeredData.current !== drawnPoints) {
            triggeredData.current = drawnPoints;
            onStrokeSuccess(drawnPoints);
        } else if (gameState === 'idle') {
            triggeredData.current = null;
        }
    }, [gameState, drawnPoints, onStrokeSuccess]);
    return null;
}

export default function AlphabetTracer({ letterId, subPhase, onLetterComplete, onStruggle }: AlphabetTracerProps) {
    const [strokeIdx, setStrokeIdx] = useState(0);
    const [completedStrokes, setCompletedStrokes] = useState<any[]>([]);
    const [mistakeCount, setMistakeCount] = useState(0);
    const [localMistakes, setLocalMistakes] = useState(0);

    const strokes = LETTER_STROKES[letterId] || [];

    useEffect(() => {
        setStrokeIdx(0);
        setCompletedStrokes([]);
        setMistakeCount(0);
        setLocalMistakes(0);
    }, [letterId, subPhase]);

    if (strokeIdx >= strokes.length || strokes.length === 0) {
        return null;
    }

    const activeStrokeKey = strokes[strokeIdx];
    const expectedPath = expectedPathsData[activeStrokeKey as keyof typeof expectedPathsData];
    const tolerance = subPhase === '4A' ? 1.5 : subPhase === '4B' ? 1.0 : 0.6;
    const guideStyle = subPhase === '4A' ? 'full' : subPhase === '4B' ? 'partial' : 'none';

    const handleStrokeSuccess = (drawn: Array<{ x: number, y: number }>) => {
        const p = Skia.Path.Make();
        if (drawn.length > 0) {
            p.moveTo(drawn[0].x * W, drawn[0].y * H);
            for (let i = 1; i < drawn.length; i++) p.lineTo(drawn[i].x * W, drawn[i].y * H);
        }

        // Slight delay so child sees the success highlight before clearing/moving
        setTimeout(() => {
            setLocalMistakes(0);
            const newStrokes = [...completedStrokes, p];
            if (strokeIdx < strokes.length - 1) {
                setCompletedStrokes(newStrokes);
                setStrokeIdx(s => s + 1);
            } else {
                onLetterComplete(mistakeCount);
            }
        }, 1000);
    };

    const handleStrokeFail = () => {
        setMistakeCount(m => m + 1);
        setLocalMistakes(l => {
            const n = l + 1;
            if (n >= 3) {
                setTimeout(() => onStruggle(), 0);
                return 0; // reset
            }
            return n;
        });
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            {subPhase === '4C' && (
                <View style={styles.refContainer} pointerEvents="none">
                    <Text style={styles.refText}>{letterId}</Text>
                </View>
            )}
            <StrokeLesson
                key={activeStrokeKey + subPhase}
                expectedPath={expectedPath as Array<{ x: number, y: number }>}
                toleranceMultiplier={tolerance}
                hideOverlays={true}
                hideHeader={true}
                hideMilo={false}
                onFail={handleStrokeFail}
            >
                {({ drawnPoints, gameState, accuracy }) => {
                    return (
                        <>
                            <TraceEffectLayer
                                gameState={gameState}
                                drawnPoints={drawnPoints}
                                onStrokeSuccess={handleStrokeSuccess}
                            />

                            {/* Guides for all remaining strokes including current */}
                            {strokes.map((s, i) => {
                                if (i < strokeIdx) return null;
                                const pts = expectedPathsData[s as keyof typeof expectedPathsData] as any;
                                return renderGuidePath(pts, guideStyle, s);
                            })}

                            {/* Completed strokes */}
                            {completedStrokes.map((p, i) => (
                                <SkiaPath key={i} path={p} color="#FFD700" style="stroke" strokeWidth={15} strokeCap="round" />
                            ))}
                        </>
                    );
                }}
            </StrokeLesson>

            <View style={styles.phaseBadge} pointerEvents="none">
                <Text style={styles.phaseText}>Phase {subPhase}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    refContainer: { position: 'absolute', top: 50, right: 30, zIndex: 10, opacity: 0.15 },
    refText: { fontSize: 200, fontWeight: 'bold', color: '#FFF' },
    phaseBadge: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    phaseText: { color: '#FFF', fontWeight: 'bold' }
});
