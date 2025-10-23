import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import {
  generateWorkoutProgram,
  type WorkoutGenerationParams,
} from '@data/ai/workout-generator';
import type { Gym } from '@data/storage/models';

export default function AIProgramGeneratorScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { getActiveGym, saveTPath, saveTPathExercises } = useData();

  const [activeGym, setActiveGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [goal, setGoal] =
    useState<WorkoutGenerationParams['goal']>('general_fitness');
  const [experienceLevel, setExperienceLevel] =
    useState<WorkoutGenerationParams['experienceLevel']>('intermediate');
  const [splitType, setSplitType] = useState<'ppl' | 'ulul'>('ppl');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [focusAreas, setFocusAreas] = useState('');
  const [restrictions, setRestrictions] = useState('');

  useEffect(() => {
    loadActiveGym();
  }, [userId, loadActiveGym]);

  const loadActiveGym = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoading(true);
    try {
      const gym = await getActiveGym(userId);
      setActiveGym(gym);
    } catch (error) {
      console.error('Failed to load active gym:', error);
    } finally {
      setLoading(false);
    }
  }, [getActiveGym, userId]);

  const handleGenerate = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to generate programs');
      return;
    }

    if (!activeGym) {
      Alert.alert(
        'No Active Gym',
        'Please set an active gym with equipment before generating a program.'
      );
      return;
    }

    setGenerating(true);
    try {
      const params: WorkoutGenerationParams = {
        goal,
        experienceLevel,
        equipment: activeGym.equipment,
        daysPerWeek: splitType === 'ppl' ? 3 : 4,
        sessionDuration,
        focusAreas: focusAreas.trim()
          ? focusAreas.split(',').map(a => a.trim())
          : undefined,
        restrictions: restrictions.trim()
          ? restrictions.split(',').map(r => r.trim())
          : undefined,
      };

      const program = await generateWorkoutProgram(params);

      const tPathId = `tpath_${Date.now()}`;
      const now = new Date().toISOString();
      const tPath = {
        id: tPathId,
        user_id: userId,
        template_name:
          splitType === 'ppl' ? '3-Day Push/Pull/Legs' : '4-Day Upper/Lower',
        description: program.description,
        is_main_program: true,
        is_ai_generated: true,
        ai_generation_params: JSON.stringify(params),
        settings: { tPathType: splitType, ...params },
        gym_id: activeGym.id,
        created_at: now,
        updated_at: now,
        order_index: 0,
      };

      await saveTPath(tPath);

      // Generate child workouts based on split type
      const childWorkoutNames =
        splitType === 'ppl'
          ? ['Push', 'Pull', 'Legs']
          : ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];

      for (let i = 0; i < childWorkoutNames.length; i++) {
        const childWorkoutId = `tpath_child_${Date.now()}_${i}`;
        const childTPath = {
          id: childWorkoutId,
          user_id: userId,
          template_name: childWorkoutNames[i],
          description: `${childWorkoutNames[i]} workout`,
          is_main_program: false,
          parent_t_path_id: tPathId,
          is_ai_generated: true,
          settings: { tPathType: splitType },
          gym_id: activeGym.id,
          created_at: now,
          updated_at: now,
          order_index: i,
        };

        await saveTPath(childTPath);

        // Add exercises from the generated program if available
        if (program.workouts[i]) {
          const workout = program.workouts[i];
          const exercises = workout.exercises
            .filter((ex: any) => ex.exerciseId)
            .map((ex: any, idx: any) => ({
              t_path_id: childWorkoutId,
              exercise_id: ex.exerciseId!,
              target_sets: ex.sets,
              target_reps_min:
                parseInt(ex.reps.split('-')[0], 10) ||
                parseInt(ex.reps, 10) ||
                10,
              target_reps_max:
                parseInt(ex.reps.split('-')[1], 10) ||
                parseInt(ex.reps, 10) ||
                12,
              rest_seconds: ex.restSeconds,
              notes: ex.notes || null,
              is_bonus_exercise: false,
              order_index: idx,
            }));

          if (exercises.length > 0) {
            await saveTPathExercises(exercises);
          }
        }
      }

      Alert.alert(
        'Program Created!',
        `"${program.name}" has been added to your T-Paths. Ready to start training?`,
        [
          {
            text: 'View Program',
            onPress: () => router.push(`/t-path/${tPathId}`),
          },
          { text: 'Create Another', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Failed to generate program:', error);
      Alert.alert(
        'Generation Failed',
        error instanceof Error
          ? error.message
          : 'Failed to generate workout program'
      );
    } finally {
      setGenerating(false);
    }
  };

  const goals: Array<{
    value: WorkoutGenerationParams['goal'];
    label: string;
  }> = [
    { value: 'strength', label: 'Strength' },
    { value: 'hypertrophy', label: 'Muscle Growth' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'general_fitness', label: 'General Fitness' },
  ];

  const levels: Array<{
    value: WorkoutGenerationParams['experienceLevel'];
    label: string;
  }> = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Program Generator</Text>
        <Text style={styles.subtitle}>
          Create a personalized workout program powered by AI
        </Text>
      </View>

      {activeGym && (
        <View style={styles.gymBadge}>
          <Text style={styles.gymBadgeLabel}>Using equipment from:</Text>
          <Text style={styles.gymBadgeName}>{activeGym.name}</Text>
        </View>
      )}

      {!activeGym && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ No active gym set. Please set an active gym with equipment to
            generate programs.
          </Text>
          <TouchableOpacity
            style={styles.warningButton}
            onPress={() => router.push('/gyms')}
          >
            <Text style={styles.warningButtonText}>Go to Gyms</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training Goal</Text>
        <View style={styles.optionsGrid}>
          {goals.map(g => (
            <TouchableOpacity
              key={g.value}
              style={[
                styles.optionButton,
                goal === g.value && styles.optionButtonActive,
              ]}
              onPress={() => setGoal(g.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  goal === g.value && styles.optionTextActive,
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Split</Text>
        <Text style={styles.inputHint}>Choose your training structure</Text>
        <View style={styles.splitContainer}>
          <TouchableOpacity
            style={[
              styles.splitCard,
              splitType === 'ppl' && styles.splitCardActive,
            ]}
            onPress={() => setSplitType('ppl')}
          >
            <View style={styles.splitHeader}>
              <Text
                style={[
                  styles.splitTitle,
                  splitType === 'ppl' && styles.splitTitleActive,
                ]}
              >
                3-Day Push/Pull/Legs
              </Text>
              <Text
                style={[
                  styles.splitSubtitle,
                  splitType === 'ppl' && styles.splitSubtitleActive,
                ]}
              >
                PPL
              </Text>
            </View>
            <Text
              style={[
                styles.splitFrequency,
                splitType === 'ppl' && styles.splitFrequencyActive,
              ]}
            >
              3 days per week
            </Text>
            <View style={styles.splitProsContainer}>
              <Text
                style={[
                  styles.splitProText,
                  splitType === 'ppl' && styles.splitProTextActive,
                ]}
              >
                ✓ Time efficient
              </Text>
              <Text
                style={[
                  styles.splitProText,
                  splitType === 'ppl' && styles.splitProTextActive,
                ]}
              >
                ✓ Better recovery
              </Text>
              <Text
                style={[
                  styles.splitProText,
                  splitType === 'ppl' && styles.splitProTextActive,
                ]}
              >
                ✓ Logical grouping
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.splitCard,
              splitType === 'ulul' && styles.splitCardActive,
            ]}
            onPress={() => setSplitType('ulul')}
          >
            <View style={styles.splitHeader}>
              <Text
                style={[
                  styles.splitTitle,
                  splitType === 'ulul' && styles.splitTitleActive,
                ]}
              >
                4-Day Upper/Lower
              </Text>
              <Text
                style={[
                  styles.splitSubtitle,
                  splitType === 'ulul' && styles.splitSubtitleActive,
                ]}
              >
                ULUL
              </Text>
            </View>
            <Text
              style={[
                styles.splitFrequency,
                splitType === 'ulul' && styles.splitFrequencyActive,
              ]}
            >
              4 days per week
            </Text>
            <View style={styles.splitProsContainer}>
              <Text
                style={[
                  styles.splitProText,
                  splitType === 'ulul' && styles.splitProTextActive,
                ]}
              >
                ✓ Higher frequency
              </Text>
              <Text
                style={[
                  styles.splitProText,
                  splitType === 'ulul' && styles.splitProTextActive,
                ]}
              >
                ✓ Muscle growth
              </Text>
              <Text
                style={[
                  styles.splitProText,
                  splitType === 'ulul' && styles.splitProTextActive,
                ]}
              >
                ✓ Flexible scheduling
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience Level</Text>
        <View style={styles.optionsRow}>
          {levels.map(l => (
            <TouchableOpacity
              key={l.value}
              style={[
                styles.optionButton,
                experienceLevel === l.value && styles.optionButtonActive,
              ]}
              onPress={() => setExperienceLevel(l.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  experienceLevel === l.value && styles.optionTextActive,
                ]}
              >
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Duration (minutes)</Text>
        <View style={styles.durationSelector}>
          {[30, 45, 60, 75, 90].map(mins => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.durationButton,
                sessionDuration === mins && styles.durationButtonActive,
              ]}
              onPress={() => setSessionDuration(mins)}
            >
              <Text
                style={[
                  styles.durationText,
                  sessionDuration === mins && styles.durationTextActive,
                ]}
              >
                {mins}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Focus Areas (Optional)</Text>
        <Text style={styles.inputHint}>
          Separate with commas (e.g., Upper Body, Core, Legs)
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder="Upper Body, Core..."
          placeholderTextColor="#666"
          value={focusAreas}
          onChangeText={setFocusAreas}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Restrictions (Optional)</Text>
        <Text style={styles.inputHint}>
          Any injuries or limitations (e.g., Lower back issues, No jumping)
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder="No jumping, knee issues..."
          placeholderTextColor="#666"
          value={restrictions}
          onChangeText={setRestrictions}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[
          styles.generateButton,
          (!activeGym || generating) && styles.generateButtonDisabled,
        ]}
        onPress={handleGenerate}
        disabled={!activeGym || generating}
      >
        {generating ? (
          <>
            <ActivityIndicator
              color="#000"
              size="small"
              style={styles.buttonSpinner}
            />
            <Text style={styles.generateButtonText}>Generating...</Text>
          </>
        ) : (
          <Text style={styles.generateButtonText}>✨ Generate Program</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
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
    fontSize: 16,
    color: '#888',
  },
  gymBadge: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  gymBadgeLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  gymBadgeName: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#3f1a00',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ff6b00',
  },
  warningText: {
    color: '#ffa500',
    fontSize: 14,
    marginBottom: 12,
  },
  warningButton: {
    backgroundColor: '#ff6b00',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  warningButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  optionButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#000',
  },
  daysSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  dayButton: {
    flex: 1,
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  dayButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  dayButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: '#000',
  },
  durationSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  durationButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  durationTextActive: {
    color: '#000',
  },
  inputHint: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  generateButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  generateButtonDisabled: {
    backgroundColor: '#333',
  },
  generateButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSpinner: {
    marginRight: 8,
  },
  splitContainer: {
    gap: 12,
  },
  splitCard: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  splitCardActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#10b981',
  },
  splitHeader: {
    marginBottom: 8,
  },
  splitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  splitTitleActive: {
    color: '#10b981',
  },
  splitSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  splitSubtitleActive: {
    color: '#10b981',
  },
  splitFrequency: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  splitFrequencyActive: {
    color: '#10b981',
  },
  splitProsContainer: {
    gap: 4,
  },
  splitProText: {
    fontSize: 13,
    color: '#888',
  },
  splitProTextActive: {
    color: '#10b981',
  },
});
