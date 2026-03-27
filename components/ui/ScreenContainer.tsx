import { SafeAreaView, StyleSheet } from 'react-native';

import { ThemedView, ViewProps } from '@/components/Themed';

export function ScreenContainer({ style, ...rest }: ViewProps) {
  return (
    <ThemedView style={[styles.container, style]}>
      <SafeAreaView style={styles.safeArea}>
        {rest.children}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
});