import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { trim } from 'react-native-video-trim';
import { storage } from '../utils/storage'; // Import storage

const STORAGE_KEY = 'tramp_results_v1'; // Storage key

export default function LoadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ videoUri: string; startMs: string; endMs: string; }>();

  useEffect(() => {
    let mounted = true;

    async function processVideoAndNavigate() {
      const { videoUri, startMs, endMs } = params;

      if (!videoUri || !startMs || !endMs) {
        Alert.alert("Error", "Missing video information for trimming.", [{ text: "OK", onPress: () => router.replace('/') }]);
        return;
      }

      try {
        // Check if the input file actually exists before trying to process it
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists) {
          throw new Error(`Input video file does not exist at: ${videoUri}`);
        }

        // 1. Get start/end times in milliseconds
        const startMsNum = parseFloat(startMs);
        const endMsNum = parseFloat(endMs);

        // 2. Trim the video using react-native-video-trim (Headless mode)
        console.log(`Trimming video from ${startMsNum}ms to ${endMsNum}ms...`);
        
        const result = await trim(videoUri, {
          startTime: startMsNum,
          endTime: endMsNum,
          enablePreciseTrimming: true // Use precise trimming if desired
        });

        if (!result.success) {
          throw new Error("Video trimming failed.");
        }

        // The absolute path to the trimmed output file
        // It starts with 'file://' but sometimes doesn't, so we ensure it does if needed
        const outputUri = result.outputPath.startsWith('file://') ? result.outputPath : `file://${result.outputPath}`;

        console.log('Video trimmed successfully:', outputUri);

        // 3. Simulate ML model analysis on the trimmed video (outputUri)
        // This is where your actual ML model inference would go.
        // For now, we'll keep the simulated delay.
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second fake analysis

        const newId = Date.now().toString();
        const newEntry = {
          id: newId,
          skillName: 'Recent Analysis',
          score: 8.5,
          date: new Date().toISOString(),
          videoUri: outputUri, // Save the newly trimmed video URI
          feedback: 'Awaiting analysis...'
        };

        // Load existing entries
        const existingRaw = await storage.getItem(STORAGE_KEY);
        let existingEntries = [];
        if (existingRaw) {
          try {
            existingEntries = typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw;
            if (!Array.isArray(existingEntries)) existingEntries = [];
          } catch (e) {
            console.warn('Failed to parse existing results', e);
          }
        }

        // Save back to storage
        existingEntries.unshift(newEntry);
        await storage.setItem(STORAGE_KEY, JSON.stringify(existingEntries));

        // 4. Navigate to the results page with the new trimmed video URI and new entry ID.
        // Replace loading with the results tab root, then push the detail page so back goes to the list.
        if (mounted) {
          router.replace({ pathname: '/(tabs)/results' });
          router.push({
            pathname: '/(tabs)/results/detail',
            params: { id: newId, videoUri: outputUri }
          });
        }
      } catch (e: any) { // Explicitly type 'e' as 'any' or 'Error'
        console.error('An error occurred during video processing:', e.message || e); // Log specific error message
        if (mounted) {
          Alert.alert("Error", `An unexpected error occurred: ${e.message || 'Unknown error'}`, [{ text: "OK", onPress: () => router.back() }]);
        }
      }
    }

    // Simulate model inference delay (1 second)
    const t = setTimeout(processVideoAndNavigate, 1000);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [router, params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000" />
      <Text style={styles.text}>Analyzing video…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#222',
  },
});
