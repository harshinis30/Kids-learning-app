import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

interface Character3DProps {
    isAnimating?: boolean;
    animationType?: 'idle' | 'speaking' | 'celebrating' | 'encouraging';
}

export function Character3D({
    isAnimating = false,
    animationType = 'idle'
}: Character3DProps) {
    const timeoutRef = useRef<NodeJS.Timeout>();

    const onContextCreate = async (gl: any) => {
        // Create renderer
        const renderer = new Renderer({ gl });
        renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

        // Create scene
        const scene = new THREE.Scene();
        scene.background = null; // Transparent background

        // Create camera
        const camera = new THREE.PerspectiveCamera(
            50,
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 5);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 5, 5);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-5, 3, -5);
        scene.add(directionalLight2);

        // Load GLB model
        let model: THREE.Group | null = null;
        try {
            const asset = Asset.fromModule(require('../assets/models/character.glb'));
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
            model.scale.set(1.5, 1.5, 1.5);
            scene.add(model);
        } catch (error) {
            console.error('Error loading model:', error);
        }

        // Animation variables
        let time = 0;
        let isJumping = false;
        let jumpStartTime = 0;

        // Render loop
        const render = () => {
            timeoutRef.current = setTimeout(render, 1000 / 30); // 30 FPS
            time += 0.016; // ~60fps delta

            if (model) {
                // Idle animation - gentle bobbing
                if (animationType === 'idle') {
                    model.position.y = Math.sin(time * 0.5) * 0.1;
                    model.rotation.y = Math.sin(time * 0.3) * 0.1;
                }

                // Celebrating animation - jump
                if (animationType === 'celebrating' && !isJumping) {
                    isJumping = true;
                    jumpStartTime = time;
                }

                if (isJumping) {
                    const elapsed = time - jumpStartTime;
                    const jumpDuration = 0.5;

                    if (elapsed < jumpDuration) {
                        const progress = elapsed / jumpDuration;
                        const jumpHeight = Math.sin(progress * Math.PI) * 0.5;
                        model.position.y = jumpHeight;
                    } else {
                        isJumping = false;
                        model.position.y = 0;
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
