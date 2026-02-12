import { Audio } from "expo-av";

class AudioService {
  private backgroundMusic: Audio.Sound | null = null;
  private soundEffects: Map<string, Audio.Sound> = new Map();

  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  }

  async playBackgroundMusic() {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.playAsync();
        return;
      }

      // For now, we'll use a simple tone generator
      // In production, you'd load an actual music file
      console.log("Background music would play here");
    } catch (error) {
      console.error("Failed to play background music:", error);
    }
  }

  async stopBackgroundMusic() {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.stopAsync();
      }
    } catch (error) {
      console.error("Failed to stop background music:", error);
    }
  }

  async playButtonClick() {
    try {
      // Simple click sound using Audio
      const { sound } = await Audio.Sound.createAsync(
        {
          uri: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0vBSh+zPDajzsKElyx6OyrWBUIQ5zd8sFuJAUuhM/z24k2CBhku+zooVARC0yl4fG5ZRwFNo3V7859LwUofsz",
        },
        { shouldPlay: true },
      );

      setTimeout(() => {
        sound.unloadAsync();
      }, 1000);
    } catch (error) {
      console.error("Failed to play click sound:", error);
    }
  }

  async playJetpackGlow() {
    try {
      console.log("Jetpack glow sound would play here");
      // In production, load actual sound effect
    } catch (error) {
      console.error("Failed to play jetpack sound:", error);
    }
  }

  async playAlarmSound() {
    try {
      console.log("Alarm sound would play here");
      // In production: require('../assets/audio/alarm.mp3')
    } catch (error) {
      console.error("Failed to play alarm sound:", error);
    }
  }

  async playCrashSound() {
    try {
      console.log("Crash sound would play here");
      // In production: require('../assets/audio/crash.mp3')
    } catch (error) {
      console.error("Failed to play crash sound:", error);
    }
  }

  async playZibloVoice(text: string) {
    try {
      console.log(`Ziblo says: "${text}"`);
      // In production: Use expo-speech or audio files
    } catch (error) {
      console.error("Failed to play Ziblo voice:", error);
    }
  }

  async cleanup() {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.unloadAsync();
      }

      for (const [, sound] of this.soundEffects) {
        await sound.unloadAsync();
      }

      this.soundEffects.clear();
    } catch (error) {
      console.error("Failed to cleanup audio:", error);
    }
  }
}

export const audioService = new AudioService();
