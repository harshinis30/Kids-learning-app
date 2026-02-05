import React from "react";
import { View, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";

export type AvatarState = "idle" | "listening" | "happy";

interface AvatarProps {
  state: AvatarState;
}

export default function Avatar({ state }: AvatarProps) {
  const getAnimation = () => {
    switch (state) {
      case "listening":
        return require("../assets/images/avatars/listening.json");
      case "happy":
        return require("../assets/images/avatars/happy.json");
      default:
        return require("../assets/images/avatars/idle.json");
    }
  };

  return (
    <View style={styles.container}>
      <LottieView
        source={getAnimation()}
        autoPlay
        loop={state !== "happy"}
        style={styles.avatar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
});
