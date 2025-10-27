import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
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
  if (!exercise) return null;

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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>{exercise.name} Information</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
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
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32, // Same width as close button for centering
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
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
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
    fontSize: 16,
  },
  sectionContent: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    lineHeight: 22,
  },
});

export default ExerciseInfoModal;