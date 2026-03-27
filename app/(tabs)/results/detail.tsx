import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { storage } from '../../../utils/storage';

const STORAGE_KEY = 'tramp_results_v1';

export default function ResultDetail() {
  const { id, videoUri, startMs, endMs } = useLocalSearchParams<{
    id?: string | string[];
    videoUri?: string | string[];
    startMs?: string | string[];
    endMs?: string | string[];
  }>();
  const [entry, setEntry] = useState<any>(null);
  const router = useRouter();

  console.log('[detail] Params received:', { id, videoUri, startMs, endMs });

  useEffect(() => {
    const load = async () => {
      const normalizedId = Array.isArray(id) ? id[0] : id;
      const normalizedVideoUri = Array.isArray(videoUri) ? videoUri[0] : videoUri;
      const normalizedStartMs = Array.isArray(startMs) ? startMs[0] : startMs;
      const normalizedEndMs = Array.isArray(endMs) ? endMs[0] : endMs;

      if (normalizedId) {
        try {
          const raw = await storage.getItem(STORAGE_KEY);
          if (!raw) {
            console.warn('No results in storage');
            return;
          }
          const listParsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const list = Array.isArray(listParsed) ? listParsed : [];
          const found = list.find((x: any) => String(x.id) === String(normalizedId));
          if (found) {
            console.log('Found entry:', found);
            setEntry(found);
          } else {
            console.warn('Entry not found with id:', normalizedId);
            if (normalizedVideoUri) {
              setEntry({
                videoUri: normalizedVideoUri,
                startMs: normalizedStartMs ? Number(normalizedStartMs) : 0,
                endMs: normalizedEndMs ? Number(normalizedEndMs) : 0,
                skillName: 'Recent Analysis',
                score: 8.5,
                date: new Date().toISOString(),
                feedback: 'Awaiting analysis...',
              });
            } else {
              // Avoid an indefinite loading spinner if the id doesn't match storage.
              setEntry({
                skillName: 'Result',
                score: 0,
                date: new Date().toISOString(),
                feedback: 'No saved details found for this result yet.',
              });
            }
          }
        } catch (e) {
          console.error('Failed to load entry:', e);
        }
      } else if (normalizedVideoUri) {
        setEntry({
          videoUri: normalizedVideoUri,
          startMs: normalizedStartMs ? Number(normalizedStartMs) : 0,
          endMs: normalizedEndMs ? Number(normalizedEndMs) : 0,
          skillName: 'Recent Analysis',
          score: 8.5,
          date: new Date().toISOString(),
          feedback: 'Awaiting analysis...',
        });
      }
    };
    load();
  }, [id, videoUri, startMs, endMs]);

  const goBack = () => router.replace({ pathname: '/(tabs)/results' });

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>Result</Text>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 12, color: '#666' }}>Loading result…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.header}>{entry.skillName || 'Result'}</Text>

        {entry.videoUri ? (
          <View style={styles.videoContainer}>
            <Video source={{ uri: entry.videoUri }} style={styles.video} useNativeControls resizeMode={ResizeMode.COVER} isLooping />
          </View>
        ) : null}

        <View style={styles.scoreCircle}>
          <Text style={styles.finalScore}>{(entry.score ?? 0).toFixed(1)}</Text>
        </View>

        <Text style={styles.skillText}>{entry.skillName || 'Detected Skill'}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Insight</Text>
          <Text style={styles.feedbackText}>{entry.feedback || 'No feedback available.'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 20, paddingBottom: 140 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, marginTop: 20, textAlign: 'center' },
  videoContainer: { height: 200, width: '100%', borderRadius: 15, overflow: 'hidden', marginBottom: 20, backgroundColor: 'black' },
  video: { flex: 1 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', borderWidth: 5, borderColor: '#4CAF50', marginBottom: 20 },
  finalScore: { fontSize: 40, fontWeight: 'bold', color: '#2E7D32' },
  skillText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 10 },
  feedbackText: { fontSize: 16, color: '#666', fontStyle: 'italic', lineHeight: 22 },
  backBtn: { marginBottom: 6 },
  backText: { color: '#007AFF', fontWeight: '600' },
});
