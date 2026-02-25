/**
 * ModelViewer3D.tsx
 * Reusable GLB model renderer using expo-gl + expo-three + three.js
 * Supports: GLB loading, animation playback, imperative shake/pulse API
 */
import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export interface ModelViewer3DRef {
    playAnimation: (clipName?: string) => void;
    shake: () => void;
    pulseScale: (to?: number, durationMs?: number) => void;
    flashRed: () => void;
    dissolve: (durationMs?: number) => void;
    resetOpacity: () => void;
}

interface Props {
    modelAsset: number; // require('../assets/models/foo.glb')
    width: number;
    height: number;
    /** Initial animation clip to play. Defaults to first clip found. */
    initialAnimation?: string;
    autoRotate?: boolean;
    rotationSpeed?: number; // radians/frame
    cameraZ?: number;
    lightColor?: number;
    lightIntensity?: number;
    backgroundColor?: string;
    onLoaded?: () => void;
    onError?: (err: Error) => void;
}

const ModelViewer3D = forwardRef<ModelViewer3DRef, Props>(({
    modelAsset,
    width,
    height,
    initialAnimation,
    autoRotate = false,
    rotationSpeed = 0.008,
    cameraZ = 3,
    lightColor = 0xffffff,
    lightIntensity = 2.5,
    backgroundColor = 'transparent',
    onLoaded,
    onError,
}, ref) => {
    const glRef = useRef<any>(null);
    const rendererRef = useRef<Renderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const modelRef = useRef<THREE.Object3D | null>(null);
    const currentActionRef = useRef<THREE.AnimationAction | null>(null);
    const clipsRef = useRef<THREE.AnimationClip[]>([]);
    const clockRef = useRef(new THREE.Clock());
    const frameRef = useRef<number>(0);
    const mountedRef = useRef(true);
    // Imperative animation state
    const shakeOffsetRef = useRef(0);
    const shakeActiveRef = useRef(false);
    const pulseScaleRef = useRef(1);
    const pulseActiveRef = useRef(false);
    const dissolveRef = useRef(false);
    const dissolveSpeedRef = useRef(0);
    const flashRef = useRef(0); // 0=none, 1=flashing
    const flashTimerRef = useRef(0);

    useImperativeHandle(ref, () => ({
        playAnimation(clipName?: string) {
            if (!mixerRef.current || clipsRef.current.length === 0) return;
            const clip = clipName
                ? THREE.AnimationClip.findByName(clipsRef.current, clipName) ?? clipsRef.current[0]
                : clipsRef.current[0];
            if (!clip) return;
            currentActionRef.current?.fadeOut(0.2);
            const action = mixerRef.current.clipAction(clip);
            action.reset().fadeIn(0.2).play();
            currentActionRef.current = action;
        },
        shake() {
            shakeActiveRef.current = true;
            shakeOffsetRef.current = 0;
            // Reset after ~400ms (8 frames at ~50ms each)
            let count = 0;
            const interval = setInterval(() => {
                shakeOffsetRef.current = (Math.random() - 0.5) * 0.35;
                if (++count >= 8) {
                    clearInterval(interval);
                    shakeOffsetRef.current = 0;
                    shakeActiveRef.current = false;
                }
            }, 50);
        },
        pulseScale(to = 1.25, durationMs = 180) {
            pulseActiveRef.current = true;
            pulseScaleRef.current = to;
            setTimeout(() => {
                pulseScaleRef.current = 1;
                setTimeout(() => { pulseActiveRef.current = false; }, durationMs);
            }, durationMs);
        },
        flashRed() {
            flashRef.current = 1;
            flashTimerRef.current = 0;
        },
        dissolve(durationMs = 1200) {
            dissolveRef.current = true;
            dissolveSpeedRef.current = 1 / (durationMs / 16.67); // per frame
        },
        resetOpacity() {
            dissolveRef.current = false;
            if (modelRef.current) {
                modelRef.current.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                        if (mat) { mat.opacity = 1; mat.transparent = false; }
                    }
                });
            }
        },
    }), []);

    const onContextCreate = useCallback(async (gl: any) => {
        if (!mountedRef.current) return;
        glRef.current = gl;

        // ── Renderer ──────────────────────────────────────────────
        const renderer = new Renderer({ gl });
        renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        renderer.setClearColor(0x000000, 0);
        rendererRef.current = renderer;

        // ── Scene ─────────────────────────────────────────────────
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // ── Camera ────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(
            45,
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.01,
            1000
        );
        camera.position.set(0, 0, cameraZ);
        cameraRef.current = camera;

        // ── Lighting ──────────────────────────────────────────────
        const ambient = new THREE.AmbientLight(lightColor, lightIntensity * 0.5);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(lightColor, lightIntensity);
        dirLight.position.set(2, 4, 3);
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x8888ff, lightIntensity * 0.3);
        fillLight.position.set(-2, -1, 2);
        scene.add(fillLight);

        // ── Load GLB ──────────────────────────────────────────────
        try {
            const asset = Asset.fromModule(modelAsset);
            await asset.downloadAsync();
            const uri = asset.localUri ?? asset.uri;

            const loader = new GLTFLoader();
            loader.load(
                uri,
                (gltf) => {
                    if (!mountedRef.current) return;
                    const model = gltf.scene;
                    // Auto-scale to fill the view nicely
                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    model.scale.setScalar(1.8 / maxDim);
                    // Center the model
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center.multiplyScalar(1.8 / maxDim));

                    scene.add(model);
                    modelRef.current = model;

                    // Animations
                    if (gltf.animations.length > 0) {
                        clipsRef.current = gltf.animations;
                        const mixer = new THREE.AnimationMixer(model);
                        mixerRef.current = mixer;

                        const clip = initialAnimation
                            ? THREE.AnimationClip.findByName(gltf.animations, initialAnimation) ?? gltf.animations[0]
                            : gltf.animations[0];
                        if (clip) {
                            const action = mixer.clipAction(clip);
                            action.play();
                            currentActionRef.current = action;
                        }
                    }
                    onLoaded?.();
                },
                undefined,
                (err: Error | ErrorEvent) => {
                    console.error('[ModelViewer3D] Load error:', err);
                    onError?.(err instanceof Error ? err : new Error(String(err)));
                }
            );
        } catch (err) {
            console.error('[ModelViewer3D] Asset error:', err);
            onError?.(err as Error);
        }

        // ── Render loop ───────────────────────────────────────────
        const render = () => {
            if (!mountedRef.current) return;
            frameRef.current = requestAnimationFrame(render);
            const delta = clockRef.current.getDelta();

            if (mixerRef.current) mixerRef.current.update(delta);

            const model = modelRef.current;
            if (model) {
                // Auto-rotate
                if (autoRotate) model.rotation.y += rotationSpeed;

                // Shake offset
                if (shakeActiveRef.current) {
                    model.position.x = shakeOffsetRef.current;
                }

                // Scale pulse
                if (pulseActiveRef.current) {
                    model.scale.setScalar(pulseScaleRef.current * (1.8 / Math.max(
                        new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).x,
                        0.001
                    )));
                }

                // Red flash
                if (flashRef.current > 0) {
                    flashTimerRef.current += delta;
                    const t = Math.min(flashTimerRef.current / 0.6, 1);
                    const intensity = Math.sin(t * Math.PI) * 3;
                    model.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            const mat = (child as THREE.Mesh).material;
                            if (mat && 'emissive' in mat) {
                                (mat as THREE.MeshStandardMaterial).emissive.setRGB(intensity * 0.8, 0, 0);
                                (mat as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
                            }
                        }
                    });
                    if (flashTimerRef.current > 0.6) {
                        flashRef.current = 0;
                        flashTimerRef.current = 0;
                        model.traverse((child) => {
                            if ((child as THREE.Mesh).isMesh) {
                                const mat = (child as THREE.Mesh).material;
                                if (mat && 'emissive' in mat) {
                                    (mat as THREE.MeshStandardMaterial).emissive.setRGB(0, 0, 0);
                                    (mat as THREE.MeshStandardMaterial).emissiveIntensity = 0;
                                }
                            }
                        });
                    }
                }

                // Dissolve
                if (dissolveRef.current) {
                    model.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                            if (mat) {
                                mat.transparent = true;
                                mat.opacity = Math.max(0, (mat.opacity ?? 1) - dissolveSpeedRef.current);
                            }
                        }
                    });
                }
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
        };
        render();
    }, [modelAsset]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            cancelAnimationFrame(frameRef.current);
            rendererRef.current?.dispose();
        };
    }, []);

    return (
        <View style={[styles.container, { width, height, backgroundColor }]}>
            <GLView
                style={{ width, height }}
                onContextCreate={onContextCreate}
            />
        </View>
    );
});

ModelViewer3D.displayName = 'ModelViewer3D';
export { ModelViewer3D };

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        borderRadius: 0,
    },
});
