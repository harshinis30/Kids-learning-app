/**
 * Quick GLB inspector - reads morph target names from a GLB file
 * Run: node scripts/inspect_glb.mjs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const GLB_PATH = resolve('./assets/Rain v3.3/rain_v3.2.glb');

const buf = readFileSync(GLB_PATH);

// GLB header: magic(4) version(4) length(4) = 12 bytes
// Chunk 0: chunkLength(4) chunkType(4) chunkData(chunkLength)
const magic = buf.readUInt32LE(0);
if (magic !== 0x46546C67) {
    console.error('Not a valid GLB file!');
    process.exit(1);
}

const chunk0Len = buf.readUInt32LE(12);
const jsonStr = buf.slice(20, 20 + chunk0Len).toString('utf8').replace(/\0+$/, '');
const gltf = JSON.parse(jsonStr);

console.log('\n=== MESH MORPH TARGETS ===\n');
if (!gltf.meshes) {
    console.log('No meshes found.');
} else {
    gltf.meshes.forEach((mesh, mi) => {
        console.log(`Mesh [${mi}]: "${mesh.name}"`);
        if (mesh.extras && mesh.extras.targetNames) {
            console.log('  Shape keys (targetNames):', mesh.extras.targetNames);
        }
        mesh.primitives?.forEach((prim, pi) => {
            if (prim.extras && prim.extras.targetNames) {
                console.log(`  Prim[${pi}] shape keys:`, prim.extras.targetNames);
            }
            if (prim.targets && prim.targets.length > 0) {
                console.log(`  Prim[${pi}] has ${prim.targets.length} morph targets`);
            }
        });
    });
}

console.log('\n=== ANIMATIONS ===\n');
if (gltf.animations) {
    gltf.animations.forEach((a, i) => console.log(`  [${i}] "${a.name}"`));
} else {
    console.log('No animations.');
}

console.log('\n=== NODES ===\n');
if (gltf.nodes) {
    gltf.nodes.slice(0, 30).forEach((n, i) => {
        if (n.name) console.log(`  [${i}] "${n.name}"`);
    });
    if (gltf.nodes.length > 30) console.log(`  ... and ${gltf.nodes.length - 30} more`);
}
