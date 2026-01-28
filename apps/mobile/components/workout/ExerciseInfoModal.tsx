import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { X } from 'lucide-react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface ExerciseInfoModalProps {
  exercise: any;
  visible: boolean;
  onClose: () => void;
}

export const ExerciseInfoModal: React.FC<ExerciseInfoModalProps> = ({
  exercise,
  visible,
  onClose,
}) => {
  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = exercise?.video_url ? getYouTubeVideoId(exercise.video_url) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{exercise?.name || 'Exercise Info'}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
          {videoId && (
            <View style={styles.videoContainer}>
              <YoutubePlayer
                height={200}
                videoId={videoId}
                play={false}
                webViewStyle={{ borderRadius: 8 }}
              />
            </View>
          )}

          <Text style={styles.description}>
            {exercise?.description || 'No description available.'}
          </Text>

          {exercise?.pro_tip && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pro Tip</Text>
              <Text style={styles.sectionContent}>{exercise.pro_tip}</Text>
            </View>
          )}

          {exercise?.equipment && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipment</Text>
              <Text style={styles.sectionContent}>{exercise.equipment}</Text>
            </View>
          )}

          {exercise?.main_muscle && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Primary Muscle</Text>
              <Text style={styles.sectionContent}>
                {exercise.main_muscle.charAt(0).toUpperCase() + exercise.main_muscle.slice(1)}
              </Text>
            </View>
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    width: '90%',
    height: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    flexGrow: 1,
  },
  videoContainer: {
    marginBottom: Spacing.lg,
    borderRadius: 8,
    overflow: 'hidden',
  },
  description: {
    ...TextStyles.body,
    color: Colors.foreground,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    lineHeight: 22,
  },
});