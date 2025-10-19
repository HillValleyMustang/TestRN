import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FetchedExerciseDefinition } from '../../app/_lib/supabase';

interface ExerciseInfoDialogProps {
  visible: boolean;
  onClose: () => void;
  exercise: FetchedExerciseDefinition | null;
}

export function ExerciseInfoDialog({ visible, onClose, exercise }: ExerciseInfoDialogProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  if (!exercise) return null;

  const handleGoogleSearch = () => {
    const searchQuery = `${exercise.name} exercise`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    Linking.openURL(url).catch(err => {
      console.error('Error opening Google search:', err);
      Alert.alert('Error', 'Unable to open search');
    });
  };

  const extractYouTubeVideoId = (url: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const videoId = extractYouTubeVideoId(exercise.video_url);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContainer}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{exercise.name} Information</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </Pressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Exercise Details */}
              <Card style={styles.detailsCard}>
                {exercise.main_muscle && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Main Muscle:</Text>
                    <Text style={styles.detailValue}>{exercise.main_muscle}</Text>
                  </View>
                )}

                {exercise.category && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>{exercise.category}</Text>
                  </View>
                )}

                {exercise.equipment && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Equipment:</Text>
                    <Text style={styles.detailValue}>{exercise.equipment}</Text>
                  </View>
                )}

                {exercise.type && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{exercise.type}</Text>
                  </View>
                )}

                {exercise.description && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description:</Text>
                    <Text style={styles.detailValue}>{exercise.description}</Text>
                  </View>
                )}

                {exercise.pro_tip && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pro Tip:</Text>
                    <Text style={styles.detailValue}>{exercise.pro_tip}</Text>
                  </View>
                )}
              </Card>

              {/* YouTube Video */}
              {videoId && (
                <Card style={styles.videoCard}>
                  <Text style={styles.sectionTitle}>Video</Text>
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="play-circle" size={48} color={Colors.primary} />
                    <Text style={styles.videoText}>YouTube Video Available</Text>
                    <Text style={styles.videoSubtext}>Video ID: {videoId}</Text>
                  </View>
                </Card>
              )}

              {/* Google Search Button */}
              <Card style={styles.searchCard}>
                <Button
                  onPress={handleGoogleSearch}
                  style={styles.searchButton}
                >
                  <Ionicons name="search" size={20} color={Colors.primaryForeground} />
                  <Text style={styles.searchButtonText}>Search Google for "{exercise.name}"</Text>
                </Button>
              </Card>
            </ScrollView>

            <View style={styles.footer}>
              <Button
                onPress={onClose}
                style={styles.closeModalButton}
              >
                Close
              </Button>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxWidth: 600,
    maxHeight: '75%',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
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
    maxHeight: '75%',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: Spacing.lg,
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  detailsCard: {
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.foreground,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  videoCard: {
    marginBottom: Spacing.lg,
  },
  videoPlaceholder: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
  },
  videoText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: Spacing.sm,
  },
  videoSubtext: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
  },
  searchCard: {
    marginBottom: Spacing.lg,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primaryForeground,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closeModalButton: {
    width: '100%',
  },
});