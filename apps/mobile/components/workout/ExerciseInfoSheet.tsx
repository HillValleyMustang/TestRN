// ExerciseInfoSheet.tsx
import React, { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Colors } from '../../constants/Theme';

// Safe WebView import with fallback
const WebView = (() => {
  try {
    const { WebView: RNWebView } = require('react-native-webview');
    return RNWebView;
  } catch (error) {
    console.warn('WebView not available:', error);
    return null;
  }
})();

// --- YouTube helpers ---
const getYouTubeId = (urlOrId: string) => {
  if (!urlOrId) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  const m = urlOrId.match(
    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  );
  return m?.[1] ?? '';
};

const getThumbnail = (id: string, quality: 'max' | 'hq' = 'hq') =>
  quality === 'max'
    ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
    : `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

type ExerciseInfo = {
  name: string;
  description: string | null;
  category: string | null;
  main_muscle: string | null;
  type: string | null;
  pro_tip: string | null;
  video_url: string | null;
};

interface ExerciseInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  exercise: ExerciseInfo | null; // may be null while loading
}

export default function ExerciseInfoSheet({ visible, onClose, exercise }: ExerciseInfoSheetProps) {
  // Load Poppins fonts with Expo Google Fonts
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // ❗️Render the modal whenever visible is true (even if exercise is null)
  if (!visible) return null;

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
        <View style={s.root}>
          <Pressable onPress={onClose} style={s.overlay} />
          <View style={s.cardContainer}>
            <LoadingCard onClose={onClose} />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* scrim + card as siblings */}
      <View style={s.root}>
        <Pressable onPress={onClose} style={s.overlay} />
        <View style={s.cardContainer}>
          {exercise ? (
            <ExerciseInfoContent data={exercise} onClose={onClose} />
          ) : (
            <LoadingCard onClose={onClose} />
          )}
        </View>
      </View>
    </Modal>
  );
}

function LoadingCard({ onClose }: { onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}> {/* Ensure it takes up space within cardContainer */}
      <Pressable onPress={onClose} accessibilityLabel="Close" style={s.closeBtn}>
        <Text style={s.closeTxt}>×</Text>
      </Pressable>
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading exercise…</Text>
      </View>
    </View>
  );
}

function ExerciseInfoContent({ data, onClose }: { data: ExerciseInfo; onClose: () => void }) {
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const videoId = getYouTubeId(data.video_url || '');

  return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={onClose} accessibilityLabel="Close exercise details" style={s.closeBtn}>
        <Text style={s.closeTxt}>×</Text>
      </Pressable>

      <ScrollView
        style={[s.scrollView, { marginTop: 20 }]}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>{data.name}</Text>

        {!!videoId && (
          <View style={s.videoContainer}>
            <Pressable style={s.videoCard} onPress={() => setShowVideoPlayer((p) => !p)}>
              {!showVideoPlayer ? (
                <>
                  {!thumbError ? (
                    <Image
                      source={{ uri: getThumbnail(videoId, 'hq') }}
                      style={s.videoThumbnail}
                      resizeMode="cover"
                      onLoad={() => setThumbLoaded(true)}
                      onError={() => {
                        setThumbError(true);
                        setThumbLoaded(true);
                      }}
                      accessibilityLabel={`Video thumbnail for ${data.name}`}
                    />
                  ) : (
                    <View style={s.thumbnailFallback}>
                      <Text style={s.fallbackIcon}>🎥</Text>
                      <Text style={s.fallbackText}>Video Tutorial</Text>
                      <Text style={s.fallbackSubtext}>Tap to play</Text>
                    </View>
                  )}

                  {!thumbLoaded && !thumbError && (
                    <View style={s.thumbnailLoading}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={s.loadingText}>Loading...</Text>
                    </View>
                  )}

                  <View style={s.playButtonOverlay}>
                    <View style={s.playButton}>
                      <Text style={s.playButtonText}>▶</Text>
                    </View>
                  </View>
                </>
              ) : WebView ? (
                <WebView
                  source={{
                    html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { background: #000; }
                            .container { width: 100%; height: 100%; position: relative; }
                            iframe { width: 100%; height: 100%; border: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
                          </style>
                        </head>
                        <body>
                          <div class="container">
                            <iframe
                              src="https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0&controls=1&playsinline=1"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowfullscreen
                            ></iframe>
                          </div>
                        </body>
                      </html>
                    `,
                  }}
                  style={s.videoPlayer}
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction
                  scrollEnabled={false}
                />
              ) : (
                <View style={s.videoPlayerFallback}>
                  <Text style={s.fallbackText}>Video Player</Text>
                  <Text style={s.fallbackSubtext}>YouTube: {videoId}</Text>
                  <Text style={s.fallbackNote}>WebView not available</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        <View style={s.infoContainer}>
          <View>
            <Text style={s.fieldLabel}>Main Muscle:</Text>
            <Text style={s.fieldValue}>{data.main_muscle || 'Not specified'}</Text>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={s.fieldLabel}>Category:</Text>
            <Text style={s.fieldValue}>{data.category || 'Not specified'}</Text>
          </View>

          {!!data.description && (
            <View style={{ marginTop: 20 }}>
              <Text style={s.fieldLabel}>Description:</Text>
              <Text style={s.fieldValue}>{data.description}</Text>
            </View>
          )}

          {!!data.pro_tip && (
            <View style={{ marginTop: 20 }}>
              <Text style={s.fieldLabel}>Pro Tip:</Text>
              <Text style={s.fieldValue}>{data.pro_tip}</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <Pressable style={s.googleSearchButton} onPress={() => {
            const query = encodeURIComponent(data.name);
            const url = `https://www.google.com/search?q=${query}+exercise+form`;
            Linking.openURL(url);
          }}>
            <Text style={s.googleSearchText}>🔍 Google Search</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: Colors.modalOverlay, // Global modal overlay setting
    zIndex: 1,
  },
  cardContainer: {
    width: '85%', // Decreased width for better proportions
    maxWidth: 500, // Reduced max width
    maxHeight: '98%', // Back to larger size
    minHeight: 650, // Increased minimum height for larger modal
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24, // Updated horizontal padding
    paddingVertical: 22, // Updated vertical padding
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    position: 'relative',
    zIndex: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeTxt: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' },

  scrollView: { flex: 1 },
  content: { paddingBottom: 28 },

  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },

  videoContainer: { marginBottom: 16 },
  videoCard: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#EEF0F4',
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: { width: '100%', height: 200, backgroundColor: '#EEF0F4' },

  playButtonOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  playButtonText: { fontSize: 20, color: '#FFFFFF', fontWeight: 'bold' },

  thumbnailLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loadingText: { color: '#FFFFFF', fontSize: 12 },

  thumbnailFallback: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  fallbackIcon: { fontSize: 48, marginBottom: 8 },
  fallbackText: { fontSize: 16, color: '#6B7280', marginBottom: 4 },
  fallbackSubtext: { fontSize: 12, color: '#9CA3AF' },

  videoPlayer: { width: '100%', height: 200, backgroundColor: '#000' },
  videoPlayerFallback: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#000',
  },
  fallbackNote: { fontSize: 12, color: '#888', fontStyle: 'italic' },

  infoContainer: { marginBottom: 24 },

  fieldLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: '#000000',
  },
  fieldValue: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    marginTop: 6,
  },

  googleSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleSearchText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: '#14171F'
  },
});
