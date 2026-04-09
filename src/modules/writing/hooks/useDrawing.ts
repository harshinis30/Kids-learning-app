import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { computeAccuracy } from "../utils/accuracy.js";
import { canProgress, getFeedback } from "../utils/scoring.js";

export type DrawingState =
  | "idle"
  | "drawing"
  | "evaluating"
  | "success"
  | "fail"
  | "complete";

export interface DrawingPoint { x: number; y: number; }

export interface DrawingResult {
  accuracy: number;
  feedback: { message: string; emoji: string };
  passed: boolean;
}

export interface UseDrawingOptions {
  expectedPath: DrawingPoint[];
  toleranceMultiplier?: number;
  onEvaluate?: (result: DrawingResult) => void;
  onSuccess?: (result: DrawingResult) => void;
  onFail?: (result: DrawingResult) => void;
  W?: number;
  H?: number;
}

export interface UseDrawingReturn {
  drawingState: DrawingState;
  drawnPoints: DrawingPoint[];
  drawnPathD: string;
  accuracy: number | null;
  feedback: { message: string; emoji: string } | null;
  handleTouchStart: (x: number, y: number) => void;
  handleTouchMove: (x: number, y: number) => void;
  handleTouchEnd: () => void;
  reset: () => void;
  forceEvaluate: () => void;
}

export function useDrawing({
  expectedPath, toleranceMultiplier = 1.0, onEvaluate, onSuccess, onFail, W: layoutW, H: layoutH
}: UseDrawingOptions): UseDrawingReturn {
  const windowDims = useWindowDimensions();
  const W = layoutW || windowDims.width;
  const H = layoutH || windowDims.height;
  const [drawingState, setDrawingState] = useState<DrawingState>("idle");
  const [drawnPathD, setDrawnPathD] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; emoji: string } | null>(null);

  const allPointsRef = useRef<DrawingPoint[]>([]);
  const currentStrokeRef = useRef<DrawingPoint[]>([]);
  const hasEvaluatedRef = useRef(false);
  const drawingStateRef = useRef<DrawingState>("idle");
  const evalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    drawingStateRef.current = drawingState;
  }, [drawingState]);

  const evaluate = useCallback(() => {
    if (hasEvaluatedRef.current) return;

    // Evaluate even with few points (will result in poor accuracy), unless absolutely 0
    if (allPointsRef.current.length === 0) {
      // Automatic poor score if nothing drawn
      const fb = getFeedback(0);
      const result: DrawingResult = { accuracy: 0, feedback: fb, passed: false };
      hasEvaluatedRef.current = true;
      setAccuracy(0);
      setFeedback(fb);
      setDrawingState("fail");
      onEvaluate?.(result);
      onFail?.(result);
      return;
    }

    hasEvaluatedRef.current = true;
    setDrawingState("evaluating");

    const acc = computeAccuracy(
      allPointsRef.current, expectedPath, { width: W, height: H }, { toleranceMultiplier }
    );
    const fb = getFeedback(acc);
    const passed = canProgress(acc);
    const result: DrawingResult = { accuracy: acc, feedback: fb, passed };

    setAccuracy(acc);
    setFeedback(fb);
    setDrawingState(passed ? "success" : "fail");

    onEvaluate?.(result);
    if (passed) onSuccess?.(result);
    else onFail?.(result);
  }, [expectedPath, toleranceMultiplier, onEvaluate, onSuccess, onFail]);

  const handleTouchStart = useCallback((x: number, y: number) => {
    if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
    const state = drawingStateRef.current;
    if (state === "success" || state === "fail" || state === "complete") return;

    currentStrokeRef.current = [{ x: x / W, y: y / H }];
    setDrawnPathD((prev) => prev ? `${prev} M ${x} ${y}` : `M ${x} ${y}`);
    setAccuracy(null);
    setFeedback(null);
    setDrawingState("drawing");
  }, [W, H]);

  const handleTouchMove = useCallback((x: number, y: number) => {
    if (drawingStateRef.current !== "drawing") return;
    currentStrokeRef.current.push({ x: x / W, y: y / H });
    setDrawnPathD((prev) => `${prev} L ${x} ${y}`);
  }, [W, H]);

  const handleTouchEnd = useCallback(() => {
    if (drawingStateRef.current !== "drawing") return;
    allPointsRef.current = allPointsRef.current.concat(currentStrokeRef.current);
    currentStrokeRef.current = [];
    
    if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
    evalTimerRef.current = setTimeout(() => {
        evaluate();
    }, 1200);
  }, [evaluate]);

  const reset = useCallback(() => {
    allPointsRef.current = [];
    currentStrokeRef.current = [];
    hasEvaluatedRef.current = false;
    setDrawnPathD("");
    setAccuracy(null);
    setFeedback(null);
    setDrawingState("idle");
  }, []);

  useEffect(() => { reset(); }, [expectedPath]);

  return {
    drawingState,
    drawnPoints: allPointsRef.current,
    drawnPathD,
    accuracy,
    feedback,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    reset,
    forceEvaluate: evaluate,
  };
}
