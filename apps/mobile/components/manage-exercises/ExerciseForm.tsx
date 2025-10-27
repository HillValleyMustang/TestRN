import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as z from 'zod';
import { useAuth } from '../../app/_contexts/auth-context';
import { FetchedExerciseDefinition } from '../../../../packages/data/src/types/exercise';
import { Button } from '../../app/_components/ui/Button';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  main_muscles: z.array(z.string()).min(1, "At least one main muscle group is required."),
  type: z.array(z.enum(["weight", "timed", "bodyweight"])).min(1, "At least one exercise type is required."),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  pro_tip: z.string().optional().nullable(),
  video_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')).nullable(),
  movement_type: z.enum(["compound", "isolation"]).optional().nullable(),
  movement_pattern: z.enum(["Push", "Pull", "Legs", "Core"]).optional().nullable(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

interface ExerciseFormProps {
  editingExercise: FetchedExerciseDefinition | null;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
}

const mainMuscleGroups = [
  "Pectorals", "Deltoids", "Lats", "Traps", "Biceps",
  "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves",
  "Abdominals", "Core", "Full Body"
];

const categoryOptions = [
  { value: "Unilateral", label: "Unilateral", description: "Movement performed with one arm or leg at a time" },
  { value: "Bilateral", label: "Bilateral", description: "Both arms or legs move together" }
];

export const ExerciseForm: React.FC<ExerciseFormProps> = ({
  editingExercise,
  onCancelEdit,
  onSaveSuccess,
}) => {
  const { userId, supabase } = useAuth();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: "",
    main_muscles: [],
    type: [],
    category: null,
    description: null,
    pro_tip: null,
    video_url: null,
    movement_type: null,
    movement_pattern: null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ExerciseFormData, { message: string }>>>({});

  useEffect(() => {
    if (editingExercise) {
      const muscleGroups = editingExercise.main_muscle ? editingExercise.main_muscle.split(',').map((m: string) => m.trim()) : [];

      setFormData({
        name: editingExercise.name,
        main_muscles: muscleGroups,
        type: editingExercise.type ? [editingExercise.type] as ("weight" | "timed" | "bodyweight")[] : [],
        category: editingExercise.category || null,
        description: editingExercise.description || "",
        pro_tip: editingExercise.pro_tip || "",
        video_url: editingExercise.video_url || "",
        movement_type: (editingExercise.movement_type as "compound" | "isolation" | null) || null,
        movement_pattern: (editingExercise.movement_pattern as "Push" | "Pull" | "Legs" | "Core" | null) || null,
      });
      setSelectedMuscles(muscleGroups);
      setSelectedTypes(editingExercise.type ? [editingExercise.type] as ("weight" | "timed" | "bodyweight")[] : []);
      setErrors({});
    } else {
      setFormData({
        name: "",
        main_muscles: [],
        type: [],
        category: null,
        description: null,
        pro_tip: null,
        video_url: null,
        movement_type: null,
        movement_pattern: null,
      });
      setSelectedMuscles([]);
      setSelectedTypes([]);
      setErrors({});
    }
  }, [editingExercise]);

  const validateForm = (data: ExerciseFormData) => {
    try {
      exerciseSchema.parse(data);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof ExerciseFormData, { message: string }>> = {};
        error.issues.forEach((err) => {
          const path = err.path[0] as keyof ExerciseFormData;
          newErrors[path] = { message: err.message };
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleTypeChange = (type: "weight" | "timed" | "bodyweight") => {
    const newFormData = { ...formData, type: [type] };
    setFormData(newFormData);
    setSelectedTypes([type]);
    validateForm(newFormData);
  };

  const handleMuscleToggle = (muscle: string) => {
    const currentMuscles = formData.main_muscles || [];
    let newMuscles;

    if (currentMuscles.includes(muscle)) {
      newMuscles = currentMuscles.filter((m) => m !== muscle);
    } else {
      newMuscles = [...currentMuscles, muscle];
    }

    const newFormData = { ...formData, main_muscles: newMuscles };
    setFormData(newFormData);
    setSelectedMuscles(newMuscles);
    validateForm(newFormData);
  };

  const getYouTubeEmbedUrl = (url: string | null): string | null => {
    if (!url) return null;
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
    const match = url.match(regExp);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const onSubmit = async () => {
    if (!validateForm(formData)) {
      return;
    }

    if (!userId) {
      Alert.alert("Error", "You must be logged in to save exercises.");
      return;
    }

    setIsSubmitting(true);

    try {
      const exerciseData = {
        name: formData.name,
        main_muscle: formData.main_muscles.join(', '),
        type: formData.type[0],
        category: formData.category,
        description: formData.description,
        pro_tip: formData.pro_tip,
        video_url: getYouTubeEmbedUrl(formData.video_url || null),
        movement_type: formData.movement_type,
        movement_pattern: formData.movement_pattern,
      };

      const isEditingUserOwned = editingExercise && editingExercise.user_id === userId && editingExercise.library_id === null && editingExercise.id !== null;

      if (isEditingUserOwned) {
        const { error } = await supabase
          .from('exercise_definitions')
          .update(exerciseData)
          .eq('id', editingExercise.id);

        if (error) throw error;

        Alert.alert("Success", "Exercise updated successfully!");
        onSaveSuccess();
      } else {
        const { error } = await supabase.from('exercise_definitions').insert([{
          ...exerciseData,
          user_id: userId,
          library_id: null,
          is_favorite: false,
          created_at: new Date().toISOString(),
        }]).select('id').single();

        if (error) throw error;

        Alert.alert("Success", "Exercise added successfully!");
        setFormData({
          name: "",
          main_muscles: [],
          type: [],
          category: null,
          description: null,
          pro_tip: null,
          video_url: null,
          movement_type: null,
          movement_pattern: null,
        });
        setSelectedMuscles([]);
        setSelectedTypes([]);
        setErrors({});
        onSaveSuccess();
      }
    } catch (error) {
      console.error("Failed to save exercise:", error);
      Alert.alert("Error", "Failed to save exercise. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Exercise Name */}
      <View style={styles.section}>
        <Text style={styles.label}>Exercise Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={formData.name}
          onChangeText={(text) => {
            const newFormData = { ...formData, name: text };
            setFormData(newFormData);
            validateForm(newFormData);
          }}
          placeholder="Enter exercise name"
          placeholderTextColor={Colors.mutedForeground}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
      </View>

      {/* Main Muscles */}
      <View style={styles.section}>
        <Text style={styles.label}>Main Muscle Groups *</Text>
        <View style={styles.muscleGrid}>
          {mainMuscleGroups.map((muscle) => (
            <TouchableOpacity
              key={muscle}
              style={[
                styles.muscleButton,
                selectedMuscles.includes(muscle) && styles.muscleButtonSelected,
              ]}
              onPress={() => handleMuscleToggle(muscle)}
            >
              <Text
                style={[
                  styles.muscleButtonText,
                  selectedMuscles.includes(muscle) && styles.muscleButtonTextSelected,
                ]}
              >
                {muscle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.main_muscles && <Text style={styles.errorText}>{errors.main_muscles.message}</Text>}
      </View>

      {/* Exercise Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Exercise Type *</Text>
        <View style={styles.typeContainer}>
          {(["weight", "timed", "bodyweight"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                selectedTypes.includes(type) && styles.typeButtonSelected,
              ]}
              onPress={() => handleTypeChange(type)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  selectedTypes.includes(type) && styles.typeButtonTextSelected,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.type && <Text style={styles.errorText}>{errors.type.message}</Text>}
      </View>

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.label}>Category (Optional)</Text>
        <View style={styles.categoryContainer}>
          {categoryOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.categoryButton,
                formData.category === option.value && styles.categoryButtonSelected,
              ]}
              onPress={() => {
                const newFormData = { ...formData, category: option.value };
                setFormData(newFormData);
                validateForm(newFormData);
              }}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  formData.category === option.value && styles.categoryButtonTextSelected,
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.categoryDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Movement Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Movement Type (Optional)</Text>
        <View style={styles.movementContainer}>
          {(["compound", "isolation"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.movementButton,
                formData.movement_type === type && styles.movementButtonSelected,
              ]}
              onPress={() => {
                const newFormData = { ...formData, movement_type: type };
                setFormData(newFormData);
                validateForm(newFormData);
              }}
            >
              <Text
                style={[
                  styles.movementButtonText,
                  formData.movement_type === type && styles.movementButtonTextSelected,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Movement Pattern */}
      <View style={styles.section}>
        <Text style={styles.label}>Movement Pattern (Optional)</Text>
        <View style={styles.movementContainer}>
          {(["Push", "Pull", "Legs", "Core"] as const).map((pattern) => (
            <TouchableOpacity
              key={pattern}
              style={[
                styles.movementButton,
                formData.movement_pattern === pattern && styles.movementButtonSelected,
              ]}
              onPress={() => {
                const newFormData = { ...formData, movement_pattern: pattern };
                setFormData(newFormData);
                validateForm(newFormData);
              }}
            >
              <Text
                style={[
                  styles.movementButtonText,
                  formData.movement_pattern === pattern && styles.movementButtonTextSelected,
                ]}
              >
                {pattern}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.textArea, errors.description && styles.inputError]}
          value={formData.description || ""}
          onChangeText={(text) => {
            const newFormData = { ...formData, description: text || null };
            setFormData(newFormData);
            validateForm(newFormData);
          }}
          placeholder="Enter exercise description"
          placeholderTextColor={Colors.mutedForeground}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}
      </View>

      {/* Pro Tip */}
      <View style={styles.section}>
        <Text style={styles.label}>Pro Tip (Optional)</Text>
        <TextInput
          style={[styles.textArea, errors.pro_tip && styles.inputError]}
          value={formData.pro_tip || ""}
          onChangeText={(text) => {
            const newFormData = { ...formData, pro_tip: text || null };
            setFormData(newFormData);
            validateForm(newFormData);
          }}
          placeholder="Enter pro tip"
          placeholderTextColor={Colors.mutedForeground}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        {errors.pro_tip && <Text style={styles.errorText}>{errors.pro_tip.message}</Text>}
      </View>

      {/* Video URL */}
      <View style={styles.section}>
        <Text style={styles.label}>Video URL (Optional)</Text>
        <TextInput
          style={[styles.input, errors.video_url && styles.inputError]}
          value={formData.video_url || ""}
          onChangeText={(text) => {
            const newFormData = { ...formData, video_url: text || null };
            setFormData(newFormData);
            validateForm(newFormData);
          }}
          placeholder="https://youtube.com/watch?v=..."
          placeholderTextColor={Colors.mutedForeground}
          keyboardType="url"
          autoCapitalize="none"
        />
        {errors.video_url && <Text style={styles.errorText}>{errors.video_url.message}</Text>}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          variant="outline"
          size="lg"
          onPress={onCancelEdit}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="lg"
          onPress={onSubmit}
          loading={isSubmitting}
          style={styles.saveButton}
        >
          {editingExercise ? "Update Exercise" : "Save Exercise"}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.foreground,
    backgroundColor: Colors.card,
  },
  inputError: {
    borderColor: Colors.destructive,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.foreground,
    backgroundColor: Colors.card,
    minHeight: 80,
  },
  errorText: {
    color: Colors.destructive,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  muscleButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  muscleButtonSelected: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  muscleButtonText: {
    color: Colors.foreground,
    fontSize: 14,
  },
  muscleButtonTextSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  typeButtonText: {
    color: Colors.foreground,
    fontSize: 16,
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: Colors.white,
  },
  categoryContainer: {
    gap: Spacing.sm,
  },
  categoryButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  categoryButtonSelected: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  categoryButtonText: {
    color: Colors.foreground,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  categoryButtonTextSelected: {
    color: Colors.white,
  },
  categoryDescription: {
    color: Colors.mutedForeground,
    fontSize: 14,
  },
  movementContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  movementButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  movementButtonSelected: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  movementButtonText: {
    color: Colors.foreground,
    fontSize: 14,
  },
  movementButtonTextSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default ExerciseForm;