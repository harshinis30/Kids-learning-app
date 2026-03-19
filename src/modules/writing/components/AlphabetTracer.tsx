import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { G, Path } from 'react-native-svg';
import expectedPathsData from '../data/expectedPaths.json';
import StrokeLesson, { GameState } from './StrokeLesson';

const { width: W, height: H } = Dimensions.get('window');

const LETTER_STROKES: Record<string, string[]> = {
    'A': ['alpha_A_1', 'alpha_A_2', 'alpha_A_3'],
    'B': ['alpha_B_1', 'alpha_B_2', 'alpha_B_3'],
    'C': ['alpha_C_1'],
    'O': ['alpha_O_1'],
    // Cursive lowercase letters
    'i': ['cursive_i_1', 'cursive_i_dot'],
    't': ['cursive_t_1', 'cursive_t_cross'],
    'u': ['cursive_u_1', 'cursive_u_exit'],
    'w': ['cursive_w_1', 'cursive_w_exit'],
    'e': ['cursive_e_1'],
    'l': ['cursive_l_1'],
};

export interface AlphabetTracerProps {
    letterId: string;
    subPhase: '4A' | '4B' | '4C';
    onLetterComplete: (mistakes: number, accuracy: number) => void;
    onStruggle: () => void;
}

import { getSvgPathFromPoints } from './StrokeLesson';

function renderGuidePath(pts: Array<{ x: number, y: number }>, style: 'full' | 'partial' | 'none', keyVal: string) {
    if (style === 'none' || !pts || pts.length === 0) return null;

    const isCursive = keyVal.startsWith('cursive_');
    const pathD = getSvgPathFromPoints(pts, isCursive);

    if (style === 'partial') {
        return (
            <G key={keyVal + '_partial'}>
                {/* Faint glow halo for cursive visibility */}
                {isCursive && (
                    <Path
                        key={keyVal + '_glow'}
                        d={pathD}
                        stroke="rgba(255,225,100,0.12)"
                        fill="none"
                        strokeWidth={22}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
                <Path
                    key={keyVal}
                    d={pathD}
                    stroke={isCursive ? 'rgba(255,225,100,0.5)' : 'rgba(255,255,255,0.4)'}
                    fill="none"
                    strokeWidth={isCursive ? 8 : 10}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </G>
        );
    }

    // 'full' style — thick guide
    return (
        <G key={keyVal + '_full'}>
            {/* For cursive: outer glow halo */}
            {isCursive && (
                <Path
                    key={keyVal + '_halo'}
                    d={pathD}
                    stroke="rgba(255,225,100,0.15)"
                    fill="none"
                    strokeWidth={38}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
            <Path
                key={keyVal}
                d={pathD}
                stroke={isCursive ? 'rgba(255,225,100,0.25)' : 'rgba(255,255,255,0.2)'}
                fill="none"
                strokeWidth={isCursive ? 14 : 30}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* For cursive: thin centre-line for precision */}
            {isCursive && (
                <Path
                    key={keyVal + '_centre'}
                    d={pathD}
                    stroke="rgba(255,225,100,0.55)"
                    fill="none"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </G>
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
    const strokeAccuraciesRef = useRef<number[]>([]);

    const strokes = LETTER_STROKES[letterId] || [];

    useEffect(() => {
        setStrokeIdx(0);
        setCompletedStrokes([]);
        setMistakeCount(0);
        setLocalMistakes(0);
        strokeAccuraciesRef.current = [];
    }, [letterId, subPhase]);

    if (strokeIdx >= strokes.length || strokes.length === 0) {
        return null;
    }

    const activeStrokeKey = strokes[strokeIdx];
    const expectedPath = expectedPathsData[activeStrokeKey as keyof typeof expectedPathsData];
    const isCursiveStroke = activeStrokeKey.startsWith('cursive_');
    // Cursive strokes need more generous tolerance since paths are dense curves
    const tolerance = subPhase === '4A' ? (isCursiveStroke ? 2.5 : 1.5)
        : subPhase === '4B' ? (isCursiveStroke ? 1.8 : 1.0)
            : (isCursiveStroke ? 1.2 : 0.6);
    const guideStyle = subPhase === '4A' ? 'full' : subPhase === '4B' ? 'partial' : 'none';

    const handleStrokeSuccess = (drawn: Array<{ x: number, y: number }>, strokeAccuracy: number) => {
        const pathD = getSvgPathFromPoints(drawn);

        // Track accuracy for this stroke
        strokeAccuraciesRef.current.push(strokeAccuracy);

        // Slight delay so child sees the success highlight before clearing/moving
        setTimeout(() => {
            setLocalMistakes(0);
            const newStrokes = [...completedStrokes, pathD];
            if (strokeIdx < strokes.length - 1) {
                setCompletedStrokes(newStrokes);
                setStrokeIdx(s => s + 1);
            } else {
                // Average accuracy across all strokes of this letter
                const avgAccuracy = strokeAccuraciesRef.current.length > 0
                    ? Math.round(strokeAccuraciesRef.current.reduce((a, b) => a + b, 0) / strokeAccuraciesRef.current.length)
                    : 0;
                onLetterComplete(mistakeCount, avgAccuracy);
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

    // Called when user taps "Next" on the success overlay inside StrokeLesson
    const handleNext = (acc: number | null) => {
        handleStrokeSuccess([], acc ?? 0); // trigger advance to next stroke with accuracy
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            {subPhase === '4C' && (
                <View style={styles.refContainer} pointerEvents="none">
                    <Text style={[
                        styles.refText,
                        letterId === letterId.toLowerCase() && letterId !== letterId.toUpperCase()
                            ? styles.refTextCursive
                            : null
                    ]}>{letterId}</Text>
                </View>
            )}
            <StrokeLesson
                key={activeStrokeKey + subPhase}
                expectedPath={expectedPath as Array<{ x: number, y: number }>}
                toleranceMultiplier={tolerance}
                strokeType={isCursiveStroke ? 'curve' : 'free'}
                hideOverlays={false}
                hideHeader={true}
                hideMilo={false}
                onFail={handleStrokeFail}
                onNext={handleNext}
            >
                {({ drawnPoints, gameState, accuracy }) => {
                    return (
                        <G key={activeStrokeKey + '_children'}>
                            <TraceEffectLayer
                                key={activeStrokeKey + '_effect'}
                                gameState={gameState}
                                drawnPoints={drawnPoints}
                                onStrokeSuccess={(pts) => handleStrokeSuccess(pts, accuracy ?? 0)}
                            />

                            {/* Guides for all remaining strokes including current */}
                            {strokes.map((s, i) => {
                                if (i < strokeIdx) return null;
                                const pts = expectedPathsData[s as keyof typeof expectedPathsData] as any;
                                return renderGuidePath(pts, guideStyle, s);
                            })}

                            {/* Completed strokes */}
                            {completedStrokes.map((p, i) => (
                                <Path key={'done_' + i} d={p} stroke="#FFD700" fill="none" strokeWidth={15} strokeLinecap="round" />
                            ))}
                        </G>
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
    refTextCursive: { fontStyle: 'italic', color: '#FFE066' },
    phaseBadge: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    phaseText: { color: '#FFF', fontWeight: 'bold' }
});
