import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { storage } from '../../../utils/storage';

const STORAGE_KEY = 'tramp_results_v1';

type ResultEntry = {
  id: string;
  skillName: string;
  score: number;
  date: string;
  videoUri?: string;
};

export default function ResultsList() {
  const [items, setItems] = useState<ResultEntry[]>([]);
  const router = useRouter();

  const loadResults = React.useCallback(async () => {
    try {
      const raw = await storage.getItem(STORAGE_KEY);
      if (!raw) return;

      // storage stores JSON.stringify(array) => string, but be defensive.
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) setItems(parsed as ResultEntry[]);
    } catch (e) {
      console.warn('Failed to load results:', e);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadResults();
    }, [loadResults])
  );

  const renderItem = ({ item }: { item: ResultEntry }) => {
    const score = item.score ?? 0;
    return (
      <TouchableOpacity style={styles.row} onPress={() => router.push({ pathname: '/(tabs)/results/detail', params: { id: item.id } })}>
        <View>
          <Text style={styles.skill}>{item.skillName || 'Unknown Skill'}</Text>
          <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>All Results</Text>
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 160 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: '700', marginVertical: 18, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: '#f6f6f6', marginBottom: 12 },
  skill: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 12, color: '#666', marginTop: 4 },
  scoreBox: { backgroundColor: '#007AFF', minWidth: 56, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  scoreText: { color: 'white', fontWeight: '800', fontSize: 18 },
});
