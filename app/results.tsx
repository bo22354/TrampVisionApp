import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';

import { ThemedText } from '@/components/Themed';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
// import { ThemedButton } from '@/components/ThemedButton'; // Assuming you have a ThemedButton

export default function ResultsScreen() {
  const router = useRouter();
  const { trimmedUri } = useLocalSearchParams<{ trimmedUri: string }>();
  const videoRef = React.useRef<Video>(null);

  // Ensure expo-av is installed: npx expo install expo-av
  // If you don't have ThemedButton, you can use Button from 'react-native'

  if (!trimmedUri) {
    Alert.alert("Error", "No trimmed video URI provided.", [{ text: "OK", onPress: () => router.replace('/') }]);
    return (
      <ScreenContainer style={styles.container}>
        <ThemedText>Error: No video to display.</ThemedText>
        {/* <ThemedButton title="Go Home" onPress={() => router.replace('/')} /> */}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <ThemedText style={styles.title}>Trimmed Video Results</ThemedText>
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: trimmedUri }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping
        />
      </View>
      {/* <ThemedButton title="Go Back to Home" onPress={() => router.replace('/')} /> */}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9, // Common video aspect ratio
    backgroundColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
  },
  video: {
    flex: 1,
  },
});