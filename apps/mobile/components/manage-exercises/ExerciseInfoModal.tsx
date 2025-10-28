import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useFonts } from 'expo-font';
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { FetchedExerciseDefinition } from '../../../../packages/data/src/types/exercise';

interface ExerciseInfoModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: FetchedExerciseDefinition | null;
}

const ExerciseInfoModal: React.FC<ExerciseInfoModalProps> = ({
  visible,
  onClose,
  exercise,
}) => {
  // Load Poppins fonts with Expo Google Fonts
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!exercise) return null;

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator />
                <Text style={{ marginTop: 12, color: Colors.mutedForeground }}>Loading exercise…</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string | null): string | null => {
    if (!url) return null;
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
    const match = url.match(regExp);
    return match && match[1] ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(exercise.video_url);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Spacing.md }]}>
              <Text style={styles.title}>{exercise.name}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.scrollView, { paddingLeft: Spacing.md }]} showsVerticalScrollIndicator={false}>
              <View style={[styles.content, { paddingTop: Spacing.lg }]}>
                {/* YouTube Video */}
                {videoId && (
                  <View style={styles.videoContainer}>
                    <YoutubePlayer
                      height={220}
                      videoId={videoId}
                      play={false}
                      webViewStyle={styles.youtubePlayer}
                    />
                  </View>
                )}

                {/* Main Muscle */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Main Muscle</Text>
                  <Text style={styles.sectionContent}>{exercise.main_muscle}</Text>
                </View>

                {/* Category */}
                {exercise.category && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Category</Text>
                    <Text style={styles.sectionContent}>{exercise.category}</Text>
                  </View>
                )}

                {/* Description */}
                {exercise.description && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.sectionContent}>{exercise.description}</Text>
                  </View>
                )}

                {/* Pro Tip */}
                {exercise.pro_tip && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pro Tip</Text>
                    <Text style={styles.sectionContent}>{exercise.pro_tip}</Text>
                  </View>
                )}

                {/* Exercise Type */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Type</Text>
                  <Text style={styles.sectionContent}>{exercise.type || 'strength'}</Text>
                </View>

                {/* Google Search Button */}
                <View style={styles.googleSearchContainer}>
                  <TouchableOpacity style={styles.googleSearchButton} onPress={() => {
                    const query = encodeURIComponent(exercise.name);
                    const url = `https://www.google.com/search?q=${query}+exercise+form`;
                    Linking.openURL(url);
                  }}>
                    <Text style={styles.googleSearchText}>🌐 Google Search</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '98%',
    minHeight: 750,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    flex: 1,
    margin: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: Colors.foreground,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: Spacing.lg,
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    paddingBottom: Spacing.lg,
  },
  videoContainer: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  youtubePlayer: {
    borderRadius: BorderRadius.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.foreground,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sectionContent: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  googleSearchContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  googleSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 24,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleSearchText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: Colors.foreground,
  },
});

export default ExerciseInfoModal;