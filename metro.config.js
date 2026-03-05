const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add GLB file support
config.resolver.assetExts.push('glb', 'gltf', 'bin', 'onnx');

module.exports = config;
