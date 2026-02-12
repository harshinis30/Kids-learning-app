import { Asset } from "expo-asset";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

interface CinematicIntroProps {
  onComplete: () => void;
  isStarting?: boolean;
}

type IntroScene =
  | "solar-system"
  | "rocket-malfunction"
  | "crash-landing"
  | "ziblo-emerges"
  | "complete";

export function CinematicIntro({
  onComplete,
  isStarting = false,
}: CinematicIntroProps) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isStartingRef = useRef(isStarting);

  useEffect(() => {
    isStartingRef.current = isStarting;
  }, [isStarting]);

  const onContextCreate = async (gl: any) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000,
    );

    // Animation state
    let currentScene: IntroScene = "solar-system";
    let sceneTime = 0;
    let totalTime = 0;

    // === SCENE 1: SOLAR SYSTEM ===

    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 200;
      starPositions[i + 1] = (Math.random() - 0.5) * 200;
      starPositions[i + 2] = (Math.random() - 0.5) * 200;
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3),
    );
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      transparent: true,
      opacity: 0.9,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Planets
    const planets: THREE.Mesh[] = [];
    const planetData = [
      { size: 0.8, color: 0xff6b6b, distance: 8, speed: 0.5, name: "red" },
      { size: 1.2, color: 0x4ecdc4, distance: 12, speed: 0.3, name: "cyan" },
      { size: 1.5, color: 0xffe66d, distance: 16, speed: 0.2, name: "yellow" },
      {
        size: 2.0,
        color: 0xff6b9d,
        distance: 20,
        speed: 0.15,
        name: "lexiconia",
      }, // Lexiconia
      { size: 1.0, color: 0x95e1d3, distance: 24, speed: 0.1, name: "green" },
    ];

    planetData.forEach((data) => {
      const geometry = new THREE.SphereGeometry(data.size, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: data.name === "lexiconia" ? 0.5 : 0.2,
        roughness: 0.7,
      });
      const planet = new THREE.Mesh(geometry, material);
      planet.userData = {
        distance: data.distance,
        speed: data.speed,
        name: data.name,
      };
      planets.push(planet);
      scene.add(planet);
    });

    // Sun (center)
    const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 1,
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Sun glow
    const glowGeometry = new THREE.SphereGeometry(3.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffa500,
      transparent: true,
      opacity: 0.3,
    });
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(sunGlow);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffd700, 2, 100);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // === SCENE 2: ROCKET ===

    // Rocket (simple geometric rocket)
    const rocketGroup = new THREE.Group();

    // Rocket body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      metalness: 0.6,
      roughness: 0.4,
    });
    const rocketBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    rocketGroup.add(rocketBody);

    // Rocket nose
    const noseGeometry = new THREE.ConeGeometry(0.3, 0.6, 16);
    const noseMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.2,
    });
    const rocketNose = new THREE.Mesh(noseGeometry, noseMaterial);
    rocketNose.position.y = 1.3;
    rocketGroup.add(rocketNose);

    // Rocket fins
    for (let i = 0; i < 3; i++) {
      const finGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.4);
      const finMaterial = new THREE.MeshStandardMaterial({
        color: 0x3498db,
        metalness: 0.5,
        roughness: 0.5,
      });
      const fin = new THREE.Mesh(finGeometry, finMaterial);
      const angle = (i / 3) * Math.PI * 2;
      fin.position.x = Math.cos(angle) * 0.3;
      fin.position.z = Math.sin(angle) * 0.3;
      fin.position.y = -0.8;
      fin.rotation.y = angle;
      rocketGroup.add(fin);
    }

    // Rocket flame
    const flameGeometry = new THREE.ConeGeometry(0.25, 0.8, 8);
    const flameMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b00,
      transparent: true,
      opacity: 0.8,
    });
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.y = -1.4;
    flame.rotation.x = Math.PI;
    rocketGroup.add(flame);

    rocketGroup.position.set(30, 5, -10);
    rocketGroup.visible = false;
    scene.add(rocketGroup);

    // Rocket trail particles
    const trailParticles: THREE.Mesh[] = [];
    for (let i = 0; i < 20; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6b00,
        transparent: true,
        opacity: 0.6,
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.visible = false;
      trailParticles.push(particle);
      scene.add(particle);
    }

    // Spark particles
    const sparkParticles: THREE.Mesh[] = [];
    for (let i = 0; i < 15; i++) {
      const sparkGeometry = new THREE.SphereGeometry(0.05, 6, 6);
      const sparkMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8,
      });
      const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
      spark.visible = false;
      sparkParticles.push(spark);
      scene.add(spark);
    }

    // === SCENE 3: CRASH LANDING ===

    // Ground/Planet surface
    const groundGeometry = new THREE.CircleGeometry(20, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x7bed9f,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.visible = false;
    scene.add(ground);

    // Crash dust particles
    const dustParticles: THREE.Mesh[] = [];
    for (let i = 0; i < 30; i++) {
      const dustGeometry = new THREE.SphereGeometry(0.15, 6, 6);
      const dustMaterial = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.5,
      });
      const dust = new THREE.Mesh(dustGeometry, dustMaterial);
      dust.visible = false;
      dustParticles.push(dust);
      scene.add(dust);
    }

    // === SCENE 4: ZIBLO ===

    let ziblo: THREE.Group | null = null;
    try {
      const asset = Asset.fromModule(require("../assets/models/character.glb"));
      await asset.downloadAsync();

      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(asset.localUri || asset.uri, resolve, undefined, reject);
      });

      ziblo = gltf.scene;
      ziblo.scale.set(1.5, 1.5, 1.5);
      ziblo.position.set(2, -4, 0);
      ziblo.visible = false;
      scene.add(ziblo);

      // Add glow to Ziblo
      ziblo.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).emissive =
              new THREE.Color(0x4a90e2);
            (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
              0.3;
          }
        }
      });
    } catch (error) {
      console.error("Error loading Ziblo:", error);
    }

    // Initial camera position
    camera.position.set(0, 5, 30);
    camera.lookAt(0, 0, 0);

    // Animation variables
    let rocketShakeIntensity = 0;
    let flameFlicker = 1;
    let crashDustActive = false;
    let zibloWalkProgress = 0;

    // Render loop
    const render = () => {
      timeoutRef.current = setTimeout(render, 1000 / 30);
      const delta = 0.033;
      sceneTime += delta;
      totalTime += delta;

      // === SCENE 1: SOLAR SYSTEM (0-7s) ===
      if (currentScene === "solar-system") {
        // Rotate stars slowly
        stars.rotation.y += 0.0005;
        stars.rotation.x += 0.0002;

        // Animate planets orbiting
        planets.forEach((planet, index) => {
          const data = planet.userData;
          const angle = sceneTime * data.speed;
          planet.position.x = Math.cos(angle) * data.distance;
          planet.position.z = Math.sin(angle) * data.distance;
          planet.rotation.y += 0.01;

          // Lexiconia glows more
          if (data.name === "lexiconia") {
            const material = planet.material as THREE.MeshStandardMaterial;
            material.emissiveIntensity = 0.5 + Math.sin(sceneTime * 2) * 0.2;
          }
        });

        // Sun pulsing
        sunGlow.scale.setScalar(1 + Math.sin(sceneTime * 2) * 0.1);

        // Camera pan across solar system
        camera.position.x = Math.sin(sceneTime * 0.2) * 15;
        camera.position.z = 30 - sceneTime * 2;
        camera.lookAt(0, 0, 0);

        // Transition to next scene
        if (sceneTime > 7) {
          currentScene = "rocket-malfunction";
          sceneTime = 0;
          rocketGroup.visible = true;
          trailParticles.forEach((p) => (p.visible = true));
        }
      }

      // === SCENE 2: ROCKET MALFUNCTION (7-15s) ===
      else if (currentScene === "rocket-malfunction") {
        // Rocket flies across
        rocketGroup.position.x = 30 - sceneTime * 4;
        rocketGroup.position.y = 5 + Math.sin(sceneTime * 2) * 0.5;
        rocketGroup.rotation.z = -0.3;

        // Trail particles
        trailParticles.forEach((particle, i) => {
          particle.position.copy(rocketGroup.position);
          particle.position.x += i * 0.3;
          particle.position.y -= Math.random() * 0.5;
          const material = particle.material as THREE.MeshBasicMaterial;
          material.opacity = 0.6 - (i / trailParticles.length) * 0.6;
        });

        // Malfunction starts at 3s
        if (sceneTime > 3) {
          rocketShakeIntensity = Math.min((sceneTime - 3) * 0.5, 1);
          rocketGroup.position.x +=
            (Math.random() - 0.5) * rocketShakeIntensity * 0.3;
          rocketGroup.position.y +=
            (Math.random() - 0.5) * rocketShakeIntensity * 0.3;

          // Flame flicker
          flameFlicker = 0.5 + Math.random() * 0.5;
          flame.scale.y = flameFlicker;
          (flame.material as THREE.MeshBasicMaterial).opacity =
            0.4 + flameFlicker * 0.4;

          // Sparks
          if (sceneTime > 4) {
            sparkParticles.forEach((spark, i) => {
              spark.visible = true;
              spark.position.copy(rocketGroup.position);
              spark.position.x += (Math.random() - 0.5) * 2;
              spark.position.y += (Math.random() - 0.5) * 2;
              spark.position.z += (Math.random() - 0.5) * 2;
            });
          }
        }

        // Camera follows rocket
        camera.position.x = rocketGroup.position.x + 5;
        camera.position.y = rocketGroup.position.y;
        camera.position.z = 15 - (sceneTime - 3) * 1.5;
        camera.lookAt(rocketGroup.position);

        // Transition to crash
        if (sceneTime > 8) {
          currentScene = "crash-landing";
          sceneTime = 0;
          ground.visible = true;
          scene.background = new THREE.Color(0x87ceeb);
        }
      }

      // === SCENE 3: CRASH LANDING (15-20s) ===
      else if (currentScene === "crash-landing") {
        // Rocket spirals down
        rocketGroup.position.y = 5 - sceneTime * 2;
        rocketGroup.rotation.z = -0.3 - sceneTime * 2;
        rocketGroup.rotation.x = Math.sin(sceneTime * 3) * 0.5;

        // Camera follows
        camera.position.y = rocketGroup.position.y + 3;
        camera.position.z = 10;
        camera.lookAt(rocketGroup.position);

        // Crash impact
        if (sceneTime > 2.5 && !crashDustActive) {
          crashDustActive = true;
          dustParticles.forEach((dust, i) => {
            dust.visible = true;
            dust.position.set(
              rocketGroup.position.x + (Math.random() - 0.5) * 3,
              -4,
              rocketGroup.position.z + (Math.random() - 0.5) * 3,
            );
          });
        }

        // Animate dust
        if (crashDustActive) {
          dustParticles.forEach((dust) => {
            dust.position.y += 0.05;
            const material = dust.material as THREE.MeshBasicMaterial;
            material.opacity = Math.max(0, 0.5 - (sceneTime - 2.5) * 0.2);
          });
        }

        // Transition to Ziblo emerges
        if (sceneTime > 5) {
          currentScene = "ziblo-emerges";
          sceneTime = 0;
          if (ziblo) ziblo.visible = true;
          sparkParticles.forEach((s) => (s.visible = false));
          trailParticles.forEach((t) => (t.visible = false));
        }
      }

      // === SCENE 4: ZIBLO EMERGES (20-28s) ===
      else if (currentScene === "ziblo-emerges") {
        if (ziblo) {
          // Ziblo walks out
          if (sceneTime < 3) {
            zibloWalkProgress = sceneTime / 3;
            ziblo.position.x = 2 - zibloWalkProgress * 2;
            ziblo.rotation.y = Math.PI / 4;

            // Walking animation
            ziblo.position.y = -4 + Math.abs(Math.sin(sceneTime * 5)) * 0.1;
          } else {
            // Idle animation
            ziblo.position.y = -4 + Math.sin(sceneTime * 1.5) * 0.1;
            ziblo.rotation.y = Math.sin(sceneTime * 0.5) * 0.2;
          }

          // Jetpack glow increases
          if (sceneTime > 5) {
            ziblo.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                  (
                    mesh.material as THREE.MeshStandardMaterial
                  ).emissiveIntensity = 0.3 + Math.sin(sceneTime * 3) * 0.4;
                }
              }
            });
          }
        }

        // Camera moves to face Ziblo
        const targetX = ziblo ? ziblo.position.x : 0;
        camera.position.x += (targetX - camera.position.x) * 0.02;
        camera.position.y += (-2 - camera.position.y) * 0.02;
        camera.position.z += (8 - camera.position.z) * 0.02;
        camera.lookAt(targetX, -3, 0);

        // Complete intro
        if (sceneTime > 8) {
          currentScene = "complete";
          sceneTime = 0;
          onComplete();
        }
      }

      // Jetpack power up on start
      if (isStartingRef.current && ziblo) {
        ziblo.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
                1 + Math.sin(totalTime * 10) * 0.5;
            }
          }
        });
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

  return <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />;
}
