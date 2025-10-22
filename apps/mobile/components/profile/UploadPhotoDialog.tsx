/**
 * UploadPhotoDialog component for previewing and uploading progress photos
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { validateImageSize, uploadImageToSupabase } from '../../lib/imageUtils';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface UploadPhotoDialogProps {
  visible: boolean;
  onClose: () => void;
  imageUri: string | null;
  onUploadSuccess: () => void;
  isFromGallery?: boolean; // New prop to indicate if photo is from gallery
}

export const UploadPhotoDialog = ({
  visible,
  onClose,
  imageUri,
  onUploadSuccess,
  isFromGallery = false,
}: UploadPhotoDialogProps) => {
  const { session, supabase, userId } = useAuth();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!visible) {
      setNotes('');
      setSelectedDate(new Date());
      setShowDatePicker(false);
    }
  }, [visible]);

  const calculateWorkoutsSinceLastPhoto = async (): Promise<number | null> => {
    if (!userId) return null;

    try {
      // Find the timestamp of the user's most recent photo
      const { data: lastPhoto, error: lastPhotoError } = await supabase
        .from('progress_photos')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastPhotoError && lastPhotoError.code !== 'PGRST116') {
        throw lastPhotoError;
      }

      // If a previous photo exists, count workouts since then
      if (lastPhoto) {
        const { count, error: countError } = await supabase
          .from('workout_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .gt('completed_at', lastPhoto.created_at);

        if (countError) {
          throw countError;
        }
        return count || 0;
      }

      return null;
    } catch (error) {
      console.error('[UploadPhotoDialog] Error calculating workouts:', error);
      return null;
    }
  };

  const handleUpload = async () => {
    if (!imageUri || !session?.user?.id) {
      Alert.alert('Error', 'Missing image or authentication');
      return;
    }

    setLoading(true);

    try {
      // Validate file size
      await validateImageSize(imageUri, 5);

      // Calculate workouts since last photo
      const workoutsSinceLastPhoto = await calculateWorkoutsSinceLastPhoto();

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `progress-photo-${timestamp}.jpg`;
      const filePath = `${session.user.id}/${timestamp}-${fileName}`;

      // Upload to Supabase Storage
      await uploadImageToSupabase(supabase, 'user-photos', filePath, imageUri);

      // Insert record into database
      const { error: insertError } = await supabase
        .from('progress_photos')
        .insert({
          user_id: session.user.id,
          photo_path: filePath,
          notes: notes.trim() || null,
          workouts_since_last_photo: workoutsSinceLastPhoto,
          created_at: selectedDate.toISOString(), // Use selected date for gallery photos
        });

      if (insertError) {
        throw insertError;
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Photo uploaded successfully!',
        position: 'bottom',
        visibilityTime: 3000,
      });
      onUploadSuccess();
      onClose();
    } catch (error: any) {
      console.error('[UploadPhotoDialog] Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload Progress Photo</Text>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Ionicons name="close" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Morning weight: 75kg"
              multiline
              numberOfLines={3}
              maxLength={500}
              editable={!loading}
            />
          </View>

          {isFromGallery && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Photo Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                disabled={loading}
              >
                <Text style={styles.dateButtonText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
                <Ionicons name="calendar" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.uploadButton, loading && styles.disabledButton]}
            onPress={handleUpload}
            disabled={loading || !imageUri}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Photo Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              {/* Date picker with calendar and presets */}
              <View style={styles.datePickerButtons}>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    setSelectedDate(new Date());
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePresetButtonText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePresetButtonText}>Yesterday</Text>
                </TouchableOpacity>
              </View>

              {/* Month/Year selector */}
              <View style={styles.monthYearSelector}>
                <TouchableOpacity
                  style={styles.monthButton}
                  onPress={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.monthYearText}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                  style={styles.monthButton}
                  onPress={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                >
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Calendar grid */}
              <View style={styles.calendarGrid}>
                {/* Day headers */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Text key={index} style={styles.dayHeader}>{day}</Text>
                ))}

                {/* Calendar days */}
                {(() => {
                  const year = selectedDate.getFullYear();
                  const month = selectedDate.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const days = [];

                  // Add empty cells for days before the first day of the month
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
                  }

                  // Add days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isFuture = date > new Date();

                    days.push(
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.selectedDay,
                          isToday && styles.todayDay,
                          isFuture && styles.disabledDay
                        ]}
                        onPress={() => {
                          if (!isFuture) {
                            setSelectedDate(date);
                            setShowDatePicker(false);
                          }
                        }}
                        disabled={isFuture}
                      >
                        <Text style={[
                          styles.calendarDayText,
                          isSelected && styles.selectedDayText,
                          isToday && styles.todayDayText,
                          isFuture && styles.disabledDayText
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  return days;
                })()}
              </View>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    margin: Spacing.lg,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  content: {
    padding: Spacing.lg,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.muted,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.muted,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.foreground,
    flex: 1,
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    margin: Spacing.lg,
    maxWidth: 400,
    width: '90%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  datePickerContent: {
    padding: Spacing.lg,
  },
  datePickerButtons: {
    gap: Spacing.md,
  },
  datePresetButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.muted,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  datePresetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  monthYearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  monthButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.muted,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
    marginBottom: Spacing.sm,
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  selectedDay: {
    backgroundColor: Colors.primary,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  calendarDayText: {
    fontSize: 16,
    color: Colors.foreground,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
  todayDayText: {
    fontWeight: '600',
  },
  disabledDay: {
    opacity: 0.3,
  },
  disabledDayText: {
    color: Colors.mutedForeground,
  },
});