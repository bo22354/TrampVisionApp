import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>TrampVision</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last Session: Front 1.5 Somersault</Text>
        <Text style={styles.scoreText}>8.2 / 10</Text>
        <Text style={styles.feedbackText}>"Good height, slightly early opening."</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, paddingBottom: 140 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, marginTop: 40, textAlign: 'center' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#555' },
  scoreText: { fontSize: 48, fontWeight: 'bold', color: '#4CAF50', marginVertical: 10 },
  feedbackText: { fontSize: 16, color: '#666', fontStyle: 'italic' },
});