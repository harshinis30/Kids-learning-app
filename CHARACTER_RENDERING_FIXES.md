# Character Rendering Fixes

## Issues Fixed

### 1. White Silhouette Problem
**Cause**: Materials weren't being properly configured after model loading  
**Fix**: Added material configuration to ensure proper rendering:
- Set `material.needsUpdate = true`
- Configure `material.side = THREE.FrontSide`
- Enable shadow casting/receiving

### 2. Camera & Lighting
**Improvements**:
- Adjusted camera FOV to 45° (from 50°)
- Repositioned camera closer: `(0, 0.5, 2.5)` instead of `(0, 1, 3)`
- Increased ambient light intensity: 0.8 (from 0.6)
- Increased directional light intensity: 1.0 (from 0.8)
- Added fill light from below for better facial visibility
- Enabled shadow casting on main light

### 3. Model Positioning
- Adjusted scale: 1.2 (from 1.5) for better framing
- Lowered position: y = -1 (from -0.5) to center face in view

## Expected Result

The character should now render with:
✅ Proper textures and colors (not white)
✅ Good lighting on face
✅ Centered in view
✅ Visible details (eyes, nose, mouth, hair)

## If Still White

If the character still appears as a white silhouette, the issue may be:

1. **Missing Textures in GLB**: The model file might not have embedded textures
   - Solution: Re-export the model with embedded textures

2. **Model Format Issue**: The GLB might be corrupted
   - Solution: Try re-exporting from Blender/source software

3. **Expo-GL Limitation**: Some material types aren't supported
   - Solution: Use simpler materials (MeshStandardMaterial or MeshPhongMaterial)

## Testing

Run the app and check the console for:
```
=== Facial Rig Loaded ===
Found facial mesh: [mesh name]
Blendshapes: [list of blendshapes]
```

This confirms the model loaded successfully.
