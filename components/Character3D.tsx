/**
 * Character3D.tsx — Rain character via expo-gl + expo-three
 *
 * Uses the same expo-gl/GLTFLoader approach as ModelViewer3D.
 * Morph targets (shape keys) on GEO-rain-head are driven directly in JS
 * via Three.js morphTargetInfluences — no WebView bridge needed.
 *
 * Drop-in replacement — identical props.
 */

import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { LipSyncAnimation, VisemeType } from '../services/lipSyncService';

interface Character3DProps {
  isAnimating?: boolean;
  animationType?: 'idle' | 'speaking' | 'celebrating' | 'encouraging';
  lipSyncAnimation?: LipSyncAnimation | null;
  currentAnimationTime?: number;
  width?: number;
  height?: number;
}

// ─── Viseme → Rain shape key blend weights ───────────────────────────────────
const ALL_MORPH_KEYS = ['sil', 'PP', 'FF', 'TH', 'DD', 'KK', 'CH', 'SS', 'nn', 'RR', 'aa', 'E', 'ih', 'oh', 'ou'];

const VISEME_MORPHS: Record<VisemeType, Record<string, number>> = {
  sil: { sil: 1, PP: 0, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 0, E: 0, ih: 0, oh: 0, ou: 0 },
  AA: { sil: 0, PP: 0, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 1, E: 0, ih: 0, oh: 0, ou: 0 },
  E: { sil: 0, PP: 0, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 0, E: 1, ih: 0, oh: 0, ou: 0 },
  I: { sil: 0, PP: 0, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 0, E: 0, ih: 1, oh: 0, ou: 0 },
  O: { sil: 0, PP: 0, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 0, E: 0, ih: 0, oh: 1, ou: 0 },
  U: { sil: 0, PP: 0, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 0, E: 0, ih: 0, oh: 0, ou: 1 },
  M: { sil: 0, PP: 1, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 0, E: 0, ih: 0, oh: 0, ou: 0 },
  F: { sil: 0, PP: 0, FF: 1, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 0, E: 0, ih: 0, oh: 0, ou: 0 },
  L: { sil: 0, PP: 0, FF: 0, TH: 0, DD: .1, KK: 0, CH: 0, SS: 0, nn: .8, RR: 0, aa: 0, E: .2, ih: 0, oh: 0, ou: 0 },
  W: { sil: 0, PP: 0, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 0, E: 0, ih: 0, oh: .5, ou: .7 },
  TH: { sil: 0, PP: 0, FF: 0, TH: 1, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 0, aa: 0, E: 0, ih: 0, oh: 0, ou: 0 },
  S: { sil: 0, PP: 0, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 1, nn: 0, RR: 0, aa: 0, E: 0, ih: 0, oh: 0, ou: 0 },
  R: { sil: 0, PP: 0, FF: 0, TH: 0, DD: 0, KK: 0, CH: 0, SS: 0, nn: 0, RR: 1, aa: 0, E: 0, ih: 0, oh: 0, ou: 0 },
};

function lp(a: number, b: number, t: number) { return a + (b - a) * t; }

function applyMorphs(
  mesh: THREE.Mesh | null,
  weights: Record<string, number>
) {
  if (!mesh?.morphTargetInfluences || !mesh.morphTargetDictionary) return;
  for (const [k, v] of Object.entries(weights)) {
    const idx = mesh.morphTargetDictionary[k];
    if (idx !== undefined) mesh.morphTargetInfluences[idx] = v;
  }
}

// ─── React component ──────────────────────────────────────────────────────────
export function Character3D({
  animationType = 'idle',
  lipSyncAnimation = null,
  currentAnimationTime = 0,
  width,
  height,
}: Character3DProps) {
  const animTypeRef = useRef(animationType);
  const lipSyncRef = useRef(lipSyncAnimation);
  const animTimeRef = useRef(currentAnimationTime);
  const mountedRef = useRef(true);

  // Keep refs fresh every render (no re-subscribe needed)
  animTypeRef.current = animationType;
  lipSyncRef.current = lipSyncAnimation;
  animTimeRef.current = currentAnimationTime;

  // Scene objects we drive each frame
  const headMeshRef = useRef<THREE.Mesh | null>(null);
  const gumsMeshRef = useRef<THREE.Mesh | null>(null);
  const tongueMeshRef = useRef<THREE.Mesh | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const frameRef = useRef<number>(0);

  // Morph lerp state (lives outside React render cycle)
  const morphCur = useRef<Record<string, number>>({});
  const morphTgt = useRef<Record<string, number>>({});
  ALL_MORPH_KEYS.forEach(k => {
    if (morphCur.current[k] === undefined) morphCur.current[k] = 0;
    if (morphTgt.current[k] === undefined) morphTgt.current[k] = 0;
  });
  morphCur.current['sil'] = 1;
  morphTgt.current['sil'] = 1;

  // Animation timing state
  const animState = useRef({
    time: 0,
    blinkT: 0,
    nextBlink: 2.0,
    celebT: -1,
    encT: -1,
    partT: 0,
    rootY: 0,
  });

  const resolveViseme = (): VisemeType => {
    const ls = lipSyncRef.current;
    const t = animTimeRef.current;
    if (!ls) {
      const phase = (Date.now() / 220) % (2 * Math.PI);
      return phase < 1 ? 'AA' : phase < 2 ? 'M' : phase < 3 ? 'O' : 'sil';
    }
    let active = ls.keyframes[0];
    for (const kf of ls.keyframes) {
      if (t >= kf.time && t < kf.time + kf.duration) { active = kf; break; }
    }
    return active ? active.viseme : 'sil';
  };

  const setMorphTarget = (viseme: VisemeType) => {
    const v = VISEME_MORPHS[viseme] ?? VISEME_MORPHS['sil'];
    ALL_MORPH_KEYS.forEach(k => { morphTgt.current[k] = v[k] ?? 0; });
  };

  const onContextCreate = async (gl: any) => {
    if (!mountedRef.current) return;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000, 0);
    // Cast to any for extended Three.js WebGLRenderer props not in expo-three types
    const r = renderer as any;
    r.outputEncoding = 3001;        // sRGBEncoding
    r.physicallyCorrectLights = true;
    r.toneMapping = 4;              // ACESFilmicToneMapping
    r.toneMappingExposure = 1.1;

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Camera ─────────────────────────────────────────────────────────────
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.01, 100);
    // Point lower so the character is higher up on the screen
    camera.position.set(0, 1.35, 1.0);
    camera.lookAt(0, 1.35, 0);

    // ── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffeedd, 1.2));
    const key = new THREE.DirectionalLight(0xfff5e0, 2.5);
    key.position.set(1.5, 3.5, 3); scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8d8ff, 1.0);
    fill.position.set(-2.5, 2, 1.5); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8c0, 0.8);
    rim.position.set(0, 3, -4); scene.add(rim);

    // ── Load Rain GLB ───────────────────────────────────────────────────────
    try {
      const asset = Asset.fromModule(require('../assets/models/rain_v3.2.glb'));
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;

      const loader = new GLTFLoader();
      loader.load(uri, (gltf) => {
        if (!mountedRef.current) return;
        const model = gltf.scene;

        // Auto-scale to ~1.6 scene units tall
        const bb = new THREE.Box3().setFromObject(model);
        const sz = new THREE.Vector3(); bb.getSize(sz);
        const sc = 1.6 / sz.y;
        model.scale.setScalar(sc);
        const ctr = new THREE.Vector3(); bb.getCenter(ctr);
        model.position.set(-ctr.x * sc, -bb.min.y * sc, -ctr.z * sc);
        scene.add(model);

        // Collect morph meshes and fix WebGL skinning
        model.traverse((obj) => {
          obj.frustumCulled = false; // Prevent T-pose / disappearing meshes bug
          
          // Drop arms to resting position (A-pose)
          if ((obj as any).isBone) {
            if (obj.name === 'DEF-Upperarm1.L' || obj.name === 'DEF-Upperarm2.L') {
              obj.rotation.z -= 1.2;
              obj.rotation.x -= 0.1;
            } else if (obj.name === 'DEF-Upperarm1.R' || obj.name === 'DEF-Upperarm2.R') {
              obj.rotation.z += 1.2;
              obj.rotation.x += 0.1;
            }
          }

          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;

          // Fix transparent sorting issues or strange artifacts (especially eyes / eyelashes)
          if (mesh.material) {
            const fixMat = (m: THREE.Material) => {
              m.depthWrite = true;
              m.side = THREE.DoubleSide;
              // Fix for glTF alpha blend issues (ex: eyes looking weird or eyelashes hiding geometry)
              if (m.transparent) {
                m.transparent = false;
                m.alphaTest = 0.5;
              }
            };
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(fixMat);
            } else {
              fixMat(mesh.material);
            }
          }

          if (!mesh.morphTargetDictionary) return;
          if (obj.name === 'GEO-rain-head') headMeshRef.current = mesh;
          if (obj.name === 'GEO-rain-gums_lower') gumsMeshRef.current = mesh;
          if (obj.name === 'GEO-rain-tongue') tongueMeshRef.current = mesh;
          mesh.castShadow = true;
        });

        // Animation mixer
        if (gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          mixerRef.current = mixer;
          // Play first clip as idle base
          const clip = gltf.animations.find(a => /idle/i.test(a.name)) || gltf.animations[0];
          if (clip) mixer.clipAction(clip).play();
        }
      }, undefined, (e) => {
        console.warn('[Character3D] Load error:', e);
      });
    } catch (e) {
      console.warn('[Character3D] Asset error:', e);
    }

    // ── Render loop ─────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    const s = animState.current;

    const render = () => {
      if (!mountedRef.current) return;
      frameRef.current = requestAnimationFrame(render);
      const dt = Math.min(clock.getDelta(), 0.05);
      s.time += dt;
      const t = s.time;
      const sp = Math.min(1, 10 * dt); // lerp speed

      if (mixerRef.current) mixerRef.current.update(dt);

      const anim = animTypeRef.current;

      // ── Viseme target ────────────────────────────────────────────────
      if (anim === 'speaking') {
        setMorphTarget(resolveViseme());
      } else if (anim === 'celebrating') {
        setMorphTarget('E');
      } else if (anim === 'encouraging') {
        setMorphTarget('E');
      } else {
        setMorphTarget('sil');
      }

      // ── Lerp morphs ──────────────────────────────────────────────────
      ALL_MORPH_KEYS.forEach(k => {
        morphCur.current[k] = lp(morphCur.current[k], morphTgt.current[k], sp);
      });
      applyMorphs(headMeshRef.current, morphCur.current);

      // Mouth open on gums/tongue (driven by vowels)
      const mo = Math.max(
        morphCur.current['aa'] ?? 0,
        morphCur.current['oh'] ?? 0,
        (morphCur.current['ou'] ?? 0) * 0.5
      );
      const gums = gumsMeshRef.current;
      const tongue = tongueMeshRef.current;
      if (gums?.morphTargetDictionary?.['mouth_open'] !== undefined)
        gums.morphTargetInfluences![gums.morphTargetDictionary['mouth_open']] = mo;
      if (tongue?.morphTargetDictionary?.['mouth_open'] !== undefined)
        tongue.morphTargetInfluences![tongue.morphTargetDictionary['mouth_open']] = mo;

      // ── Blink via EyelidsClose morphs ────────────────────────────────
      s.blinkT += dt;
      if (s.blinkT > s.nextBlink) { s.blinkT = 0; s.nextBlink = 1.8 + Math.random() * 3.0; }
      const bp = s.blinkT < 0.08 ? s.blinkT / 0.08 : s.blinkT < 0.16 ? 1 - (s.blinkT - 0.08) / 0.08 : 0;
      const hm = headMeshRef.current;
      if (hm?.morphTargetDictionary) {
        ['EyelidsClose.L', 'EyelidsClose.R'].forEach(k => {
          const i = hm.morphTargetDictionary![k];
          if (i !== undefined) hm.morphTargetInfluences![i] = bp;
        });
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, []);



  // Use explicit pixel dimensions if provided, otherwise fall back to flex
  const glStyle = width && height
    ? { width, height }
    : styles.gl;
  const containerStyle = width && height
    ? [styles.container, { width, height }]
    : styles.container;

  return (
    <View style={containerStyle}>
      <GLView style={glStyle} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  gl: { flex: 1 },
});