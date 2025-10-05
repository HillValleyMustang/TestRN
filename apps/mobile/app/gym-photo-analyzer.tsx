import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from './contexts/auth-context';
import { useRouter } from 'expo-router';

interface DetectedExercise {
  id?: string;
  name: string;
  main_muscle: string;
  type: 'weight' | 'timed' | 'bodyweight';
  category: 'Bilateral' | 'Unilateral' | null;
  movement_type?: 'compound' | 'isolation';
  movement_pattern?: 'Push' | 'Pull' | 'Legs' | 'Core';
  description: string;
  pro_tip: string;
  video_url?: string;
  duplicate_status: 'none' | 'global' | 'my-exercises';
  existing_id?: string;
}

export default function GymPhotoAnalyzerScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [detectedExercises, setDetectedExercises] = useState<DetectedExercise[]>([]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and photo library permissions are needed to use this feature.');
      return false;
    }
    return true;
  };

  const pickFromCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImages(prev => [...prev, result.assets[0].base64!]);
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const newImages = result.assets
        .filter(asset => asset.base64)
        .map(asset => asset.base64!);
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'Please add at least one image to analyze.');
      return;
    }

    if (!session?.access_token) {
      Alert.alert('Not Logged In', 'You must be logged in to use this feature.');
      return;
    }

    setLoading(true);
    try {
      const SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti';
      const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/identify-equipment`;

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ base64Images: images }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze images');
      }

      const identifiedExercises = data.identifiedExercises || [];
      
      if (identifiedExercises.length === 0) {
        Alert.alert(
          'No Exercises Found',
          'The AI couldn\'t identify any specific exercises from the uploaded images. Please try different angles or add them manually.'
        );
        return;
      }

      setDetectedExercises(identifiedExercises);
      Alert.alert(
        'Analysis Complete!',
        `Found ${identifiedExercises.length} exercises. Review them below.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error analyzing images:', error);
      Alert.alert('Analysis Failed', error.message || 'An error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  };

  const getDuplicateStatusColor = (status: string) => {
    switch (status) {
      case 'my-exercises':
        return '#F59E0B';
      case 'global':
        return '#3B82F6';
      default:
        return '#10B981';
    }
  };

  const getDuplicateStatusText = (status: string) => {
    switch (status) {
      case 'my-exercises':
        return 'Already in My Exercises';
      case 'global':
        return 'Global Exercise';
      default:
        return 'New Exercise';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>📸 Analyze Gym Equipment</Text>
        <Text style={styles.subtitle}>
          Take photos of your gym equipment and let AI identify possible exercises
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Photos</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.uploadButton} onPress={pickFromCamera}>
            <Text style={styles.uploadButtonText}>📷 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadButton} onPress={pickFromGallery}>
            <Text style={styles.uploadButtonText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>

        {images.length > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>{images.length} image(s) selected</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {images.map((img, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${img}` }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
              onPress={analyzeImages}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.analyzeButtonText}>✨ Analyze {images.length} Image(s)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {detectedExercises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected Exercises ({detectedExercises.length})</Text>
          {detectedExercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getDuplicateStatusColor(exercise.duplicate_status) },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {getDuplicateStatusText(exercise.duplicate_status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.exerciseMuscle}>{exercise.main_muscle}</Text>
              <Text style={styles.exerciseType}>
                {exercise.type} • {exercise.category || 'N/A'} • {exercise.movement_type || 'N/A'}
              </Text>
              {exercise.description && (
                <Text style={styles.exerciseDescription}>{exercise.description}</Text>
              )}
              {exercise.pro_tip && (
                <View style={styles.proTipContainer}>
                  <Text style={styles.proTipLabel}>💡 Pro Tip:</Text>
                  <Text style={styles.proTipText}>{exercise.pro_tip}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  analyzeButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  exerciseMuscle: {
    fontSize: 16,
    color: '#10B981',
    marginBottom: 4,
  },
  exerciseType: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    lineHeight: 20,
  },
  proTipContainer: {
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  proTipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  proTipText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  backButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
