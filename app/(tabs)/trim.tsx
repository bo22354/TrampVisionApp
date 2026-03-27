import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, PanResponder, Dimensions, Image, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useLocalSearchParams, useRouter, Tabs } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ThemedText, ThemedView } from '@/components/Themed';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useThemeColor } from '@/hooks/useThemeColor';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TRACK_PADDING = 24;
// Estimate timeline width for initial render
const TIMELINE_WIDTH_ESTIMATE = SCREEN_WIDTH - (TRACK_PADDING * 2);
const HANDLE_WIDTH = 20;
const NUM_THUMBNAILS = 5;

export default function TrimScreen() {
  const { videoUri } = useLocalSearchParams<{ videoUri: string }>();
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const [duration, setDuration] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [leftPct, setLeftPct] = useState<number>(0);
  const [rightPct, setRightPct] = useState<number>(1);
  const [playheadPct, setPlayheadPct] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false); // Added for loading state
  const [timelineWidth, setTimelineWidth] = useState<number>(TIMELINE_WIDTH_ESTIMATE);
  const timelineRef = useRef<View | null>(null);
  
  // derived pixel positions (based on measured timelineWidth)
  const leftHandleX = leftPct * timelineWidth;
  const rightHandleX = rightPct * timelineWidth;
  const playheadX = playheadPct * timelineWidth;

  useEffect(() => {
    if (videoUri) {
      setDuration(1); // Resets duration so the player grabs the new one
      setLeftPct(0); // Puts start marker back to 0
      setRightPct(1); // Puts end marker back to full width (use measured width)
      setPlayheadPct(0); // Resets playhead
      setIsPlaying(false);
      isSeeking.current = false;
      setThumbnails([]);
    }
  }, [videoUri]);

  // Ensure handles fit when timelineWidth changes (e.g., after measure)
  useEffect(() => {
    if (timelineWidth && (rightHandleX > timelineWidth)) {
      setRightPct(1);
      setPlayheadPct((p) => Math.min(p, 1));
    }
  }, [timelineWidth]);

  // Interaction Refs
  const isScrubbing = useRef<boolean>(false);
  const wasPlayingRef = useRef<boolean>(false);
  const playheadAttachedToLeft = useRef<boolean>(false);
  const playheadAttachedToRight = useRef<boolean>(false);
  const playheadStartX = useRef<number>(0);
  const leftHandleStartX = useRef<number>(0);
  const rightHandleStartX = useRef<number>(0);
  const playheadStartPct = useRef<number>(0);
  const leftHandleStartPct = useRef<number>(0);
  const rightHandleStartPct = useRef<number>(0);
  // Refs that reflect the latest state to avoid stale closures inside PanResponder
  const leftPctRef = useRef<number>(leftPct);
  const rightPctRef = useRef<number>(rightPct);
  const playheadPctRef = useRef<number>(playheadPct);
  const timelineWidthRef = useRef<number>(timelineWidth);
  const durationRef = useRef<number>(duration);
  const isPlayingRef = useRef<boolean>(isPlaying);
  // keep refs up-to-date with state changes
  useEffect(() => { leftPctRef.current = leftPct; }, [leftPct]);
  useEffect(() => { rightPctRef.current = rightPct; }, [rightPct]);
  useEffect(() => { playheadPctRef.current = playheadPct; }, [playheadPct]);
  useEffect(() => { timelineWidthRef.current = timelineWidth; }, [timelineWidth]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  
  // --- NEW: Safe Seeking Logic to prevent "Seeking Interrupted" spam ---
  const isSeeking = useRef<boolean>(false);
  const pendingSeek = useRef<number | null>(null);

  const startMs = (leftHandleX / timelineWidth) * duration;
  const endMs = (rightHandleX / timelineWidth) * duration;

  const safeSeek = async (timeMs: number) => {
    if (!videoRef.current || durationRef.current <= 1) return;

    const targetTime = Math.floor(timeMs);

    // If we are already seeking, queue this request up for next
    if (isSeeking.current) {
      pendingSeek.current = targetTime;
      return;
    }

    isSeeking.current = true;
    try {
      await videoRef.current.setPositionAsync(targetTime, { toleranceMillisBefore: 10, toleranceMillisAfter: 10 });
    } catch (error) {
      // Gracefully swallow the "Seeking interrupted" error
    } finally {
      isSeeking.current = false;
      // If a new seek was requested while we were busy, execute it now
      if (pendingSeek.current !== null) {
        const nextSeek = pendingSeek.current;
        pendingSeek.current = null;
        safeSeek(nextSeek);
      }
    }
  };

  // Throttle helpers to avoid spamming seeks / thumbnail requests
  const lastSeekTime = useRef<number>(0);

  // Generate thumbnails for timeline once duration known
  const generateThumbnails = async () => {
    if (!videoUri || duration <= 1) return;
    try {
      const imgs: string[] = [];
      for (let i = 0; i < NUM_THUMBNAILS; i++) {
        const t = Math.floor((i / Math.max(1, NUM_THUMBNAILS - 1)) * duration);
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: t });
          if (uri) imgs.push(uri);
        } catch (e) {
          // ignore thumbnail errors
        }
      }
      setThumbnails(imgs);
    } catch (e) {
      console.warn('Thumbnail generation failed', e);
    }
  };

  // 1. Playhead (White Line) Responder
  const playheadResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isScrubbing.current = true;
        wasPlayingRef.current = isPlayingRef.current;
        setIsPlaying(false);
        videoRef.current?.pauseAsync();
        // capture starting playhead position (percentage) from ref
        playheadStartPct.current = playheadPctRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        // compute new playhead percentage by applying gesture delta to start pct
        const delta = gestureState.dx ?? 0;
        const deltaPct = delta / Math.max(1, timelineWidthRef.current || 1);
        let newPct = playheadStartPct.current + deltaPct;
        // clamp between handles using latest refs
        const minPct = leftPctRef.current;
        const maxPct = Math.max(leftPctRef.current + 0.001, rightPctRef.current - 0.001);
        newPct = Math.max(minPct, Math.min(newPct, maxPct));
        setPlayheadPct(newPct);
        playheadPctRef.current = newPct;
        // Throttle seeking to ~80ms
        const now = Date.now();
        const targetMs = newPct * durationRef.current;
        if (now - lastSeekTime.current > 80) {
          lastSeekTime.current = now;
          safeSeek(targetMs);
        }
      },
      onPanResponderRelease: async () => {
        isScrubbing.current = false;
        const targetMs = playheadPctRef.current * durationRef.current;
        // Final seek + small pause/resume to force iOS render update
        try {
          await safeSeek(targetMs);
          await videoRef.current?.pauseAsync();
          await new Promise((r) => setTimeout(r, 90));
          await videoRef.current?.setPositionAsync(Math.floor(targetMs));
        } catch (e) {}
        if (wasPlayingRef.current) {
          try { await videoRef.current?.playAsync(); setIsPlaying(true); } catch (e) {}
        }
      }
    })
  ).current;

  // 2. Left Handle (Start Marker) Responder
  const leftResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isScrubbing.current = true;
        wasPlayingRef.current = isPlayingRef.current;
        setIsPlaying(false);
        videoRef.current?.pauseAsync();
        // capture start positions (percent) using refs to avoid stale closures
        leftHandleStartPct.current = leftPctRef.current;
        playheadStartPct.current = playheadPctRef.current;
        // compute current handle/playhead pixel positions with latest refs
        const currentLeftX = leftPctRef.current * (timelineWidthRef.current || 1);
        const currentPlayheadX = playheadPctRef.current * (timelineWidthRef.current || 1);
        // Attach playhead to left if it's currently at (or very near) the left handle
        playheadAttachedToLeft.current = Math.abs(currentPlayheadX - currentLeftX) < 8;
      },
      onPanResponderMove: (evt, gestureState) => {
        const delta = gestureState.dx ?? 0;
        const deltaPct = delta / Math.max(1, timelineWidthRef.current || 1);
        let newPct = leftHandleStartPct.current + deltaPct;
        newPct = Math.max(0, Math.min(newPct, (rightPctRef.current * 1) - (HANDLE_WIDTH / Math.max(1, timelineWidthRef.current || 1))));
        setLeftPct(newPct);
        leftPctRef.current = newPct;
        const targetMs = newPct * durationRef.current;
        const now = Date.now();
        if (now - lastSeekTime.current > 80) {
          lastSeekTime.current = now;
          safeSeek(targetMs);
        }
        // If playhead was attached to the left handle, move it along with the handle
        if (playheadAttachedToLeft.current) {
          setPlayheadPct(newPct);
          playheadPctRef.current = newPct;
        } else {
          if (newPct > playheadPctRef.current) {
            setPlayheadPct(newPct);
            playheadPctRef.current = newPct;
          }
        }
      },
      onPanResponderRelease: async () => {
        isScrubbing.current = false;
        playheadAttachedToLeft.current = false;
        const targetMs = playheadPctRef.current * durationRef.current;
        try {
          await safeSeek(targetMs);
          await videoRef.current?.pauseAsync();
          await new Promise((r) => setTimeout(r, 90));
          await videoRef.current?.setPositionAsync(Math.floor(targetMs));
        } catch (e) {}
        if (wasPlayingRef.current) {
          try { await videoRef.current?.playAsync(); setIsPlaying(true); } catch (e) {}
        }
      }
    })
  ).current;

  // 3. Right Handle (End Marker) Responder
  const rightResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isScrubbing.current = true;
        wasPlayingRef.current = isPlayingRef.current;
        setIsPlaying(false);
        videoRef.current?.pauseAsync();
        // capture start positions (percent) using refs
        rightHandleStartPct.current = rightPctRef.current;
        playheadStartPct.current = playheadPctRef.current;
        const currentRightX = rightPctRef.current * (timelineWidthRef.current || 1);
        const currentPlayheadX = playheadPctRef.current * (timelineWidthRef.current || 1);
        // Attach playhead to right if it's currently at (or very near) the right handle
        playheadAttachedToRight.current = Math.abs(currentPlayheadX - currentRightX) < 8;
      },
      onPanResponderMove: (evt, gestureState) => {
        const delta = gestureState.dx ?? 0;
        const deltaPct = delta / Math.max(1, timelineWidthRef.current || 1);
        let newPct = rightHandleStartPct.current + deltaPct;
        newPct = Math.max((leftPctRef.current + (HANDLE_WIDTH / Math.max(1, timelineWidthRef.current || 1))), Math.min(newPct, 1));
        setRightPct(newPct);
        rightPctRef.current = newPct;
        const targetMs = newPct * durationRef.current;
        const now = Date.now();
        if (now - lastSeekTime.current > 80) {
          lastSeekTime.current = now;
          safeSeek(targetMs);
        }
        // If playhead was attached to the right handle, move it along with the handle
        if (playheadAttachedToRight.current) {
          setPlayheadPct(newPct);
          playheadPctRef.current = newPct;
        } else {
          if (newPct < playheadPctRef.current) {
            setPlayheadPct(newPct);
            playheadPctRef.current = newPct;
          }
        }
      },
      onPanResponderRelease: async () => {
        isScrubbing.current = false;
        playheadAttachedToRight.current = false;
        const targetMs = playheadPctRef.current * durationRef.current;
        try {
          await safeSeek(targetMs);
          await videoRef.current?.pauseAsync();
          await new Promise((r) => setTimeout(r, 90));
          await videoRef.current?.setPositionAsync(Math.floor(targetMs));
        } catch (e) {}
        if (wasPlayingRef.current) {
          try { await videoRef.current?.playAsync(); setIsPlaying(true); } catch (e) {}
        }
      }
    })
  ).current;

  // Playback Status Update
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    // Set actual duration once loaded
    if (status.durationMillis && duration === 1) {
      setDuration(status.durationMillis);
      // kick off thumbnail generation
      generateThumbnails();
    }
    
    if (status.isPlaying && !isScrubbing.current) {
      const currentX = (status.positionMillis / status.durationMillis!) * Math.max(1, timelineWidth);
      const clamped = Math.max(leftHandleX, Math.min(currentX, rightHandleX));
      setPlayheadPct(clamped / Math.max(1, timelineWidth));

      // Add a 50ms buffer to the loop check to prevent premature cutoff
      if (status.positionMillis >= endMs - 50) {
        // Use safeSeek to loop back and ensure playback continues
        (async () => {
          await safeSeek(startMs);
          try {
            await videoRef.current?.playAsync();
          } catch (e) {}
        })();
      }
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
      setIsPlaying(false);
    } else {
      // Always seek to the current playhead position before starting playback
      const targetMs = (playheadX / timelineWidth) * duration;
      try {
        await safeSeek(targetMs);
      } catch (e) {}
      try {
        await videoRef.current?.playAsync();
        setIsPlaying(true);
      } catch (e) {
        // ignore play errors
      }
    }
  };

  const handleAnalyze = () => {
    if (isNavigating) return; // Prevent multiple presses
    setIsNavigating(true);
    // Route to a short loading screen which will simulate model processing
    router.push({ 
      pathname: '/loading', 
      params: { videoUri: videoUri, startMs: startMs.toString(), endMs: endMs.toString() } 
    });
    // Reset navigating state after a short delay, in case navigation fails or user navigates back
    setTimeout(() => setIsNavigating(false), 1000);
  };

  // Theme-aware styles
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const trackBgColor = useThemeColor({}, 'trackBackground');
  const primaryColor = useThemeColor({}, 'primary');
  const secondaryColor = useThemeColor({}, 'secondary');
  const textColor = useThemeColor({}, 'text');

  const dynamicStyles = useMemo(() => ({
    videoContainer: { backgroundColor: cardColor, borderColor: borderColor },
    trackBackground: { backgroundColor: trackBgColor },
    activeTrack: { borderColor: primaryColor, backgroundColor: `${primaryColor}20` }, // Add 20 for ~12% opacity
    handle: { backgroundColor: secondaryColor },
    playheadLine: { backgroundColor: textColor },
  }), [cardColor, borderColor, trackBgColor, primaryColor, secondaryColor, textColor]);

  return (
    <ScreenContainer style={styles.container}>
      <Tabs.Screen options={{ tabBarStyle: { display: 'none' }, href: null }} />
      
      <ThemedText type="title" style={styles.header}>
        Trim Skill
      </ThemedText>
      
      <ThemedView style={[styles.videoContainer, dynamicStyles.videoContainer]}>
        <TouchableWithoutFeedback onPress={togglePlay}>
          <View style={styles.videoInner}>
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              progressUpdateIntervalMillis={50}
            />
          </View>
        </TouchableWithoutFeedback>
      </ThemedView>

      <View style={styles.controlsRow}>
        <View style={styles.timelineWrapper}>
          <View
            ref={timelineRef}
            style={styles.timelineContainer}
            onLayout={(e) => {
              // capture measured width
              try {
                const w = e.nativeEvent.layout.width;
                setTimelineWidth(w);
              } catch (err) {
                // fallback: keep previous values
              }
            }}
          >
            <View style={[styles.trackBackground, dynamicStyles.trackBackground]} />

            {/* Thumbnails behind the active track */}
            {thumbnails.length > 0 && (
              <View style={styles.thumbsContainer} pointerEvents="none">
                {thumbnails.map((uri, i) => {
                  const thumbWidth = (timelineWidth || TIMELINE_WIDTH_ESTIMATE) / NUM_THUMBNAILS;
                  return (
                    <Image
                      key={uri + i}
                      source={{ uri }}
                      style={{ position: 'absolute', left: i * thumbWidth, width: thumbWidth + 1, height: '100%', resizeMode: 'cover', borderRadius: 4, opacity: 0.95 }}
                    />
                  );
                })}
              </View>
            )}

            <View 
              style={[
                styles.activeTrack, 
                dynamicStyles.activeTrack, 
                // Shift the track right by the width of one handle, and reduce total width by two handles
                { left: leftHandleX + HANDLE_WIDTH, width: Math.max(0, rightHandleX - leftHandleX - (HANDLE_WIDTH * 2)) }
              ]} 
            />

            {/* Start Handle */}
            <View style={[styles.handle, styles.leftHandle, dynamicStyles.handle, { left: leftHandleX }]} {...leftResponder.panHandlers}>
              <View style={styles.handleNotch} />
            </View>

            {/* End Handle */}
            <View style={[styles.handle, styles.rightHandle, dynamicStyles.handle, { left: rightHandleX - HANDLE_WIDTH }]} {...rightResponder.panHandlers}>
              <View style={styles.handleNotch} />
            </View>

            {/* Playhead Container - Uses a massive invisible hit area */}
            {(() => {
              // Ensure rendered playhead is clamped inside current start/end
              const minX = leftHandleX;
              const maxX = Math.max(leftHandleX + 1, rightHandleX - 1);
              const displayedX = Math.max(minX, Math.min(playheadX, maxX));
              return (
                <View
                  style={[styles.playheadContainer, { left: displayedX - 20 }]}
                  {...playheadResponder.panHandlers}
                >
                  <View style={[styles.playheadLine, dynamicStyles.playheadLine]} />
                </View>
              );
            })()}
          </View>
        </View>
      </View>

      <ThemedText type="monospace" style={styles.timeText}>
        Selection: {(startMs / 1000).toFixed(2)}s - {(endMs / 1000).toFixed(2)}s
      </ThemedText>

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={[styles.cancelButton, { borderColor: borderColor }]}
          disabled={isNavigating} // Disable when navigating
          onPress={() => router.navigate('/')}
        >
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </TouchableOpacity>
        <View style={styles.analyzeButtonWrapper}>
          <PrimaryButton title="Analyse Skill" onPress={handleAnalyze} isLoading={isNavigating} /> {/* Pass isLoading prop */}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 20 },
  header: { textAlign: 'center', marginTop: 20, marginBottom: 10 },
  videoContainer: { height: 450, width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 5, borderWidth: 1 },
  videoInner: { flex: 1 },
  video: { flex: 1 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', height: 80, paddingHorizontal: 4 },
  timelineWrapper: { flex: 1 },
  timelineContainer: { height: 55, width: '100%', justifyContent: 'center' },
  thumbsContainer: { position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, borderRadius: 5, overflow: 'hidden' },
  trackBackground: { position: 'absolute', height: '100%', width: '100%', borderRadius: 6 },
  activeTrack: { position: 'absolute', height: '100%', borderTopWidth: 4, borderBottomWidth: 4 },
  handle: { position: 'absolute', width: HANDLE_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  leftHandle: { borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  rightHandle: { borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  handleNotch: { width: 3, height: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 2 },
  playheadContainer: { position: 'absolute', width: 40, height: 70, justifyContent: 'center', alignItems: 'center', zIndex: 5, top: -7, backgroundColor: 'transparent' },
  playheadLine: { width: 4, height: '100%', borderRadius: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 },
  timeText: { textAlign: 'center', marginTop: 5, opacity: 0.7 },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButton: {
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cancelButtonText: {
    fontWeight: '700',
    fontSize: 18,
  },
  analyzeButtonWrapper: {
    flex: 1,
  },
});