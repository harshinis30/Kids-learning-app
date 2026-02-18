# Character Rendering Troubleshooting

## Issue: White Outline/Silhouette

The character appears as a small white outline instead of a fully rendered 3D model.

### Root Cause
The GLB model (`source/facial_rig_test_.glb`) likely has one of these issues:
1. **Missing embedded textures** - Textures are referenced but not included in the GLB
2. **White/default materials** - Materials exist but have no color information
3. **Missing materials** - Some meshes have no material assigned

### Current Fixes Applied

1. **Material Fallback System**:
   - Detects meshes without materials and creates default skin-tone material
   - Checks for white materials (brightness > 0.95) and replaces with skin tone
   - Brightens dark materials automatically

2. **Enhanced Logging**:
   - Logs all meshes found in the model
   - Shows material types and colors
   - Warns about missing or problematic materials

3. **Material Configuration**:
   - DoubleSide rendering (shows both faces)
   - Smooth shading enabled
   - Proper roughness/metalness values
   - Slight emissive glow for visibility

### Check Console Output

When the app runs, look for these logs:
```
🎨 Processing materials...
📦 Mesh found: [name]
  Material 0: MeshStandardMaterial
    Color: rgb(255, 219, 172)
```

If you see:
- `⚠️ No material` - Mesh has no material (now fixed with fallback)
- `⚠️ No color property` - Material missing color (now fixed)
- `⚠️ Material too white` - Likely missing texture (now replaced with skin tone)

### Permanent Solution

**Re-export the model** with these settings:

#### In Blender:
1. File → Export → glTF 2.0 (.glb)
2. **Enable these options**:
   - ✅ Remember Export Settings
   - ✅ Include → Selected Objects (or all)
   - ✅ Transform → +Y Up
   - ✅ Geometry → Apply Modifiers
   - ✅ Geometry → UVs
   - ✅ Geometry → Normals
   - ✅ Geometry → Vertex Colors
   - ✅ Material → Materials
   - ✅ **Material → Images** (CRITICAL!)
   - Format: glTF Binary (.glb)

3. **Before exporting**:
   - Select all materials in Shader Editor
   - Ensure each material has proper Base Color
   - If using textures, ensure they're packed (File → External Data → Pack Resources)
   - Check that materials aren't pure white (#FFFFFF)

#### Recommended Material Setup:
```
Skin: #FFDBAC (peachy skin tone)
Hair: #8B4513 (brown) or appropriate color
Eyes: #FFFFFF (white) with #000000 (black) pupils
Clothes: Any vibrant color
```

### Alternative: Use a Different Model

If re-exporting doesn't work, try:
1. Use a pre-made character from Mixamo, Ready Player Me, or Sketchfab
2. Ensure the model has:
   - Embedded textures or vertex colors
   - Facial blendshapes (for lip-sync)
   - Jaw bone (optional but recommended)

### Test the Fix

Run the app and check:
1. ✅ Character has color (not white)
2. ✅ Character is visible and properly sized
3. ✅ Console shows material colors (not warnings)
4. ✅ Lip-sync animation works when speaking

### Current Workaround

The code now applies a default skin tone (#FFDBAC) to any white or missing materials. This should make the character visible, but it won't have the original textures/colors from your model.
