// Script to inspect the facial rig GLB model structure
// This will help us understand available blendshapes and bones

const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader');
const fs = require('fs');
const path = require('path');

async function inspectModel() {
    const modelPath = path.join(__dirname, '..', 'source', 'facial_rig_test_.glb');

    console.log('Loading model from:', modelPath);

    const loader = new GLTFLoader();

    // Read the file
    const fileBuffer = fs.readFileSync(modelPath);
    const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
    );

    loader.parse(arrayBuffer, '', (gltf) => {
        console.log('\n=== MODEL STRUCTURE ===\n');

        const blendshapes = [];
        const bones = [];

        gltf.scene.traverse((child) => {
            // Check for meshes with morph targets (blendshapes)
            if (child.isMesh && child.morphTargetDictionary) {
                console.log(`\nMesh: ${child.name}`);
                console.log('Morph Targets (Blendshapes):');
                Object.keys(child.morphTargetDictionary).forEach(name => {
                    const index = child.morphTargetDictionary[name];
                    console.log(`  - ${name} (index: ${index})`);
                    blendshapes.push(name);
                });
            }

            // Check for bones
            if (child.isBone || child.type === 'Bone') {
                bones.push(child.name);
                console.log(`Bone: ${child.name}`);
            }
        });

        console.log('\n=== SUMMARY ===');
        console.log(`Total Blendshapes: ${blendshapes.length}`);
        console.log(`Total Bones: ${bones.length}`);

        // Save to JSON for reference
        const report = {
            blendshapes,
            bones,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(__dirname, '..', 'model-inspection-report.json'),
            JSON.stringify(report, null, 2)
        );

        console.log('\nReport saved to model-inspection-report.json');
    }, (error) => {
        console.error('Error loading model:', error);
    });
}

inspectModel().catch(console.error);
