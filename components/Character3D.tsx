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

    const onContextCreate = async (gl: any) => {
        // Create renderer
        const renderer = new Renderer({ gl });
        renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

        // Create scene
        const scene = new THREE.Scene();
        scene.background = null; // Transparent background

        // Create camera
        const camera = new THREE.PerspectiveCamera(
            45,
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0.5, 2.5);
        camera.lookAt(0, 0.5, 0);

        // Add lights for better visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight1.position.set(2, 3, 3);
        directionalLight1.castShadow = true;
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight2.position.set(-2, 2, -2);
        scene.add(directionalLight2);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, 2, -3);
        scene.add(rimLight);

        // Add a fill light from below
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(0, -1, 2);
        scene.add(fillLight);

        // Load GLB model with facial rig
        let model: THREE.Group | null = null;
        let jawBone: THREE.Object3D | null = null;
        let headBone: THREE.Object3D | null = null;
        let facialMeshes: Array<{
            mesh: THREE.Mesh;
            morphTargetDictionary: { [key: string]: number };
        }> = [];

        try {
            // Load the new facial rig model
            const asset = Asset.fromModule(require('../source/facial_rig_test_.glb'));
            await asset.downloadAsync();

            const loader = new GLTFLoader();
            const gltf = await new Promise<any>((resolve, reject) => {
                loader.load(
                    asset.localUri || asset.uri,
                    resolve,
                    undefined,
                    reject
                );
            });

            model = gltf.scene;

            // Ensure all materials are properly configured
            model.traverse((child: any) => {
                if (child.isMesh) {
                    // Enable proper material rendering
                    if (child.material) {
                        child.material.needsUpdate = true;

                        // Ensure materials are visible
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat: any) => {
                                mat.needsUpdate = true;
                                mat.side = THREE.FrontSide;
                            });
                        } else {
                            child.material.side = THREE.FrontSide;
                        }
                    }

                    // Enable shadows
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            model.scale.set(1.2, 1.2, 1.2);
            model.position.set(0, -1, 0);
            scene.add(model);

            console.log('=== Facial Rig Loaded ===');

            // Find facial meshes with blendshapes and bones
            model.traverse((child: any) => {
                const name = child.name.toLowerCase();

                // Look for meshes with morph targets (blendshapes)
                if (child.isMesh && child.morphTargetDictionary) {
                    console.log(`Found facial mesh: ${child.name}`);
                    console.log('Blendshapes:', Object.keys(child.morphTargetDictionary));

                    facialMeshes.push({
                        mesh: child,
                        morphTargetDictionary: child.morphTargetDictionary,
                    });
                }

                // Look for jaw bone
                if (!jawBone && (
                    name.includes('jaw') ||
                    name.includes('chin') ||
                    name.includes('mandible')
                )) {
                    console.log('Found jaw bone:', child.name);
                    jawBone = child;
                }

                // Look for head bone
                if (!headBone && (
                    name.includes('head') ||
                    name.includes('skull')
                )) {
                    console.log('Found head bone:', child.name);
                    headBone = child;
                }
            });

            console.log(`Total facial meshes with blendshapes: ${facialMeshes.length}`);
            setModelLoaded(true);
        } catch (error) {
            console.error('Error loading facial rig:', error);
        }

        // Animation variables
        let time = 0;
        let isJumping = false;
        let jumpStartTime = 0;
        let idleTime = 0;

        // Store initial positions for body stillness
        const initialPosition = model ? model.position.clone() : new THREE.Vector3();
        const initialRotation = model ? model.rotation.clone() : new THREE.Euler();

        // Helper function to apply blendshape weights
        const applyBlendshapes = (weights: { [key: string]: number | undefined }) => {
            for (const { mesh, morphTargetDictionary } of facialMeshes) {
                if (!mesh.morphTargetInfluences) continue;

                // Map our generic blendshape names to actual model blendshape names
                const blendshapeMapping: { [key: string]: string[] } = {
                    jawOpen: ['jawOpen', 'jaw_open', 'mouthOpen', 'mouth_open', 'JawOpen'],
                    mouthSmile: ['mouthSmile', 'mouth_smile', 'smile', 'Smile'],
                    mouthFunnel: ['mouthFunnel', 'mouth_funnel', 'mouthO', 'mouth_o', 'O'],
                    mouthPucker: ['mouthPucker', 'mouth_pucker', 'mouthU', 'mouth_u', 'U'],
                    mouthRollLower: ['mouthRollLower', 'mouth_roll_lower', 'lowerLipRoll'],
                    mouthRollUpper: ['mouthRollUpper', 'mouth_roll_upper', 'upperLipRoll'],
                };

                for (const [genericName, value] of Object.entries(weights)) {
                    if (value === undefined) continue;

                    const possibleNames = blendshapeMapping[genericName] || [genericName];

                    for (const possibleName of possibleNames) {
                        if (possibleName in morphTargetDictionary) {
                            const index = morphTargetDictionary[possibleName];
                            mesh.morphTargetInfluences[index] = value;
                            break;
                        }
                    }
                }
            }
        };

        // Render loop
        const render = () => {
            timeoutRef.current = setTimeout(render, 1000 / 30); // 30 FPS
            time += 0.033; // ~30fps delta
            idleTime += 0.033;

            if (model) {
                // Reset to initial position (keep body still)
                model.position.copy(initialPosition);
                model.rotation.copy(initialRotation);

                // Idle animation - very gentle breathing
                if (animationType === 'idle') {
                    const breathe = Math.sin(idleTime * 0.8) * 0.02;
                    model.position.y = initialPosition.y + breathe;
                }

                // Speaking animation - lip-sync with blendshapes
                if (animationType === 'speaking' && lipSyncAnimation) {
                    // Gentle bobbing while speaking
                    const speakBob = Math.sin(time * 2) * 0.03;
                    model.position.y = initialPosition.y + speakBob;

                    // Get blendshape weights for current time
                    const blendWeights = getBlendWeightsAtTime(
                        lipSyncAnimation,
                        currentAnimationTime
                    );

                    // Apply blendshapes
                    applyBlendshapes(blendWeights);

                    // Animate jaw bone if available
                    if (jawBone && blendWeights.jawOpen !== undefined) {
                        // Rotate jaw to open mouth
                        jawBone.rotation.x = blendWeights.jawOpen * 0.3; // Radians
                    }
                } else {
                    // Reset blendshapes to neutral when not speaking
                    applyBlendshapes({
                        jawOpen: 0,
                        mouthSmile: 0,
                        mouthFunnel: 0,
                        mouthPucker: 0,
                        mouthRollLower: 0,
                        mouthRollUpper: 0,
                    });

                    if (jawBone) {
                        jawBone.rotation.x = 0;
                    }
                }

                // Celebrating animation - jump
                if (animationType === 'celebrating' && !isJumping) {
                    isJumping = true;
                    jumpStartTime = time;
                }

                if (isJumping) {
                    const elapsed = time - jumpStartTime;
                    const jumpDuration = 0.6;

                    if (elapsed < jumpDuration) {
                        const progress = elapsed / jumpDuration;
                        const jumpHeight = Math.sin(progress * Math.PI) * 0.5;
                        model.position.y = initialPosition.y + jumpHeight;

                        // Add a smile during celebration
                        applyBlendshapes({
                            mouthSmile: 0.8,
                        });
                    } else {
                        isJumping = false;
                        model.position.y = initialPosition.y;
                    }
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
