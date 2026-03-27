import React, { useState, useRef, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const activeIndex = state.index;
  const router = useRouter();
  const [showOverlay, setShowOverlay] = useState(false);
  const [preferredFacing, setPreferredFacing] = useState<'back' | 'front'>('back');
  const tabAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(tabAnim, {
      toValue: showOverlay ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [showOverlay, tabAnim]);

  // Check if the current screen has requested to hide the tab bar
  const activeRoute = state.routes[state.index];
  const { options } = descriptors[activeRoute.key];
  if (options?.tabBarStyle?.display === 'none') {
    return null;
  }

  const goTo = (name: string, idx: number) => {
    navigation.navigate(name);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={{
          opacity: tabAnim,
          transform: [
            { translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }
          ],
          width: '100%',
          alignItems: 'center',
        }}
        pointerEvents={showOverlay ? 'none' : 'auto'}
      >
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabButton} onPress={() => goTo('index', 0)}>
            <Ionicons name={activeIndex === 0 ? 'home' : 'home-outline'} size={22} color={activeIndex === 0 ? '#111' : '#888'} />
            <Text style={[styles.label, activeIndex === 0 && styles.labelActive]}>Home</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />

          <TouchableOpacity style={styles.tabButton} onPress={() => goTo('results', 2)}>
            <Ionicons name={activeIndex === 2 ? 'speedometer' : 'speedometer-outline'} size={22} color={activeIndex === 2 ? '#111' : '#888'} />
            <Text style={[styles.label, activeIndex === 2 && styles.labelActive]}>Results</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: tabAnim, transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }} pointerEvents={showOverlay ? 'none' : 'auto'}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => setShowOverlay(true)}
            activeOpacity={0.85}
          >
            <View style={styles.cameraInner}>
              <Ionicons name="add" size={50} color="white" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {showOverlay && (
        <View style={styles.overlayContainer} pointerEvents="box-none">
          <View style={styles.overlayBackdrop} />
          <TouchableOpacity
            style={styles.overlayCenterButton}
            onPress={async () => {
              setShowOverlay(false);
              try {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') return;
                const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, allowsEditing: false });
                if (!result.canceled && result.assets && result.assets[0]?.uri) {
                  router.push({ pathname: '/trim', params: { videoUri: result.assets[0].uri } });
                }
              } catch (e) {
                console.warn('Camera open failed', e);
              }
            }}
          >
            <View style={styles.cameraInnerLarge}>
              <Ionicons name="camera" size={32} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.overlayBottomLeft}
            onPress={async () => {
              setShowOverlay(false);
              try {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') return;
                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, allowsEditing: false });
                if (!res.canceled && res.assets && res.assets[0]?.uri) {
                  router.push({ pathname: '/trim', params: { videoUri: res.assets[0].uri } });
                }
              } catch (e) {
                console.warn('Gallery open failed', e);
              }
            }}
          >
            <View style={styles.overlaySmallBtn}>
              <Ionicons name="images" size={18} color="white" />
              <Text style={styles.overlaySmallText}>Gallery</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.overlayBottomRight}
            onPress={() => setShowOverlay(false)}
          >
            <View style={styles.overlaySmallBtn}>
              <Ionicons name="close" size={18} color="white" />
              <Text style={styles.overlaySmallText}>Cancel</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function Layout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="record" options={{ title: 'Record' }} />
      {/* <Tabs.Screen name="results" options={{ title: 'Results' }} /> */}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    width: '94%',
    marginHorizontal: '3%',
    marginBottom: Platform.OS === 'ios' ? 26 : 18,
    height: 64,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  tabButton: { alignItems: 'center', justifyContent: 'center', width: 80 },
  label: { fontSize: 12, color: '#888', marginTop: 4 },
  labelActive: { color: '#111', fontWeight: '600' },
  spacer: { width: 80 },

  cameraButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 40,
    alignSelf: 'center',
  },
  cameraInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  cameraInnerLarge: {
    width: 85,
    height: 85,
    borderRadius: 50,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  overlayContainer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 999 },
  overlayBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayCenterButton: { position: 'absolute', alignSelf: 'center', bottom: 50 },
  overlayBottomLeft: { position: 'absolute', left: 20, bottom: 40 },
  overlayBottomRight: { position: 'absolute', right: 20, bottom: 40 },
  overlaySmallBtn: { backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  overlaySmallText: { color: 'white', marginLeft: 8, fontWeight: '700' },
  overlayClose: { position: 'absolute', right: 18, top: 44, padding: 8 },
});