import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { LipSyncAnimation, getBlendWeightsAtTime } from '../services/lipSyncService';

interface Character3DProps {
    isAnimating?: boolean;
    animationType?: 'idle' | 'speaking' | 'celebrating' | 'encouraging';
    lipSyncAnimation?: LipSyncAnimation | null;
    currentAnimationTime?: number;
}

export function Character3D({
    isAnimating = false,
    animationType = 'idle',
    lipSyncAnimation = null,
    currentAnimationTime = 0,
}: Character3DProps) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const [modelLoaded, setModelLoaded] = useState(false);

    // Refs to hold latest prop values so the render loop (closure) always reads current values
    const animationTypeRef = useRef(animationType);
    const lipSyncAnimationRef = useRef(lipSyncAnimation);
    const currentAnimationTimeRef = useRef(currentAnimationTime);

    // Keep refs in sync with props on every render
    useEffect(() => { animationTypeRef.current = animationType; }, [animationType]);
    useEffect(() => { lipSyncAnimationRef.current = lipSyncAnimation; }, [lipSyncAnimation]);
    useEffect(() => { currentAnimationTimeRef.current = currentAnimationTime; }, [currentAnimationTime]);

    const onContextCreate = async (gl: any) => {
        // Create renderer with antialiasing for smoother edges
        const renderer = new Renderer({ gl, antialias: true });
        renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        renderer.setClearColor(0x000000, 0); // Transparent background

        // Enhanced rendering quality
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Create scene
        const scene = new THREE.Scene();
        scene.background = null;

        // Create camera with better framing
        const camera = new THREE.PerspectiveCamera(
            50, // Wider field of view
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0.5, 5); // Further back for larger character
        camera.lookAt(0, 0.5, 0);

        // PROFESSIONAL LIGHTING SETUP for vibrant, visible character

        // Key Light - Main illumination from front-right
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
        keyLight.position.set(3, 4, 3);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        scene.add(keyLight);

        // Fill Light - Soften shadows from left
        const fillLight = new THREE.DirectionalLight(0xb8d4ff, 1.0);
        fillLight.position.set(-3, 2, -2);
        scene.add(fillLight);

        // Rim Light - Create depth and edge lighting from behind
        const rimLight = new THREE.DirectionalLight(0xffd4a3, 1.5);
        rimLight.position.set(0, 3, -4);
        scene.add(rimLight);

        // Strong Ambient Light - Ensure nothing is too dark
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);

        // Bottom Fill - Illuminate face from below
        const bottomLight = new THREE.DirectionalLight(0xffffff, 0.7);
        bottomLight.position.set(0, -2, 2);
        scene.add(bottomLight);

        // Hemisphere Light - Natural sky/ground lighting
        const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.6);
        scene.add(hemiLight);

        // Load GLB model with facial rig
        let model: THREE.Group | null = null;
        let jawBone: THREE.Object3D | null = null;
        let headBone: THREE.Object3D | null = null;
        let facialMeshes: Array<{
            mesh: THREE.Mesh;
            morphTargetDictionary: { [key: string]: number };
        }> = [];

        try {
            // ── Step 1: Pre-load the external texture FIRST ──────────────────
            // This avoids the GLTFLoader blob creation issue on React Native
            let characterTexture: THREE.Texture | null = null;
            try {
                const textureAsset = Asset.fromModule(require('../textures/gltf_embedded_0.png'));
                await textureAsset.downloadAsync();
                const textureUri = textureAsset.localUri || textureAsset.uri;

                characterTexture = await new Promise<THREE.Texture>((resolve, reject) => {
                    const textureLoader = new THREE.TextureLoader();
                    textureLoader.load(
                        textureUri,
                        (texture: THREE.Texture) => {
                            texture.flipY = false;
                            texture.colorSpace = THREE.SRGBColorSpace;
                            console.log('✅ Texture pre-loaded successfully');
                            resolve(texture);
                        },
                        undefined,
                        (err: any) => {
                            console.warn('⚠️ Texture load failed, using fallback color:', err);
                            reject(err);
                        }
                    );
                });
            } catch {
                console.warn('⚠️ Texture unavailable, character will use solid color');
            }

            // ── Step 2: Load the GLB model ───────────────────────────────────
            const asset = Asset.fromModule(require('../source/facial_rig_test_.glb'));
            await asset.downloadAsync();

            const loader = new GLTFLoader();

            // Patch the loader's manager to intercept blob:// URLs that RN can't handle.
            // When the GLB has embedded textures, GLTFLoader tries to create a Blob URL.
            // We intercept that and return our pre-loaded texture URI instead.
            if (characterTexture) {
                loader.manager.setURLModifier((url: string) => {
                    // If it's a blob or data URL (embedded texture), redirect to our asset
                    if (url.startsWith('blob:') || url.startsWith('data:image')) {
                        console.log('🔄 Redirecting embedded texture to pre-loaded asset');
                        const textureAsset = Asset.fromModule(require('../textures/gltf_embedded_0.png'));
                        return textureAsset.localUri || textureAsset.uri || url;
                    }
                    return url;
                });
            }

            const gltf = await new Promise<any>((resolve, reject) => {
                loader.load(
                    asset.localUri || asset.uri,
                    resolve,
                    undefined,
                    (err: any) => {
                        console.error('❌ GLB load error:', err);
                        reject(err);
                    }
                );
            });

            model = gltf.scene;
            console.log('✅ GLB model loaded');

            // ── Step 3: Apply materials to all meshes ────────────────────────
            model.traverse((child: any) => {
                if (!child.isMesh) return;

                const applyMaterial = (mat: any) => {
                    // Apply our pre-loaded texture if the mesh has no map or has a broken one
                    if (characterTexture && !mat.map) {
                        mat.map = characterTexture;
                        mat.color.setHex(0xffffff);
                    } else if (!characterTexture) {
                        // Fallback: warm skin tone
                        mat.color.setHex(0xFFCBA4);
                    }
                    mat.roughness = 0.8;
                    mat.metalness = 0.1;
                    mat.side = THREE.DoubleSide;
                    mat.needsUpdate = true;
                };

                if (Array.isArray(child.material)) {
                    child.material.forEach(applyMaterial);
                } else if (child.material) {
                    applyMaterial(child.material);
                } else {
                    child.material = new THREE.MeshStandardMaterial({
                        map: characterTexture ?? undefined,
                        color: characterTexture ? 0xffffff : 0xFFCBA4,
                        roughness: 0.8,
                        metalness: 0.1,
                        side: THREE.DoubleSide,
                    });
                }

                child.castShadow = true;
                child.receiveShadow = true;

                // Collect facial meshes with blendshapes
                if (child.morphTargetDictionary) {
                    console.log(`🎭 Facial mesh: ${child.name}`, Object.keys(child.morphTargetDictionary));
                    facialMeshes.push({
                        mesh: child,
                        morphTargetDictionary: child.morphTargetDictionary,
                    });
                }
            });

            // ── Step 4: Find bones ───────────────────────────────────────────
            model.traverse((child: any) => {
                const name = child.name.toLowerCase();
                if (!jawBone && (name.includes('jaw') || name.includes('chin') || name.includes('mandible'))) {
                    console.log('🦴 Jaw bone:', child.name);
                    jawBone = child;
                }
                if (!headBone && (name.includes('head') || name.includes('skull'))) {
                    console.log('🦴 Head bone:', child.name);
                    headBone = child;
                }
            });

            model.scale.set(3.0, 3.0, 3.0);
            model.position.set(0, -1.5, 0);
            scene.add(model);

            console.log(`✅ Character ready. Facial meshes: ${facialMeshes.length}`);
            setModelLoaded(true);
        } catch (error) {
            console.error('❌ Error loading character model:', error);
            // Add a fallback sphere so the scene isn't empty
            const fallbackGeo = new THREE.SphereGeometry(0.8, 32, 32);
            const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xFFCBA4, roughness: 0.8 });
            const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
            fallbackMesh.position.set(0, 0, 0);
            scene.add(fallbackMesh);
        }

        // Animation variables
        let time = 0;
        let isJumping = false;
        let jumpStartTime = 0;
        let idleTime = 0;

        // Store initial positions
        const initialPosition = model ? model.position.clone() : new THREE.Vector3();
        const initialRotation = model ? model.rotation.clone() : new THREE.Euler();

        // Helper function to apply blendshape weights with smooth interpolation
        const applyBlendshapes = (weights: { [key: string]: number | undefined }) => {
            console.log('🎬 Applying blendshapes:', weights);

            for (const { mesh, morphTargetDictionary } of facialMeshes) {
                if (!mesh.morphTargetInfluences) {
                    console.log('⚠️ No morphTargetInfluences on mesh');
                    continue;
                }

                // Map generic blendshape names to model-specific names
                const blendshapeMapping: { [key: string]: string[] } = {
                    jawOpen: ['jawOpen', 'jaw_open', 'mouthOpen', 'mouth_open', 'JawOpen'],
                    mouthSmile: ['mouthSmile', 'mouth_smile', 'smile', 'Smile'],
                    mouthFunnel: ['mouthFunnel', 'mouth_funnel', 'mouthO', 'mouth_o', 'O'],
                    mouthPucker: ['mouthPucker', 'mouth_pucker', 'mouthU', 'mouth_u', 'U'],
                    mouthRollLower: ['mouthRollLower', 'mouth_roll_lower', 'lowerLipRoll'],
                    mouthRollUpper: ['mouthRollUpper', 'mouth_roll_upper', 'upperLipRoll'],
                };

                // Apply each weight
                for (const [genericName, value] of Object.entries(weights)) {
                    if (value === undefined) continue;

                    const possibleNames = blendshapeMapping[genericName] || [genericName];
                    for (const possibleName of possibleNames) {
                        if (possibleName in morphTargetDictionary) {
                            const index = morphTargetDictionary[possibleName];
                            // Smooth interpolation to new value
                            const current = mesh.morphTargetInfluences[index];
                            const lerp = current + (value - current) * 0.3;
                            mesh.morphTargetInfluences[index] = lerp;
                            console.log(`  ✅ ${possibleName} = ${lerp.toFixed(2)}`);
                            break;
                        }
                    }
                }
            }
        };

        // Render loop - 60 FPS for smooth animation
        const render = () => {
            timeoutRef.current = setTimeout(render, 1000 / 60); // 60 FPS
            time += 0.0167; // ~60fps delta
            idleTime += 0.0167;

            if (model) {
                // Reset to initial position
                model.position.copy(initialPosition);
                model.rotation.copy(initialRotation);

                // Read current values from refs (avoids stale closure)
                const currentAnimType = animationTypeRef.current;
                const currentLipSync = lipSyncAnimationRef.current;
                const currentAnimTime = currentAnimationTimeRef.current;

                // Idle animation - gentle breathing and subtle head movement
                if (currentAnimType === 'idle') {
                    const breathe = Math.sin(idleTime * 0.8) * 0.025;
                    model.position.y = initialPosition.y + breathe;

                    // Subtle head rotation
                    const headSway = Math.sin(idleTime * 0.5) * 0.03;
                    model.rotation.y = headSway;
                }

                // Speaking animation - LIP SYNC with blendshapes
                if (currentAnimType === 'speaking' && currentLipSync) {
                    // Gentle bobbing while speaking
                    const speakBob = Math.sin(time * 3) * 0.04;
                    model.position.y = initialPosition.y + speakBob;

                    // Slight head movement while speaking
                    const headMove = Math.sin(time * 2) * 0.02;
                    model.rotation.y = headMove;

                    // Get blendshape weights for current time
                    const blendWeights = getBlendWeightsAtTime(
                        currentLipSync,
                        currentAnimTime
                    );

                    // Apply blendshapes for lip sync
                    applyBlendshapes(blendWeights);

                    // Animate jaw bone if available
                    if (jawBone && blendWeights.jawOpen !== undefined) {
                        const targetRotation = blendWeights.jawOpen * 0.35;
                        jawBone.rotation.x += (targetRotation - jawBone.rotation.x) * 0.3;
                    }
                } else if (currentAnimType !== 'celebrating') {
                    // Reset blendshapes to neutral when not speaking (but not during celebration)
                    applyBlendshapes({
                        jawOpen: 0,
                        mouthSmile: 0,
                        mouthFunnel: 0,
                        mouthPucker: 0,
                        mouthRollLower: 0,
                        mouthRollUpper: 0,
                    });

                    if (jawBone) {
                        jawBone.rotation.x += (0 - jawBone.rotation.x) * 0.3;
                    }
                }

                // Celebrating animation - exciting jump with smile
                if (currentAnimType === 'celebrating' && !isJumping) {
                    isJumping = true;
                    jumpStartTime = time;
                }

                if (isJumping) {
                    const elapsed = time - jumpStartTime;
                    const jumpDuration = 0.8;

                    if (elapsed < jumpDuration) {
                        const progress = elapsed / jumpDuration;
                        const jumpHeight = Math.sin(progress * Math.PI) * 0.6;
                        model.position.y = initialPosition.y + jumpHeight;
                        model.rotation.z = Math.sin(progress * Math.PI * 2) * 0.1;

                        applyBlendshapes({
                            mouthSmile: 0.9,
                            jawOpen: 0.3,
                        });
                    } else {
                        isJumping = false;
                        model.position.y = initialPosition.y;
                        model.rotation.z = 0;
                    }
                }

                // Encouraging animation - nod with gentle smile
                if (currentAnimType === 'encouraging') {
                    const nod = Math.sin(time * 4) * 0.08;
                    model.rotation.x = nod;

                    applyBlendshapes({
                        mouthSmile: 0.4,
                    });
                }
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
        };

        render();
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <GLView
            style={{ flex: 1 }}
            onContextCreate={onContextCreate}
        />
    );
}