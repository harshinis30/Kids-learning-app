/**
 * Stage1Scene1.web.tsx — Web fallback for the Writing Module.
 *
 * @shopify/react-native-skia does NOT support web.
 * This file is automatically used by Metro/Expo on the web platform
 * instead of Stage1Scene1.tsx (which uses Skia and is native-only).
 *
 * The writing module is designed for touch devices (iOS/Android).
 * On web, we show a friendly "open on your phone" message.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Stage1Scene1Web() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🐒</Text>
      <Text style={styles.title}>Writing Practice</Text>
      <Text style={styles.subtitle}>
        This activity uses touch drawing and works best on a phone or tablet.
      </Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>📱 Open on iOS or Android</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  emoji: { fontSize: 72 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFE066',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  badge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
