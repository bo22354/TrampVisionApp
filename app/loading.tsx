import React, {useEffect} from 'react';
import {View, Text, ActivityIndicator, StyleSheet, Alert} from 'react-native';
import {useRouter, useLocalSearchParams} from 'expo-router';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system';

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
        // 1. Define an output path in the app's cache directory for the trimmed video
        const outputUri = `${FileSystem.cacheDirectory}trimmed_${Date.now()}.mp4`;

        // Ensure the input video URI is a plain file path for FFmpegKit.
        // FFmpegKit generally prefers paths without 'file://' prefix.
        let inputFilePath = videoUri;
        if (inputFilePath.startsWith('file://')) {
          inputFilePath = inputFilePath.substring(7); // Remove 'file://'
        }

        // Check if the input file actually exists before trying to process it
        const fileInfo = await FileSystem.getInfoAsync(inputFilePath);
        if (!fileInfo.exists) {
          throw new Error(`Input video file does not exist at: ${inputFilePath}`);
        }

        // 2. Convert start/end times from ms to seconds for ffmpeg
        const startTimeInSeconds = parseFloat(startMs) / 1000;
        const endTimeInSeconds = parseFloat(endMs) / 1000;
        const duration = endTimeInSeconds - startTimeInSeconds;

        // 3. Construct and execute the ffmpeg command to trim the video.
        // -ss: start time, -t: duration. Using -t is often more reliable than -to
        // Use the cleaned inputFilePath and ensure outputUri is also a plain path for FFmpegKit.
        const command = `-i "${inputFilePath}" -ss ${startTimeInSeconds} -t ${duration} -c copy "${outputUri.substring(7)}"`; // Remove 'file://' from outputUri as well
        
        console.log("FFmpeg Command:", command); // Log the command for debugging
        const session = await FFmpegKit.execute(command);
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          // SUCCESS: The video is trimmed and saved to outputUri
          console.log('Video trimmed successfully:', outputUri);

          // 4. Simulate ML model analysis on the trimmed video (outputUri)
          // This is where your actual ML model inference would go.
          // For now, we'll keep the simulated delay.
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second fake analysis

          // 5. Navigate to the results page with the new trimmed video URI
          if (mounted) { // Check if component is still mounted before navigating
            router.replace({
              pathname: '/results', // This will be your new results page
              params: { trimmedUri: outputUri } // Pass the actual trimmed video URI
            });
          }

        } else {
          // FAILURE
          const logs = await session.getAllLogsAsString(); // Get all logs for detailed error output
          console.error("FFmpeg process failed with code:", returnCode, "Logs:", logs);
          if (mounted) {
            Alert.alert("Error", `Video processing failed. Code: ${returnCode}. Check console logs for details.`, [{ text: "OK", onPress: () => router.back() }]);
          }
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
