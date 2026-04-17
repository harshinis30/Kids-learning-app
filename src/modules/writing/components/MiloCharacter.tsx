import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
    AmbientLight,
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    Clock,
    DirectionalLight,
    Group,
    LoopOnce,
    LoopRepeat,
    PerspectiveCamera,
    Scene,
    Vector3,
    Box3,
} from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type AnimationState = 'idle' | 'drawing' | 'mistake' | 'victory';

export interface MiloCharacterProps {
    state: AnimationState;
}

const MODEL_MAP = {
    idle: require('../../../../assets/writing module model sglb/breathing.glb'),
    drawing: require('../../../../assets/writing module model sglb/thinking.glb'),
    mistake: require('../../../../assets/writing module model sglb/shaking head no.glb'),
    victory: require('../../../../assets/writing module model sglb/victory.glb'),
};

const MILO_SIZE = 180;

export default function MiloCharacter({ state }: MiloCharacterProps) {
    // ── All mutable state lives in refs ──────────────────────────────────────
    const stateRef = useRef<AnimationState>(state);
    const mixerRef = useRef<AnimationMixer | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    const baseMeshRef = useRef<Group | null>(null);
    const currentActionRef = useRef<AnimationAction | null>(null);
    // Cache stores AnimationClip objects (NOT meshes — we always keep the base mesh)
    const clipCache = useRef<Record<string, AnimationClip>>({});
    const isTransitioning = useRef(false);
    const lastPlayedState = useRef<AnimationState>('idle');
    const glReady = useRef(false);

    // Behavioral locks
    const victoryLockRef = useRef(false);
    const mistakeLockRef = useRef(false);

    // Function refs — render loop and event listeners always call the latest version
    const transitionFnRef = useRef<(s: AnimationState) => Promise<void>>();
    const onFinishedRef = useRef<() => void>();

    // Sync prop → ref
    useEffect(() => {
        stateRef.current = state;
        console.log('[Milo] prop →', state);
    }, [state]);

    // ── Stable event handler wrapper (identity never changes) ────────────────
    const handleFinished = useCallback(() => {
        onFinishedRef.current?.();
    }, []);

    // ── Asset loader ─────────────────────────────────────────────────────────
    const loadModelURI = async (key: AnimationState) => {
        const asset = Asset.fromModule(MODEL_MAP[key]);
        await asset.downloadAsync();
        return asset.localUri || asset.uri;
    };

    // ── Load a clip from a GLB (just the animation, NOT the mesh) ────────────
    const loadClip = async (key: AnimationState): Promise<AnimationClip | null> => {
        if (clipCache.current[key]) return clipCache.current[key];

        try {
            const uri = await loadModelURI(key);
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(uri);

            if (gltf.animations && gltf.animations.length > 0) {
                const clip = gltf.animations[0];
                console.log('[Milo] Loaded clip for', key, ':', clip.name, 'duration:', clip.duration.toFixed(2) + 's');
                clipCache.current[key] = clip;
                return clip;
            } else {
                console.warn('[Milo] No animations in', key, 'GLB');
                return null;
            }
        } catch (err) {
            console.error('[Milo] Failed to load', key, ':', err);
            return null;
        }
    };

    // ── Transition function — always accessed via transitionFnRef ─────────────
    transitionFnRef.current = async (newState: AnimationState) => {
        const mixer = mixerRef.current;
        const mesh = baseMeshRef.current;
        if (!mixer || !mesh) {
            console.log('[Milo] transition: mixer/mesh not ready');
            return;
        }
        if (isTransitioning.current) {
            console.log('[Milo] transition: busy, skipping →', newState);
            return;
        }
        if (victoryLockRef.current) {
            console.log('[Milo] transition: victory locked, ignoring →', newState);
            return;
        }
        if (mistakeLockRef.current && newState === 'mistake') {
            console.log('[Milo] transition: mistake locked, ignoring duplicate');
            return;
        }

        isTransitioning.current = true;
        console.log('[Milo] ▶ Transitioning →', newState);

        try {
            const clip = await loadClip(newState);
            if (!clip) {
                console.warn('[Milo] No clip for', newState, '— staying on current');
                return;
            }

            // Remove old finished listener
            mixer.removeEventListener('finished', handleFinished);

            // Get or create the action for this clip on the base mesh
            const nextAction = mixer.clipAction(clip);

            // Configure loop behavior
            if (newState === 'idle' || newState === 'drawing') {
                nextAction.setLoop(LoopRepeat, Infinity);
                nextAction.clampWhenFinished = false;
                victoryLockRef.current = false;
                mistakeLockRef.current = false;
            } else if (newState === 'victory') {
                nextAction.setLoop(LoopOnce, 1);
                nextAction.clampWhenFinished = true;
                victoryLockRef.current = true;
                mixer.addEventListener('finished', handleFinished);
            } else if (newState === 'mistake') {
                nextAction.setLoop(LoopOnce, 1);
                nextAction.clampWhenFinished = true;
                mistakeLockRef.current = true;
                mixer.addEventListener('finished', handleFinished);
            }

            // Crossfade from current action
            const prevAction = currentActionRef.current;
            nextAction.reset();
            nextAction.play();

            if (prevAction && prevAction !== nextAction) {
                nextAction.crossFadeFrom(prevAction, 0.3, true);
            }

            currentActionRef.current = nextAction;
            console.log('[Milo] ✓ Now playing:', newState, '(clip:', clip.name, ')');
        } catch (e) {
            console.error('[Milo] Transition error:', e);
        } finally {
            isTransitioning.current = false;
            // Catch up if state drifted during async load
            if (stateRef.current !== newState && !victoryLockRef.current && !mistakeLockRef.current) {
                console.log('[Milo] State drifted → catching up to', stateRef.current);
                transitionFnRef.current?.(stateRef.current);
            }
        }
    };

    // ── One-shot finished handler — always accessed via onFinishedRef ─────────
    onFinishedRef.current = () => {
        console.log('[Milo] Animation finished. victory:', victoryLockRef.current, 'mistake:', mistakeLockRef.current);
        mixerRef.current?.removeEventListener('finished', handleFinished);

        if (victoryLockRef.current) {
            victoryLockRef.current = false;
            stateRef.current = 'idle';
            lastPlayedState.current = '__done__' as any; // force render loop to pick up idle
            console.log('[Milo] Victory done → idle');
            return;
        }

        if (mistakeLockRef.current) {
            mistakeLockRef.current = false;
            const next = stateRef.current === 'mistake' ? 'idle' : stateRef.current;
            stateRef.current = next;
            lastPlayedState.current = '__done__' as any;
            console.log('[Milo] Mistake done → ', next);
            return;
        }
    };

    // ── GL Setup + Render Loop ───────────────────────────────────────────────
    const onContextCreate = async (gl: any) => {
        const renderer = new Renderer({ gl });
        renderer.setSize(MILO_SIZE, MILO_SIZE);
        renderer.setClearColor(0x000000, 0);

        const camera = new PerspectiveCamera(50, 1, 0.1, 100);

        const scene = new Scene();
        sceneRef.current = scene;

        // Lighting
        scene.add(new AmbientLight(0xffffff, 0.8));
        const dirLight = new DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(2, 4, 5);
        scene.add(dirLight);
        const fillLight = new DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-1, -2, 2);
        scene.add(fillLight);

        // ── Load base mesh (breathing.glb) ───────────────────────────────────
        try {
            const uri = await loadModelURI('idle');
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(uri);
            const rootMesh = gltf.scene;

            // Auto-frame the character
            const box = new Box3().setFromObject(rootMesh);
            const center = new Vector3();
            const size = new Vector3();
            box.getCenter(center);
            box.getSize(size);
            rootMesh.position.sub(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.0 / maxDim;
            rootMesh.scale.setScalar(scale);

            scene.add(rootMesh);
            baseMeshRef.current = rootMesh;

            camera.position.set(0, 0, 3.2);
            camera.lookAt(0, 0, 0);

            // Create mixer on the BASE mesh — this mixer stays forever
            const mixer = new AnimationMixer(rootMesh);
            mixerRef.current = mixer;

            // Play idle animation
            if (gltf.animations.length > 0) {
                const clip = gltf.animations[0];
                clipCache.current['idle'] = clip;
                const action = mixer.clipAction(clip);
                action.setLoop(LoopRepeat, Infinity);
                action.play();
                currentActionRef.current = action;
                console.log('[Milo] ✓ Base mesh loaded. Idle playing:', clip.name);
            }

            lastPlayedState.current = 'idle';
            glReady.current = true;
        } catch (err) {
            console.error('[Milo] Base model load failed:', err);
        }

        // ── Render loop ──────────────────────────────────────────────────────
        const clock = new Clock();
        const renderLoop = () => {
            requestAnimationFrame(renderLoop);
            const delta = clock.getDelta();

            // Update animation mixer
            if (mixerRef.current) {
                mixerRef.current.update(delta);
            }

            // Poll for state changes (via refs — never stale)
            if (
                glReady.current &&
                stateRef.current !== lastPlayedState.current &&
                !victoryLockRef.current &&
                !(mistakeLockRef.current && stateRef.current === 'mistake')
            ) {
                const next = stateRef.current;
                lastPlayedState.current = next;
                console.log('[Milo] 🔄 Render loop → transition to', next);
                transitionFnRef.current?.(next);
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
        };
        renderLoop();
    };

    return (
        <View style={styles.container} pointerEvents="none">
            <GLView style={styles.glView} onContextCreate={onContextCreate} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: MILO_SIZE,
        height: MILO_SIZE,
        position: 'absolute',
        bottom: 75,
        right: 8,
        zIndex: 100,
        backgroundColor: 'transparent',
    },
    glView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
