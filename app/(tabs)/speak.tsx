import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Avatar, { AvatarState } from "../../components/Avatar";

export default function SpeakScreen() {
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");

  const handleMicPress = () => {
    setAvatarState("listening");

    setTimeout(() => {
      setAvatarState("happy");
    }, 2000);

    setTimeout(() => {
      setAvatarState("idle");
    }, 3500);
  };

  return (
    <View style={styles.container}>
      <Avatar state={avatarState} />

      <Text style={styles.prompt}>Say the word: RED</Text>

      <TouchableOpacity style={styles.micButton} onPress={handleMicPress}>
        <Text style={styles.micText}>🎤</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  prompt: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
  },
  micButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FF5252",
    alignItems: "center",
    justifyContent: "center",
  },
  micText: {
    fontSize: 40,
    color: "#fff",
  },
});
