import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/auth-context';

interface DetectedExercise {
  name: string;
  main_muscle: string;
  type: string;
  category?: string;
  description?: string;
  pro_tip?: string;
  video_url?: string;
  movement_type?: string;
  movement_pattern?: string;
  duplicate_status: 'none' | 'global' | 'my-exercises';
}

interface Step5Props {
  onNext: (exercises: DetectedExercise[], confirmedNames: Set<string>) => void;
  onBack: () => void;
}

export default function Step5PhotoUpload({ onNext, onBack }: Step5Props) {
  const { session } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const [detectedExercises, setDetectedExercises] = useState<DetectedExercise[]>([]);
  const [confirmedExercises, setConfirmedExercises] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed.');
      return;
    }

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

  const toggleConfirmation = (exerciseName: string) => {
    setConfirmedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseName)) {
        newSet.delete(exerciseName);
      } else {
        newSet.add(exerciseName);
      }
      return newSet;
    });
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'Please upload at least one photo first.');
      return;
    }

    if (!session?.access_token) {
      Alert.alert('Error', 'You must be logged in to use AI analysis.');
      return;
    }

    setAnalyzing(true);
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
        throw new Error(data.error || 'AI analysis failed');
      }

      if (!data.identifiedExercises || data.identifiedExercises.length === 0) {
        Alert.alert('No Equipment Found', 'AI could not identify any exercises from the photos. Try different angles or better lighting.');
        return;
      }

      setDetectedExercises(data.identifiedExercises);
      
      const newExercises = data.identifiedExercises.filter(
        (ex: DetectedExercise) => ex.duplicate_status === 'none'
      );
      const newConfirmed = new Set(newExercises.map((ex: DetectedExercise) => ex.name));
      setConfirmedExercises(newConfirmed);

    } catch (error: any) {
      console.error('AI analysis error:', error);
      Alert.alert('Error', error.message || 'Failed to analyze photos. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNext = () => {
    const newExercisesCount = detectedExercises.filter(ex => ex.duplicate_status === 'none').length;
    
    if (detectedExercises.length > 0 && confirmedExercises.size === 0 && newExercisesCount > 0) {
      Alert.alert('No Selection', 'Please confirm at least one exercise or continue without adding any.');
    }
    
    onNext(detectedExercises, confirmedExercises);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Analyze Your Gym</Text>
      <Text style={styles.subtitle}>
        Upload photos of your gym equipment. Our AI will identify exercises you can do.
      </Text>

      <View style={styles.uploadSection}>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
          <Text style={styles.uploadIcon}>📸</Text>
          <Text style={styles.uploadText}>Upload Gym Photos</Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {images.map((img, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${img}` }}
                    style={styles.image}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.analyzeButton} 
              onPress={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.analyzeButtonText}>✨ Analyze {images.length} Photo(s)</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {detectedExercises.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Detected Exercises</Text>
          <Text style={styles.resultsSubtitle}>Select exercises to add to your gym</Text>

          {detectedExercises.map((exercise, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.exerciseCard,
                confirmedExercises.has(exercise.name) && styles.exerciseCardConfirmed,
              ]}
              onPress={() => toggleConfirmation(exercise.name)}
              disabled={exercise.duplicate_status !== 'none'}
            >
              <View style={styles.exerciseContent}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseMuscle}>{exercise.main_muscle}</Text>
              </View>
              {exercise.duplicate_status === 'none' && confirmedExercises.has(exercise.name) && (
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedText}>✓</Text>
                </View>
              )}
              {exercise.duplicate_status !== 'none' && (
                <View style={styles.duplicateBadge}>
                  <Text style={styles.duplicateText}>
                    {exercise.duplicate_status === 'global' ? 'Global' : 'Exists'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {detectedExercises.length > 0 
              ? confirmedExercises.size > 0 
                ? `Confirm ${confirmedExercises.size} Exercise${confirmedExercises.size > 1 ? 's' : ''}`
                : 'Continue'
              : 'Skip'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
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
    marginBottom: 32,
  },
  uploadSection: {
    marginBottom: 32,
  },
  uploadButton: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  imageScroll: {
    marginTop: 16,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
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
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  analyzeButton: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsSection: {
    marginBottom: 32,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseCardConfirmed: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#0a1a14',
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  exerciseMuscle: {
    fontSize: 13,
    color: '#10B981',
  },
  confirmedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  duplicateBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  duplicateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    flex: 1,
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
  nextButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
