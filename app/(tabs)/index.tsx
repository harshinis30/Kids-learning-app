import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PetCompanion } from '../../components/PetCompanion';
import { STAGE_DESCRIPTIONS, STAGE_NAMES } from '../../data/curriculum';
import { PetEmotion, subscribeToEmotion, triggerEmotion } from '../../services/petService';
import { ProblemArea, problemTracker } from '../../services/problemTracker';
import { ChildProfile, profileService } from '../../services/profileService';
import { progressTracker, SessionRecord } from '../../services/progressTracker';

const ACHIEVEMENT_INFO: Record<string, { emoji: string; label: string }> = {
  first_word: { emoji: '🌱', label: 'First Word!' },
  five_words: { emoji: '🌟', label: '5 Words!' },
  ten_words: { emoji: '🏆', label: '10 Words!' },
  first_star: { emoji: '⭐', label: 'First Star!' },
  ten_stars: { emoji: '💫', label: '10 Stars!' },
  fifty_stars: { emoji: '🎖️', label: '50 Stars!' },
  three_day_streak: { emoji: '🔥', label: '3-Day Streak!' },
};

export default function HomeScreen() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [problemAreas, setProblemAreas] = useState<ProblemArea[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [petEmotion, setPetEmotion] = useState<PetEmotion>('idle');

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const load = useCallback(async () => {
    const p = await profileService.getActiveProfile();
    if (!p) {
      setHasProfile(false);
      return;
    }
    setHasProfile(true);
    setProfile(p);
    const [problems, sessions, achs] = await Promise.all([
      problemTracker.getProblemAreas(p.id),
      progressTracker.getRecentSessions(p.id, 5),
      progressTracker.getAchievements(p.id),
    ]);
    setProblemAreas(problems);
    setRecentSessions(sessions);
    setAchievements(achs);

    // Check if user has been away 1+ days → wave emotion
    const lastPlayed = new Date(p.lastPlayedDate);
    const now = new Date();
    const diffMs = now.getTime() - lastPlayed.getTime();
    if (diffMs > 86400000) {
      triggerEmotion('wave');
    }
  }, []);

  useEffect(() => {
    load();
    // Pulse animation for the CTA button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
    // Subscribe to pet emotion events from other screens
    const unsubscribe = subscribeToEmotion(setPetEmotion);
    return unsubscribe;
  }, []);

  // Redirect to onboarding if no profile — must be in useEffect, not render
  useEffect(() => {
    if (hasProfile === false) {
      router.replace('/onboarding');
    }
  }, [hasProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (hasProfile === false) {
    return null; // Will redirect via useEffect above
  }

  if (!profile) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>🌟</Text>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  const stageColor = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][profile.currentStage - 1];
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFE066" />}
          contentContainerStyle={styles.scroll}
        >
          {/* Header / Greeting */}
          <View style={styles.greetingRow}>
            <View style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
              <Text style={styles.avatarText}>{profile.name[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.profileName}>{profile.name}! 👋</Text>
            </View>
            <TouchableOpacity style={styles.parentBtn} onPress={() => router.push('/(tabs)/parent')}>
              <Text style={styles.parentBtnText}>👨‍👩‍👧</Text>
            </TouchableOpacity>
          </View>

          {/* Pet Companion */}
          <PetCompanion
            totalStars={profile.totalStars}
            profileId={profile.id}
            emotion={petEmotion}
            size="hero"
          />

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statNumber}>{profile.totalStars}</Text>
              <Text style={styles.statLabel}>Stars</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statNumber}>{profile.currentStreak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>📚</Text>
              <Text style={styles.statNumber}>{recentSessions.length}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
          </View>

          {/* Current Stage Card */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Stage</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/learn')} activeOpacity={0.85}>
            <LinearGradient
              colors={[stageColor, stageColor + 'CC']}
              style={styles.stageCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.stageCardContent}>
                <View>
                  <Text style={styles.stageNumber}>Stage {profile.currentStage}</Text>
                  <Text style={styles.stageName}>{STAGE_NAMES[profile.currentStage]}</Text>
                  <Text style={styles.stageDesc}>
                    {STAGE_DESCRIPTIONS[profile.ageGroup][profile.currentStage]}
                  </Text>
                </View>
                <Text style={styles.stageArrow}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* CTA Button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(tabs)/learn')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FFE066', '#FFB347']}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>Continue Learning 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Problem Areas */}
          {problemAreas.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎯 Focus Areas</Text>
                <Text style={styles.sectionSub}>Sounds to practice more</Text>
              </View>
              <View style={styles.problemsContainer}>
                {problemAreas.slice(0, 3).map((p, i) => (
                  <View key={i} style={styles.problemChip}>
                    <Text style={styles.problemLabel}>{p.label}</Text>
                    <View style={styles.problemBar}>
                      <View style={[styles.problemBarFill, { width: `${p.averageAccuracy}%` }]} />
                    </View>
                    <Text style={styles.problemAccuracy}>{Math.round(p.averageAccuracy)}%</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📅 Recent Sessions</Text>
              </View>
              {recentSessions.slice(0, 3).map((s, i) => (
                <View key={i} style={styles.sessionRow}>
                  <Text style={styles.sessionDate}>
                    {new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.sessionItems}>{s.itemsAttempted} words</Text>
                  <Text style={styles.sessionStars}>⭐ {s.starsEarned}</Text>
                </View>
              ))}
            </>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🏆 Achievements</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
                {achievements.map((id, i) => {
                  const info = ACHIEVEMENT_INFO[id] || { emoji: '🎖️', label: id };
                  return (
                    <View key={i} style={styles.achievementBadge}>
                      <Text style={styles.achievementEmoji}>{info.emoji}</Text>
                      <Text style={styles.achievementLabel}>{info.label}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingEmoji: { fontSize: 64 },
  loadingText: { fontSize: 24, fontWeight: '700', color: '#fff' },

  // Greeting
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  profileName: { fontSize: 22, fontWeight: '900', color: '#fff' },
  parentBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  parentBtnText: { fontSize: 22 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statEmoji: { fontSize: 24 },
  statNumber: { fontSize: 24, fontWeight: '900', color: '#FFE066' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  // Section headers
  sectionHeader: { marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  sectionSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  // Stage card
  stageCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 4 },
  stageCardContent: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  stageNumber: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  stageName: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2 },
  stageDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  stageArrow: { fontSize: 28, color: '#fff', marginLeft: 'auto' },

  // CTA
  ctaButton: { borderRadius: 20, overflow: 'hidden', shadowColor: '#FFE066', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  ctaGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 20 },
  ctaText: { fontSize: 20, fontWeight: '900', color: '#1a1a2e' },

  // Problem areas
  problemsContainer: { gap: 8 },
  problemChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.2)',
  },
  problemLabel: { fontSize: 14, color: '#fff', fontWeight: '700', flex: 1 },
  problemBar: { width: 80, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  problemBarFill: { height: '100%', backgroundColor: '#FF6B6B', borderRadius: 3 },
  problemAccuracy: { fontSize: 13, color: '#FF6B6B', fontWeight: '800', width: 36, textAlign: 'right' },

  // Sessions
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  sessionDate: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  sessionItems: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  sessionStars: { fontSize: 14, fontWeight: '800', color: '#FFE066' },

  // Achievements
  achievementsScroll: { marginHorizontal: -4 },
  achievementBadge: {
    backgroundColor: 'rgba(255,224,102,0.15)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    gap: 4,
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,224,102,0.3)',
  },
  achievementEmoji: { fontSize: 32 },
  achievementLabel: { fontSize: 11, color: '#FFE066', fontWeight: '700', textAlign: 'center' },
});
