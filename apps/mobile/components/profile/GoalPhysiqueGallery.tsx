/**
 * GoalPhysiqueGallery component for viewing and managing saved goal physiques
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../app/_contexts/auth-context';
import { getGoalPhysiquePhoto, deleteGoalPhysiquePhoto } from '../../lib/imageUtils';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

const { width } = Dimensions.get('window');

interface GoalPhysique {
  id: string;
  display_name: string;
  local_photo_path: string;
  is_active: boolean;
  uploaded_at: string;
  analysis?: {
    muscle_mass_level: string;
    body_fat_estimated_range: string;
    physique_archetype: string;
    required_training_style: string;
  };
}

interface GoalPhysiqueGalleryProps {
  visible: boolean;
  onClose: () => void;
  onSelectGoal?: (goalPhysique: GoalPhysique) => void;
  onUploadNew?: () => void;
}

export const GoalPhysiqueGallery = ({
  visible,
  onClose,
  onSelectGoal,
  onUploadNew,
}: GoalPhysiqueGalleryProps) => {
  const { supabase, userId } = useAuth();
  const [goalPhysiques, setGoalPhysiques] = useState<GoalPhysique[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomAlertModal, setShowCustomAlertModal] = useState(false);
  const [customAlertConfig, setCustomAlertConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'destructive' }>;
  } | null>(null);

  useEffect(() => {
    if (userId) {
      loadGoalPhysiques();
    }
  }, [userId]);

  const loadGoalPhysiques = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Load goal physiques with their analyses
      const { data: goals, error: goalsError } = await supabase
        .from('goal_physiques')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Load analyses for each goal physique
      const goalsWithAnalysis = await Promise.all(
        (goals || []).map(async (goal) => {
          const { data: analysis } = await supabase
            .from('physique_analyses')
            .select('muscle_mass_level, body_fat_estimated_range, physique_archetype, required_training_style')
            .eq('goal_physique_id', goal.id)
            .single();

          return {
            ...goal,
            analysis: analysis || undefined,
          };
        })
      );

      setGoalPhysiques(goalsWithAnalysis);
    } catch (error) {
      console.error('[GoalPhysiqueGallery] Load error:', error);
      Alert.alert('Error', 'Failed to load goal physiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGoalPhysiques();
  };

  const showCustomAlert = (title: string, message: string, buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'destructive' }>) => {
    setCustomAlertConfig({ title, message, buttons });
    setShowCustomAlertModal(true);
  };

  const handleDeleteGoal = async (goal: GoalPhysique) => {
    showCustomAlert(
      'Delete Goal Physique',
      `Are you sure you want to delete "${goal.display_name}"? This will also delete the associated analysis and recommendations.`,
      [
        { text: 'Cancel', onPress: () => setShowCustomAlertModal(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setShowCustomAlertModal(false);
            try {
              // Delete local photo file
              if (goal.local_photo_path) {
                await deleteGoalPhysiquePhoto(goal.local_photo_path);
              }

              // Delete from database (cascade will handle analysis and recommendations)
              const { error } = await supabase
                .from('goal_physiques')
                .delete()
                .eq('id', goal.id);

              if (error) throw error;

              // Refresh the list
              loadGoalPhysiques();

              Toast.show({
                type: 'success',
                text1: 'Goal physique deleted',
                text2: 'The goal physique and its analysis have been removed.',
                position: 'bottom',
                visibilityTime: 3000,
              });
            } catch (error) {
              console.error('[GoalPhysiqueGallery] Delete error:', error);
              Alert.alert('Error', 'Failed to delete goal physique');
            }
          },
        },
      ]
    );
  };

  const handleSetActive = async (goalId: string) => {
    try {
      // Update the selected goal to active
      const { error: updateError } = await supabase
        .from('goal_physiques')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', goalId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Set all others to inactive
      const { error: deactivateError } = await supabase
        .from('goal_physiques')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .neq('id', goalId)
        .eq('user_id', userId);

      if (deactivateError) throw deactivateError;

      // Refresh the list
      loadGoalPhysiques();

      Toast.show({
        type: 'success',
        text1: 'Goal physique activated',
        text2: 'This goal is now your active target physique.',
        position: 'bottom',
        visibilityTime: 3000,
      });
    } catch (error) {
      console.error('[GoalPhysiqueGallery] Set active error:', error);
      Alert.alert('Error', 'Failed to set active goal');
    }
  };

  const GoalPhysiqueCard = ({ goal }: { goal: GoalPhysique }) => {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(true);

    useEffect(() => {
      const loadImage = async () => {
        if (goal.local_photo_path) {
          const uri = await getGoalPhysiquePhoto(goal.local_photo_path);
          setImageUri(uri);
        }
        setImageLoading(false);
      };
      loadImage();
    }, [goal.local_photo_path]);

    return (
      <View style={styles.goalCard}>
        {/* Image Container with Overlay */}
        <View style={styles.imageContainer}>
          {imageLoading ? (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : imageUri ? (
            <Image source={{ uri: imageUri }} style={[styles.goalImage, styles.centeredImage]} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image" size={40} color={Colors.mutedForeground} />
            </View>
          )}

          {/* Gradient Overlay for better text readability */}
          <View style={styles.imageOverlay} />

          {/* Active Badge - Top Right */}
          {goal.is_active && (
            <View style={styles.activeBadge}>
              <Ionicons name="star" size={12} color={Colors.white} />
              <Text style={styles.activeBadgeText}>Active Goal</Text>
            </View>
          )}

          {/* Title Overlay - Bottom */}
          <View style={styles.titleOverlay}>
            <Text style={styles.overlayTitle} numberOfLines={2}>
              {goal.display_name}
            </Text>
            <Text style={styles.overlayDate}>
              {new Date(goal.uploaded_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Analysis Card */}
        {goal.analysis && (
          <View style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <Ionicons name="analytics" size={16} color={Colors.primary} />
              <Text style={styles.analysisTitle}>AI Analysis</Text>
            </View>

            <View style={styles.analysisContent}>
              <Text style={styles.physiqueType}>
                {goal.analysis.physique_archetype}
              </Text>
              <Text style={styles.trainingStyle}>
                {goal.analysis.required_training_style}
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Muscle</Text>
                  <Text style={styles.metricValue}>{goal.analysis.muscle_mass_level}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Body Fat</Text>
                  <Text style={styles.metricValue}>{goal.analysis.body_fat_estimated_range}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => onSelectGoal?.(goal)}
          >
            <Ionicons name="eye" size={16} color={Colors.white} />
            <Text style={styles.primaryActionText}>View Details</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            {!goal.is_active && (
              <TouchableOpacity
                style={[styles.secondaryButton, styles.activateButton]}
                onPress={() => handleSetActive(goal.id)}
              >
                <Ionicons name="star-outline" size={14} color={Colors.yellow500} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.secondaryButton, styles.deleteButton]}
              onPress={() => handleDeleteGoal(goal)}
            >
              <Ionicons name="trash-outline" size={14} color={Colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderGoalPhysiqueCard = (goal: GoalPhysique) => {
    return <GoalPhysiqueCard key={goal.id} goal={goal} />;
  };

  if (!visible) return null;

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading goal physiques...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={onUploadNew}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>New Goal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {goalPhysiques.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={Colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No Goal Physiques Yet</Text>
            <Text style={styles.emptySubtitle}>
              Upload a photo of your target physique to get AI-powered analysis and personalized training recommendations.
            </Text>
            <TouchableOpacity
              style={styles.emptyUploadButton}
              onPress={onUploadNew}
            >
              <Text style={styles.emptyUploadButtonText}>Set Your First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.gallery}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.galleryContent}
          >
            {goalPhysiques.map(renderGoalPhysiqueCard)}
          </ScrollView>
        )}
          </View>
        </View>

        {/* Custom Alert Modal */}
        <Modal
          visible={showCustomAlertModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCustomAlertModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.customAlert}>
              <Text style={styles.alertTitle}>{customAlertConfig?.title}</Text>
              <Text style={styles.alertMessage}>{customAlertConfig?.message}</Text>
              <View style={styles.alertButtons}>
                {customAlertConfig?.buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.alertButton,
                      button.style === 'destructive' && styles.alertButtonDestructive,
                    ]}
                    onPress={() => {
                      button.onPress?.();
                    }}
                  >
                    <Text style={[
                      styles.alertButtonText,
                      button.style === 'destructive' && styles.alertButtonTextDestructive,
                    ]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </Modal>

      {/* Toast messages appear on top of everything */}
      <Toast />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTitle: {
    color: Colors.foreground,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  uploadButtonText: {
    ...TextStyles.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  gallery: {
    flex: 1,
  },
  galleryContent: {
    padding: Spacing.lg,
  },
  goalCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 320, // Fixed height for consistent card layout
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  goalImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredImage: {
    alignSelf: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  activeBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  activeBadgeText: {
    ...TextStyles.caption,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 11,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
  },
  overlayTitle: {
    ...TextStyles.h4,
    color: Colors.white,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlayDate: {
    ...TextStyles.caption,
    color: Colors.white,
    opacity: 0.9,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  analysisCard: {
    backgroundColor: Colors.secondary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  analysisTitle: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
    fontWeight: '600',
  },
  analysisContent: {
    gap: Spacing.sm,
  },
  physiqueType: {
    ...TextStyles.body,
    color: Colors.primary,
    fontWeight: '700',
  },
  trainingStyle: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    ...TextStyles.small,
    color: Colors.foreground,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsContainer: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  primaryAction: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryActionText: {
    ...TextStyles.body,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  activateButton: {
    borderColor: Colors.yellow500,
  },
  deleteButton: {
    borderColor: Colors.destructive,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl * 2,
  },
  emptyTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  emptyUploadButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emptyUploadButtonText: {
    ...TextStyles.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAlert: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    margin: Spacing.lg,
    minWidth: 280,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alertTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  alertMessage: {
    ...TextStyles.body,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  alertButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 80,
    alignItems: 'center',
  },
  alertButtonDestructive: {
    backgroundColor: Colors.destructive,
  },
  alertButtonText: {
    ...TextStyles.buttonSmall,
    color: Colors.white,
    fontWeight: '600',
  },
  alertButtonTextDestructive: {
    color: Colors.white,
  },
});