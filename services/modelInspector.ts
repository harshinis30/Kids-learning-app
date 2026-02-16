// Utility to inspect GLB model structure
// This can be called from the app to log blendshapes and bones

import { Asset } from 'expo-asset';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export interface ModelInspectionReport {
    blendshapes: Array<{
        meshName: string;
        morphTargets: string[];
    }>;
    bones: string[];
    animations: string[];
}

export async function inspectGLBModel(modelPath: any): Promise<ModelInspectionReport> {
    const report: ModelInspectionReport = {
        blendshapes: [],
        bones: [],
        animations: []
    };

    try {
        // Load the asset
        const asset = Asset.fromModule(modelPath);
        await asset.downloadAsync();

        // Load the GLTF
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
            loader.load(
                asset.localUri || asset.uri,
                resolve,
                undefined,
                reject
            );
        });

        // Inspect animations
        if (gltf.animations) {
            report.animations = gltf.animations.map((anim: any) => anim.name);
        }

        // Traverse the scene
        gltf.scene.traverse((child: any) => {
            // Check for meshes with morph targets (blendshapes)
            if (child.isMesh && child.morphTargetDictionary) {
                const morphTargets = Object.keys(child.morphTargetDictionary);
                report.blendshapes.push({
                    meshName: child.name,
                    morphTargets
                });
            }

            // Check for bones
            if (child.isBone || child.type === 'Bone') {
                report.bones.push(child.name);
            }
        });

        return report;
    } catch (error) {
        console.error('Error inspecting model:', error);
        throw error;
    }
}

// Helper to log the report in a readable format
export function logModelReport(report: ModelInspectionReport) {
    console.log('\n=== MODEL INSPECTION REPORT ===\n');

    console.log('BLENDSHAPES:');
    report.blendshapes.forEach(({ meshName, morphTargets }) => {
        console.log(`\n  Mesh: ${meshName}`);
        morphTargets.forEach(target => {
            console.log(`    - ${target}`);
        });
    });

    console.log('\n\nBONES:');
    report.bones.forEach(bone => {
        console.log(`  - ${bone}`);
    });

    console.log('\n\nANIMATIONS:');
    report.animations.forEach(anim => {
        console.log(`  - ${anim}`);
    });

    console.log('\n=== END REPORT ===\n');
}
