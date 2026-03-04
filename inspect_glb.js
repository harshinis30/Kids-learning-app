const fs = require('fs');

try {
    const glbPath = './assets/models/rain.glb';
    const buffer = fs.readFileSync(glbPath);

    // The glb is a binary format. The JSON chunk is usually the first chunk.
    const magic = buffer.readUInt32LE(0);
    const version = buffer.readUInt32LE(4);
    const length = buffer.readUInt32LE(8);

    const chunkLength = buffer.readUInt32LE(12);
    const chunkType = buffer.readUInt32LE(16);

    if (magic === 0x46546C67 && chunkType === 0x4E4F534A) {
        const jsonStr = buffer.toString('utf8', 20, 20 + chunkLength);
        const gltf = JSON.parse(jsonStr);

        console.log("Materials:");
        console.log(JSON.stringify(gltf.materials, null, 2));

        console.log("\nTextures:");
        console.log(JSON.stringify(gltf.textures, null, 2));

        console.log("\nImages:");
        console.log(JSON.stringify(gltf.images, null, 2));
    } else {
        console.log("Not a valid GLB or no JSON chunk found first.");
    }
} catch (e) {
    console.error(e);
}
