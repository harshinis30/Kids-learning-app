/**
 * Type declaration shim for Three.js JSM loaders.
 * Metro bundler resolves these at runtime, but tsc needs this to typecheck.
 */
declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import * as THREE from 'three';

    export interface GLTF {
        animations: THREE.AnimationClip[];
        scene: THREE.Group;
        scenes: THREE.Group[];
        cameras: THREE.Camera[];
        asset: Record<string, string>;
    }

    export class GLTFLoader extends THREE.Loader {
        load(
            url: string,
            onLoad: (gltf: GLTF) => void,
            onProgress?: (event: ProgressEvent) => void,
            onError?: (event: ErrorEvent | Error) => void,
        ): void;
        loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<GLTF>;
    }
}
