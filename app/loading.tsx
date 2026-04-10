import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Video } from 'react-native-compressor';

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

        // 1. Convert start/end times from ms to seconds
        const startTimeInSeconds = parseFloat(startMs) / 1000;
        const endTimeInSeconds = parseFloat(endMs) / 1000;

        // 2. Compress and trim the video using native APIs (much faster and more reliable than FFmpegKit)
        console.log(`Trimming video from ${startTimeInSeconds}s to ${endTimeInSeconds}s...`);
        const outputUri = await Video.compress(
          videoUri,
          {
            compressionMethod: 'auto',
            startTime: startTimeInSeconds,
            endTime: endTimeInSeconds,
          },
          (progress) => {
            console.log('Trimming Progress: ', progress);
          }
        );

        console.log('Video trimmed successfully:', outputUri);

        // 3. Simulate ML model analysis on the trimmed video (outputUri)
        // This is where your actual ML model inference would go.
        // For now, we'll keep the simulated delay.
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second fake analysis

        // 4. Navigate to the results page with the new trimmed video URI
        if (mounted) { // Check if component is still mounted before navigating
          router.replace({
            pathname: '/results', // This will be your new results page
            params: { trimmedUri: outputUri } // Pass the actual trimmed video URI
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
