# Lip-Sync Animation - Quick Reference

## How to Use

### In Your Components

```typescript
import { ttsService } from './services/textToSpeech';
import { LipSyncAnimation } from './services/lipSyncService';

// State
const [lipSync, setLipSync] = useState<LipSyncAnimation | null>(null);
const [time, setTime] = useState(0);

// Speak with lip-sync
await ttsService.speak("Hello!", {
    onAnimationStart: (anim) => setLipSync(anim),
    onAnimationUpdate: (t) => setTime(t),
    onAnimationEnd: () => {
        setLipSync(null);
        setTime(0);
    },
});

// Pass to Scene3D
<Scene3D
    animationType="speaking"
    lipSyncAnimation={lipSync}
    currentAnimationTime={time}
/>
```

## Model Location

The new facial rig is loaded from:
```
source/facial_rig_test_.glb
```

## Testing

Run the demo component to test different phrases:
```typescript
import { LipSyncDemo } from './components/LipSyncDemo';
```

## Visemes Supported

- **AA** - "ah" (father, hot)
- **E** - "eh" (bed, said)
- **I** - "ee" (bee, see)
- **O** - "oh" (boat, show)
- **U** - "oo" (boot, blue)
- **M** - Lips closed (mom, boom)
- **F** - Teeth on lip (fun, very)
- **L** - Tongue visible (love, hello)
- **W** - Lips rounded (wow, quick)
- **TH** - Tongue out (think, this)
- **S** - Teeth together (see, kiss)
- **R** - Slight round (red, car)
- **sil** - Silence/neutral

## Blendshapes Required

Your model should have at least one of these:
- `jawOpen` / `mouthOpen` - For jaw movement
- `mouthSmile` / `smile` - For smile shapes
- `mouthFunnel` / `mouthO` - For O sounds
- `mouthPucker` / `mouthU` - For U sounds

## Performance

- 30 FPS rendering
- 60 FPS animation updates
- Low CPU/memory usage
- Smooth interpolation
