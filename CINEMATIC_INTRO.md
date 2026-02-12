# 🎬 Cinematic Landing Page - Complete Guide

A 20-30 second animated intro sequence that tells Ziblo's story before the learning experience begins.

## 🎭 Story Sequence

### Scene 1: Solar System (0-7 seconds)

**Visual:**

- Deep space with 1000 twinkling stars
- Colorful cartoon solar system with 5 planets orbiting a glowing sun
- Lexiconia (pink planet) glows brighter than others
- Camera pans slowly across the solar system

**Text Overlay:**

- "In a distant galaxy..."
- "The planet Lexiconia shines bright"

**Audio:**

- Soft magical background music begins
- Ambient space sounds

**Technical:**

- Planets orbit at different speeds
- Sun pulses gently
- Stars rotate slowly for depth
- Camera position: `(sin(t)*15, 5, 30-t*2)`

---

### Scene 2: Rocket Malfunction (7-15 seconds)

**Visual:**

- Cute red rocket flies across screen
- Glowing orange particle trail follows
- At 3s: Rocket starts shaking
- Flame flickers erratically
- Yellow sparks burst from sides
- Camera follows rocket closely

**Text Overlay:**

- "⚠️ System Malfunction!"
- "Ziblo's rocket is in trouble"

**Audio:**

- Rocket engine sound
- Alarm beeping (at 3s)
- Crackling/sparking sounds

**Technical:**

- Rocket position: `x = 30 - time*4`
- Shake intensity increases over time
- 20 trail particles fade based on distance
- 15 spark particles appear randomly
- Camera tracks rocket with zoom-in

---

### Scene 3: Crash Landing (15-20 seconds)

**Visual:**

- Background transitions to blue sky
- Green ground appears below
- Rocket spirals downward (not violent)
- Soft impact at 2.5s
- 30 dust particles burst outward
- Dust slowly rises and fades
- Camera follows descent

**Text Overlay:**

- "Emergency Landing!"
- "Approaching unknown planet..."

**Audio:**

- Whooshing wind sound
- Soft thud on impact
- Dust settling sounds

**Technical:**

- Rocket rotation: `z = -0.3 - time*2`
- Spiral effect: `x = sin(time*3)*0.5`
- Dust particles spread radially
- Opacity fades: `0.5 - (time-2.5)*0.2`

---

### Scene 4: Ziblo Emerges (20-28 seconds)

**Visual:**

- Rocket door opens (implied)
- Ziblo walks out slowly (0-3s)
- Stops and looks around
- Idle floating animation begins
- Jetpack starts glowing (5s+)
- Camera moves to face Ziblo directly

**Text Overlay:**

- "My planet Lexiconia is fading..."
- "I need your help!"
- "✨ When spoken correctly, words glow ✨"
- "🏗️ When written properly, they build worlds 🏗️"

**Audio:**

- Footstep sounds (walking)
- Ziblo's voice: "My planet Lexiconia is fading... I need your help!"
- Soft emotional music swell

**Technical:**

- Walk animation: `x = 2 - progress*2`
- Bob effect: `y = -4 + |sin(time*5)|*0.1`
- Idle float: `y = -4 + sin(time*1.5)*0.1`
- Jetpack glow: `emissiveIntensity = 0.3 + sin(time*3)*0.4`
- Camera smooth lerp to position `(0, -2, 8)`

---

### Scene 5: Call to Action (28+ seconds)

**Visual:**

- Intro complete, scene holds on Ziblo
- UI fades in over 1 second
- Large glowing button appears
- Button pulses softly (1.5s cycle)
- Gradient overlay darkens bottom

**Text:**

- Title: "Become a Language Pilot"
- Subtitle: "Learning isn't homework. It's saving a planet."
- Helper: "Help Ziblo save Lexiconia"

**Interaction:**

- Button press triggers particle burst
- Jetpack glows intensely
- Sound effects play
- Navigates to learning screen after 1.5s

---

## 📁 File Structure

```
app/
  landing.tsx                    # Main landing page orchestrator
components/
  CinematicIntro.tsx            # 3D scene with all 4 intro scenes
  StoryOverlay.tsx              # Text overlays for each scene
  ParticleSystem.tsx            # Particle burst effects
services/
  audioService.ts               # Audio management with scene sounds
```

## 🎨 Visual Design

### Color Palette

- **Space Background:** `#000000` (black)
- **Stars:** `#FFFFFF` (white)
- **Sun:** `#FFD700` (gold)
- **Lexiconia:** `#FF6B9D` (pink) with glow
- **Rocket Body:** `#E74C3C` (red)
- **Rocket Nose:** `#FFFFFF` (white)
- **Rocket Fins:** `#3498DB` (blue)
- **Flame:** `#FF6B00` (orange)
- **Ground:** `#7BED9F` (green)
- **Sky:** `#87CEEB` (light blue)
- **Text Gold:** `#FFD700`
- **Text White:** `#E0E0FF`

### Lighting

- **Ambient Light:** `0xFFFFFF` at 0.3 intensity
- **Sun Point Light:** `0xFFD700` at 2.0 intensity, range 100
- **Scene-specific lighting** adjusts per scene

### Particle Systems

1. **Stars:** 1000 points, size 0.2, slow rotation
2. **Rocket Trail:** 20 spheres, orange, fade by distance
3. **Sparks:** 15 spheres, yellow, random positions
4. **Crash Dust:** 30 spheres, gray, radial burst
5. **Button Burst:** 20 spheres, pink, radial explosion

## 🎮 User Experience

### Skip Option

- "Skip Intro →" button in top-right corner
- Immediately jumps to call-to-action
- Preserves user control

### Timing

- Total intro: ~28 seconds
- Scene 1: 7s (establish setting)
- Scene 2: 8s (build tension)
- Scene 3: 5s (climax)
- Scene 4: 8s (resolution + message)
- Button fade-in: 1s
- Total to interaction: ~29s

### Performance

- Runs at 30 FPS for mobile
- Efficient particle systems
- Proper cleanup on unmount
- Optimized geometry (low poly counts)

## 🔧 Technical Implementation

### Camera Animation

```typescript
// Scene 1: Pan across solar system
camera.position.x = Math.sin(time * 0.2) * 15;
camera.position.z = 30 - time * 2;

// Scene 2: Follow rocket
camera.position.x = rocket.position.x + 5;
camera.position.z = 15 - (time - 3) * 1.5;

// Scene 3: Track descent
camera.position.y = rocket.position.y + 3;

// Scene 4: Smooth lerp to face Ziblo
camera.position.x += (target.x - camera.position.x) * 0.02;
```

### Scene Transitions

```typescript
// Time-based scene switching
if (sceneTime > 7) {
  currentScene = "rocket-malfunction";
  sceneTime = 0;
  // Show/hide relevant objects
}
```

### Animation Blending

- Smooth transitions between animations
- No abrupt changes
- Easing functions for natural motion
- Lerp for camera movements

## 🎵 Audio Integration

### Background Music

- Soft magical loop
- Starts in Scene 1
- Continues throughout
- Fades during transitions

### Sound Effects

1. **Scene 1:** Ambient space sounds
2. **Scene 2:**
   - Rocket engine
   - Alarm beeping
   - Sparking/crackling
3. **Scene 3:**
   - Wind whoosh
   - Soft crash impact
   - Dust settling
4. **Scene 4:**
   - Footsteps
   - Ziblo's voice (TTS or recorded)
   - Emotional music swell
5. **Scene 5:**
   - Button click
   - Jetpack power-up
   - Particle burst

### Implementation

```typescript
// In landing.tsx
useEffect(() => {
  const timers = [
    setTimeout(() => audioService.playAlarmSound(), 10000),
    setTimeout(() => audioService.playCrashSound(), 17500),
    setTimeout(() => audioService.playZibloVoice("..."), 23000),
  ];
  return () => timers.forEach(clearTimeout);
}, []);
```

## 🚀 Usage

### Run the App

```bash
npx expo start
```

### What Happens

1. App opens to black screen
2. Stars fade in
3. Solar system appears
4. 28-second cinematic plays
5. Button fades in
6. User can start mission or skip anytime

### Testing Scenes

To test individual scenes, modify `CinematicIntro.tsx`:

```typescript
// Start at specific scene
let currentScene: IntroScene = "ziblo-emerges"; // Change this
let sceneTime = 0;
```

## 🎯 Customization

### Adjust Timing

Edit scene durations in `landing.tsx`:

```typescript
const sceneTimings = [
  { scene: "solar-system", time: 0 },
  { scene: "rocket-malfunction", time: 7000 }, // Change these
  { scene: "crash-landing", time: 15000 },
  { scene: "ziblo-emerges", time: 20000 },
];
```

### Change Text

Edit `StoryOverlay.tsx`:

```typescript
case 'solar-system':
  text = 'Your custom text here';
  sub = 'Your subtitle';
  break;
```

### Modify Animations

Edit `CinematicIntro.tsx`:

```typescript
// Rocket speed
rocketGroup.position.x = 30 - sceneTime * 4; // Change multiplier

// Planet orbit speed
const angle = sceneTime * data.speed; // Adjust data.speed

// Particle count
const particleCount = 20; // Increase/decrease
```

## 📱 Mobile Optimization

### Performance Tips

- 30 FPS target (not 60) for battery life
- Low-poly models (< 1000 triangles)
- Efficient particle systems (< 50 particles)
- Texture size limits (512x512 max)
- Proper cleanup on unmount

### Responsive Design

- Text scales with screen size
- Button positioned relative to height
- Scene adapts to aspect ratio
- Skip button always accessible

## 🐛 Troubleshooting

### Scene Not Showing

- Check console for WebGL errors
- Verify `character.glb` exists
- Test on physical device (better 3D support)

### Timing Issues

- Adjust scene durations in `sceneTimings`
- Check `sceneTime` increments (delta = 0.033)
- Verify timeout cleanup

### Performance Problems

- Reduce particle counts
- Lower FPS to 20: `1000 / 20`
- Simplify geometry
- Disable shadows

## 🎓 Educational Value

This cinematic intro:

- **Engages emotionally** - Kids care about Ziblo
- **Establishes stakes** - Planet is fading
- **Creates purpose** - Learning saves the world
- **Builds excitement** - Adventure awaits
- **Sets tone** - Playful, magical, safe

The story transforms learning from a chore into a heroic mission!

---

Built with ❤️ to make learning an adventure! 🚀✨
