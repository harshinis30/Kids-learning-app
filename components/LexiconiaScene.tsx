import { Asset } from "expo-asset";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

interface LexiconiaSceneProps {
  isStarting?: boolean;
}

export function LexiconiaScene({ isStarting = false }: LexiconiaSceneProps) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isStartingRef = useRef(isStarting);

  useEffect(() => {
    isStartingRef.current = isStarting;
  }, [isStarting]);

  const onContextCreate = async (gl: any) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x0a0520, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0520, 10, 50);

    const camera = new THREE.PerspectiveCamera(
      60,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x6a4c93, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffd700, 0.8);
    mainLight.position.set(5, 10, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x9d84b7, 0.4);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff6b9d, 1, 20);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 100;
      starPositions[i + 1] = (Math.random() - 0.5) * 100;
      starPositions[i + 2] = (Math.random() - 0.5) * 100;
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3),
    );
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Floating word particles
    const particleCount = 30;
    const particles: THREE.Mesh[] = [];
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);

    for (let i = 0; i < particleCount; i++) {
      const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
      });
      const particle = new THREE.Mesh(particleGeometry, material);

      particle.position.set(
        (Math.random() - 0.5) * 15,
        Math.random() * 8 - 2,
        (Math.random() - 0.5) * 15,
      );

      particles.push(particle);
      scene.add(particle);
    }

    // Floating letters
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const letterMeshes: THREE.Mesh[] = [];

    for (let i = 0; i < 15; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 80px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          letters[Math.floor(Math.random() * letters.length)],
          64,
          64,
        );
      }

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.4,
      });
      const sprite = new THREE.Sprite(material) as any;

      sprite.position.set(
        (Math.random() - 0.5) * 20,
        Math.random() * 10 - 2,
        (Math.random() - 0.5) * 20,
      );
      sprite.scale.set(0.8, 0.8, 1);

      letterMeshes.push(sprite);
      scene.add(sprite);
    }

    // Load Ziblo character
    let ziblo: THREE.Group | null = null;
    let zibloMixer: THREE.AnimationMixer | null = null;

    try {
      const asset = Asset.fromModule(require("../assets/models/character.glb"));
      await asset.downloadAsync();

      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(asset.localUri || asset.uri, resolve, undefined, reject);
      });

      ziblo = gltf.scene;
      ziblo.scale.set(2, 2, 2);
      ziblo.position.set(0, -1, 0);
      scene.add(ziblo);

      // Add glow effect to Ziblo
      ziblo.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).emissive =
              new THREE.Color(0x4a90e2);
            (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
              0.2;
          }
        }
      });
    } catch (error) {
      console.error("Error loading Ziblo:", error);
    }

    // Floating platforms
    const platformGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x6a4c93,
      emissive: 0x9d84b7,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.5,
    });

    const platform1 = new THREE.Mesh(platformGeometry, platformMaterial);
    platform1.position.set(-4, -1.5, 2);
    scene.add(platform1);

    const platform2 = new THREE.Mesh(platformGeometry, platformMaterial);
    platform2.position.set(4, -1.5, 2);
    scene.add(platform2);

    // Animation variables
    let time = 0;
    let blinkTimer = 0;
    const blinkInterval = 3 + Math.random() * 2;
    let cameraZoom = 0;

    // Render loop
    const render = () => {
      timeoutRef.current = setTimeout(render, 1000 / 30);
      const delta = 0.033;
      time += delta;

      // Camera slow zoom
      if (cameraZoom < 1) {
        cameraZoom += delta * 0.2;
        camera.position.z = 8 - cameraZoom * 2;
      }

      // Rotate stars slowly
      stars.rotation.y += 0.0002;
      stars.rotation.x += 0.0001;

      // Animate particles
      particles.forEach((particle, i) => {
        particle.position.y += Math.sin(time + i) * 0.01;
        particle.position.x += Math.cos(time * 0.5 + i) * 0.005;
        particle.rotation.y += 0.02;

        const material = particle.material as THREE.MeshBasicMaterial;
        material.opacity = 0.4 + Math.sin(time * 2 + i) * 0.2;
      });

      // Animate floating letters
      letterMeshes.forEach((letter, i) => {
        letter.position.y += Math.sin(time * 0.5 + i * 0.5) * 0.01;
        letter.position.x += Math.cos(time * 0.3 + i * 0.3) * 0.005;
        const material = letter.material as THREE.SpriteMaterial;
        material.opacity = 0.3 + Math.sin(time + i) * 0.1;
      });

      // Animate platforms
      platform1.position.y = -1.5 + Math.sin(time * 0.8) * 0.2;
      platform2.position.y = -1.5 + Math.sin(time * 0.8 + Math.PI) * 0.2;
      platform1.rotation.y += 0.005;
      platform2.rotation.y -= 0.005;

      // Animate Ziblo
      if (ziblo) {
        // Idle floating animation
        ziblo.position.y = -1 + Math.sin(time * 1.5) * 0.15;
        ziblo.rotation.y = Math.sin(time * 0.5) * 0.1;

        // Blinking effect
        blinkTimer += delta;
        if (blinkTimer > blinkInterval) {
          blinkTimer = 0;
        }

        // Jetpack glow on start
        if (isStartingRef.current) {
          ziblo.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                (
                  mesh.material as THREE.MeshStandardMaterial
                ).emissiveIntensity = 0.5 + Math.sin(time * 10) * 0.5;
              }
            }
          });
        }
      }

      // Pulsing rim light
      rimLight.intensity = 1 + Math.sin(time * 2) * 0.3;

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

  return <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />;
}
