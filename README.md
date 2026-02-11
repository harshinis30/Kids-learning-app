# 🎓 Kids Pronunciation Learning App

An interactive pronunciation learning app for children ages 2-7 with a 3D animated character, speech recognition, and encouraging feedback.

## ✨ Features

- 🤖 **3D Animated Character** - Cute alien that moves and celebrates with you
- 🗣️ **Text-to-Speech** - Character speaks words and encourages kids
- 🎤 **Audio Recording** - Records pronunciation attempts
- 📊 **Progress Tracking** - Saves achievements and daily streaks
- 🎨 **Child-Friendly UI** - Vibrant colors, large buttons, fun animations
- 📚 **10 Starter Words** - From "apple" to "juice" with phonetic guides

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run on Your Phone
```bash
npx expo start
```
Scan the QR code with Expo Go app on your phone.

### Run on Emulator
```bash
npx expo run:android  # Android
npx expo run:ios      # iOS
```

> **Note:** Test on a physical device for best 3D rendering and microphone performance!

## 📱 How It Works

1. **Character introduces a word** (e.g., "This is apple. Apple.")
2. **Character asks child to repeat** ("Now you try! Say apple.")
3. **Child taps the microphone button** and speaks
4. **App analyzes pronunciation** and gives encouraging feedback
5. **Success!** Character celebrates, or encourages another try

## 🎯 Current Status

**✅ Fully Functional:**
- 3D character rendering and animations
- Text-to-speech with child-friendly voice
- Audio recording
- Progress tracking
- Complete learning flow

**⏳ In Progress:**
- Speech recognition currently uses simulated accuracy
- Ready for Wav2Vec2 ONNX model integration for real phoneme detection

## 📁 Key Files

- `app/(tabs)/learn.tsx` - Main learning screen
- `components/Character3D.tsx` - 3D character component
- `services/textToSpeech.ts` - TTS service
- `services/progressTracker.ts` - Progress tracking
- `data/learningWords.ts` - Word database

## 🔧 Next Steps

1. Integrate Wav2Vec2 ONNX model for real speech recognition
2. Add more words and difficulty levels
3. Implement lip-sync for character
4. Create parent dashboard

## 📖 Documentation

See [walkthrough.md](../../../.gemini/antigravity/brain/76f4df94-add1-4c5a-b4c8-356cf2d600fc/walkthrough.md) for detailed documentation.

## 🎨 Tech Stack

- React Native + Expo
- Three.js for 3D graphics
- expo-speech for TTS
- expo-av for audio recording
- AsyncStorage for progress tracking

---

Built with ❤️ for kids learning pronunciation!
