import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './_contexts/auth-context';
import { useOnboardingPersistence } from '../hooks/useOnboardingPersistence';
import { useData } from './_contexts/data-context';
import Step1PersonalInfo from '../components/onboarding/_step1-personal-info';
import Step2TrainingSetup from '../components/onboarding/_step2-training-setup';
import Step3GoalsPreferences from '../components/onboarding/_step3-goals-preferences';
import Step4GymConsent from '../components/onboarding/_step4-gym-consent';
import Step5PhotoUpload from '../components/onboarding/_step5-photo-upload';
import { OnboardingSummaryModal } from '../components/onboarding/OnboardingSummaryModal';
import { OnboardingErrorBoundary } from '../components/OnboardingErrorBoundary';
import { OnboardingLoadingOverlay } from '../components/onboarding/OnboardingLoadingOverlay';
import { validateCompleteOnboarding, showValidationAlert } from '../lib/onboardingValidation';
import { cleanupOnboardingData } from '../lib/onboardingCleanup';
import { AIWorkoutService, OnboardingPayload } from '../lib/ai-workout-service';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { TextStyles } from '../constants/Typography';
import { v4 as uuidv4 } from 'uuid';

interface Step1Data {
  fullName: string;
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weight: number | null;
  bodyFatPct: number | null;
  heightUnit: 'cm' | 'ft';
  weightUnit: 'kg' | 'lbs';
  unitSystem: 'metric' | 'imperial';
}

interface Step2Data {
  tPathType: 'ppl' | 'ulul' | null;
  experience: 'beginner' | 'intermediate' | null;
}

interface Step3Data {
  goalFocus: string;
  preferredMuscles: string;
  constraints: string;
  sessionLength: string;
}

interface Step4Data {
  gymName: string;
  equipmentMethod: 'photo' | 'skip' | null;
  consentGiven: boolean;
}

export default function OnboardingScreen() {
  const { session, userId, supabase } = useAuth();
  const router = useRouter();
  const { forceRefreshProfile, addGym } = useData();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Setting up your profile...');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [onboardingResult, setOnboardingResult] = useState<any>(null);

  // Use persistence hook
  const {
    onboardingData,
    isLoading: persistenceLoading,
    error: persistenceError,
    saveStepData,
    updateCurrentStep,
    clearData,
    progress,
    setIsCompleting,
  } = useOnboardingPersistence();

  // Initialize state from persisted data or defaults
  const [currentStep, setCurrentStep] = useState(onboardingData?.currentStep || 1);
  const [step1Data, setStep1Data] = useState<Step1Data>(
    onboardingData?.step1 || {
      fullName: '',
      heightCm: null,
      heightFt: null,
      heightIn: null,
      weight: null,
      bodyFatPct: null,
      heightUnit: 'ft',
      weightUnit: 'kg',
      unitSystem: 'imperial',
    }
  );

  const [step2Data, setStep2Data] = useState<Step2Data>(
    onboardingData?.step2 || {
      tPathType: null,
      experience: null,
    }
  );

  const [step3Data, setStep3Data] = useState<Step3Data>(
    onboardingData?.step3 || {
      goalFocus: '',
      preferredMuscles: '',
      constraints: '',
      sessionLength: '',
    }
  );

  const [step4Data, setStep4Data] = useState<Step4Data>(
    onboardingData?.step4 || {
      gymName: '',
      equipmentMethod: null,
      consentGiven: false,
    }
  );

  const [identifiedExercises, setIdentifiedExercises] = useState<any[]>(
    onboardingData?.step5?.identifiedExercises || []
  );
  const [confirmedExerciseNames, setConfirmedExerciseNames] = useState<Set<string>>(
    onboardingData?.step5?.confirmedExerciseNames || new Set()
  );

  // Update local state when persisted data loads
  useEffect(() => {
    if (onboardingData) {
      setCurrentStep(onboardingData.currentStep);
      setStep1Data({
        ...onboardingData.step1,
        unitSystem: onboardingData.step1.unitSystem || 'imperial',
      });
      setStep2Data(onboardingData.step2);
      setStep3Data(onboardingData.step3);
      setStep4Data(onboardingData.step4);
      setIdentifiedExercises(onboardingData.step5?.identifiedExercises || []);
      setConfirmedExerciseNames(onboardingData.step5?.confirmedExerciseNames || new Set());
    }
  }, [onboardingData]);

  // Persist step changes
  const handleStepChange = async (newStep: number) => {
    setCurrentStep(newStep);
    await updateCurrentStep(newStep);
  };

  // Persist step data changes
  const handleStep1DataChange = async (data: Step1Data) => {
    setStep1Data(data);
    await saveStepData(1, data);
  };

  const handleStep2DataChange = async (data: Step2Data) => {
    setStep2Data(data);
    await saveStepData(2, data);
  };

  const handleStep3DataChange = async (data: Step3Data) => {
    setStep3Data(data);
    await saveStepData(3, data);
  };

  const handleStep4DataChange = async (data: Step4Data) => {
    setStep4Data(data);
    await saveStepData(4, data);
  };

  const submitOnboarding = async () => {
    if (!session?.access_token || !userId) {
      Alert.alert('Error', 'You must be logged in to complete onboarding.');
      return;
    }

    // Set completion flag to prevent data clearing
    setIsCompleting(true);

    // Comprehensive validation before submission
    const validation = validateCompleteOnboarding(
      step1Data,
      step2Data,
      step3Data,
      step4Data
    );

    if (!validation.isValid) {
      setIsCompleting(false);
      showValidationAlert(validation, 'Please Complete Required Fields');
      return;
    }

    // Show warnings if any
    if (Object.keys(validation.warnings).length > 0) {
      showValidationAlert(validation, 'Please Review Your Information');
      // Continue with submission despite warnings
    }

    const finalHeightCm = step1Data.heightCm;
    const finalWeightKg = step1Data.weight;

    setLoading(true);
    setLoadingMessage('Creating your personalized workout plan...');
    try {
      const confirmedExercises =
        step4Data.equipmentMethod === 'photo'
          ? identifiedExercises.filter(ex =>
              confirmedExerciseNames.has(ex.name)
            )
          : [];

      // 1. Create Gym record
      const newGym = {
        id: uuidv4(), // Generate a unique ID for the new gym
        user_id: userId,
        name: step4Data.gymName,
        description: `Gym created during onboarding for ${step4Data.gymName}`,
        equipment: [], // This will be updated by AI later if photo method is used
        is_active: true, // Set as active by default
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add the new gym to the database
      await addGym(newGym);
      console.log(`[Onboarding] Created new gym: ${newGym.name} with ID: ${newGym.id}`);

      const payload: OnboardingPayload = {
        fullName: step1Data.fullName,
        heightCm: finalHeightCm!,
        weightKg: finalWeightKg!,
        bodyFatPct: step1Data.bodyFatPct,
        tPathType: step2Data.tPathType!,
        experience: step2Data.experience!,
        goalFocus: step3Data.goalFocus,
        preferredMuscles: step3Data.preferredMuscles,
        constraints: step3Data.constraints,
        sessionLength: step3Data.sessionLength,
        gymId: newGym.id, // Pass the newly created gym's ID
        equipmentMethod: step4Data.equipmentMethod!,
        confirmedExercises,
        unitSystem: step1Data.unitSystem,
      };

      // Use AI service to complete onboarding
      const aiResponse = await AIWorkoutService.completeOnboardingWithAI(
        payload,
        session.access_token,
        userId
      );

      // Store onboarding result for summary modal
      console.log('[Onboarding] AI Response received:', JSON.stringify(aiResponse, null, 2));
      setOnboardingResult(aiResponse);
      setShowSummaryModal(true);
    } catch (error: any) {
      console.error('Onboarding error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to complete onboarding. Please try again.'
      );
    } finally {
      setLoading(false);
      setIsCompleting(false);
    }
  };

  const handleStep5Complete = async (exercises: any[], confirmed: Set<string>) => {
    setIdentifiedExercises(exercises);
    setConfirmedExerciseNames(confirmed);

    // Save step 5 data
    await saveStepData(5, {
      identifiedExercises: exercises,
      confirmedExerciseNames: confirmed,
    });

    submitOnboarding();
  };

  // Handle loading states
  if (persistenceLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <OnboardingLoadingOverlay
          visible={true}
          message={persistenceLoading ? 'Loading your progress...' : loadingMessage}
          progress={progress > 0 ? progress : 0}
          showProgress={progress > 0}
          type="spinner"
        />
      </View>
    );
  }

  // Handle persistence errors
  if (persistenceError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to load progress</Text>
        <Text style={styles.errorText}>{persistenceError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            // Force reload by clearing and reloading data
            clearData().then(() => {
              // This will trigger a re-render and reload
              // In React Native, we can use a simple state reset
              setTimeout(() => {
                // Trigger a re-render by updating a dummy state
                // This is a simple way to reload the component
              }, 100);
            });
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <OnboardingErrorBoundary
      onRetry={() => {
        // Force reload the component
        setTimeout(() => {
          // This will trigger a re-render
        }, 100);
      }}
      onReset={async () => {
        await clearData();
        setCurrentStep(1);
        setStep1Data({
          fullName: '',
          heightCm: null,
          heightFt: null,
          heightIn: null,
          weight: null,
          bodyFatPct: null,
          heightUnit: 'ft',
          weightUnit: 'kg',
          unitSystem: 'imperial',
        });
        setStep2Data({
          tPathType: null,
          experience: null,
        });
        setStep3Data({
          goalFocus: '',
          preferredMuscles: '',
          constraints: '',
          sessionLength: '',
        });
        setStep4Data({
          gymName: '',
          equipmentMethod: null,
          consentGiven: false,
        });
        setIdentifiedExercises([]);
        setConfirmedExerciseNames(new Set());
      }}
    >
      <View style={styles.container}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5].map(step => (
            <View
              key={step}
              style={[
                styles.progressDot,
                currentStep >= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {currentStep === 1 && (
          <Step1PersonalInfo
            data={step1Data}
            onDataChange={handleStep1DataChange}
            onNext={() => handleStepChange(2)}
          />
        )}

        {/* Debug info for development - positioned at top */}
        {__DEV__ && (
          <View style={{ padding: 10, backgroundColor: 'yellow', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999 }}>
            <Text>Debug: Current Step: {currentStep}</Text>
            <Text>Step1 Data type: {typeof step1Data}</Text>
            <Text>Step1 Data is null: {step1Data === null ? 'true' : 'false'}</Text>
            <Text>Step1 Data is undefined: {step1Data === undefined ? 'true' : 'false'}</Text>
          </View>
        )}

        {currentStep === 2 && (
          <Step2TrainingSetup
            data={step2Data}
            onDataChange={handleStep2DataChange}
            onNext={() => handleStepChange(3)}
            onBack={() => handleStepChange(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3GoalsPreferences
            data={step3Data}
            onDataChange={handleStep3DataChange}
            onNext={() => handleStepChange(4)}
            onBack={() => handleStepChange(2)}
          />
        )}

        {currentStep === 4 && (
          <Step4GymConsent
            data={step4Data}
            onDataChange={handleStep4DataChange}
            onNext={() => handleStepChange(5)}
            onBack={() => handleStepChange(3)}
            onSkipPhoto={submitOnboarding}
          />
        )}

        {currentStep === 5 && (
          <Step5PhotoUpload
            onNext={handleStep5Complete}
            onBack={() => handleStepChange(4)}
          />
        )}

        {/* Loading overlay for transitions */}
        <OnboardingLoadingOverlay
          visible={false} // Controlled by individual step components
          message="Processing..."
          type="spinner"
        />

        {/* Onboarding Summary Modal */}
        {onboardingResult && (
          <OnboardingSummaryModal
            visible={showSummaryModal}
            onClose={async () => {
              console.log('[OnboardingSummaryModal] Start Training pressed');
              setShowSummaryModal(false);
              setLoadingMessage('Finalizing your setup...');
              setLoading(true);

              try {
                // Comprehensive cleanup after onboarding completion
                const cleanupResult = await cleanupOnboardingData();
                if (!cleanupResult.success) {
                  console.warn('[Onboarding] Cleanup had issues:', cleanupResult.errors);
                  // Don't block completion for cleanup issues
                } else {
                  console.log('[Onboarding] Cleanup completed successfully:', cleanupResult.cleanedItems);
                }
              } catch (error) {
                console.warn('[Onboarding] Cleanup failed:', error);
                // Don't block completion for cleanup issues
              }

              // Mark onboarding as complete in database
              console.log('[Onboarding] Marking onboarding as complete for user:', userId);
              if (userId && supabase) {
                console.log('[Onboarding] About to update profile in database...');
                const updateData = {
                  onboarding_completed: true,
                  programme_type: step2Data.tPathType,
                  preferred_session_length: step3Data.sessionLength,
                  full_name: step1Data.fullName,
                  height_cm: step1Data.heightCm,
                  weight_kg: step1Data.weight,
                  body_fat_pct: step1Data.bodyFatPct,
                  primary_goal: step3Data.goalFocus,
                  preferred_muscles: step3Data.preferredMuscles,
                  health_notes: step3Data.constraints,
                  active_t_path_id: onboardingResult.mainTPath?.id || null
                };
                console.log('[Onboarding] Update data:', JSON.stringify(updateData, null, 2));
                console.log('[Onboarding] Updating user ID:', userId);

                const updateResult = await supabase
                  .from('profiles')
                  .update(updateData)
                  .eq('id', userId);

                console.log('[Onboarding] Database update result:', JSON.stringify(updateResult, null, 2));
                console.log('[Onboarding] Update error details:', updateResult.error);
                console.log('[Onboarding] Update status:', updateResult.status);
                console.log('[Onboarding] Update statusText:', updateResult.statusText);

                if (updateResult.error) {
                  console.error('[Onboarding] Database update failed:', updateResult.error);
                  throw updateResult.error;
                } else {
                  console.log('[Onboarding] Database update successful');

                  // Immediately verify the update worked
                  const { data: verifyData, error: verifyError } = await supabase
                    .from('profiles')
                    .select('onboarding_completed, active_t_path_id')
                    .eq('id', userId)
                    .single();

                  console.log('[Onboarding] Verification after update:', {
                    data: verifyData,
                    error: verifyError,
                    onboarding_completed: verifyData?.onboarding_completed,
                    active_t_path_id: verifyData?.active_t_path_id
                  });
                }

                // Force update the profile in the data context cache
                console.log('[Onboarding] Forcing data context profile update...');
                try {
                  // Use the same client as above for consistency
                  const forceUpdate = await supabase
                    .from('profiles')
                    .update({ onboarding_completed: true })
                    .eq('id', userId);

                  console.log('[Onboarding] Force update result:', forceUpdate);
                  console.log('[Onboarding] Force update error:', forceUpdate.error);

                  // Verify one more time
                  const { data: finalVerify, error: verifyError } = await supabase
                    .from('profiles')
                    .select('onboarding_completed')
                    .eq('id', userId)
                    .single();

                  console.log('[Onboarding] Final verification - onboarding_completed:', finalVerify?.onboarding_completed);
                  console.log('[Onboarding] Final verification error:', verifyError);
                } catch (error) {
                  console.error('[Onboarding] Force update failed:', error);
                }
              }

              // Small delay for smooth transition
              setTimeout(async () => {
                console.log('[Onboarding] Forcing data refresh to get latest gym and t-path data...');
                
                // Force refresh the data context to pick up the new gym and t-path
                try {
                  forceRefreshProfile();
                } catch (error) {
                  console.log('[Onboarding] Data context refresh failed, continuing anyway:', error);
                }

                console.log('[Onboarding] Database update completed, navigating to index for refresh');
                setLoading(false);

                // Navigate to index - it will check onboarding status and redirect appropriately
                router.replace('/');
              }, 1000);
          }}
          profile={{
            full_name: step1Data.fullName,
            height_cm: step1Data.heightCm || undefined,
            weight_kg: step1Data.weight || undefined,
            body_fat_pct: step1Data.bodyFatPct || undefined,
            primary_goal: step3Data.goalFocus || undefined,
            preferred_muscles: step3Data.preferredMuscles || undefined,
            health_notes: step3Data.constraints || undefined,
            preferred_session_length: step3Data.sessionLength || undefined,
          }}
          mainTPath={{
            id: onboardingResult.mainTPath?.id || '',
            template_name: onboardingResult.mainTPath?.template_name || '',
          }}
          childWorkouts={onboardingResult.childWorkouts || []}
          confirmedExerciseNames={confirmedExerciseNames}
        />
      )}
      </View>
    </OnboardingErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.muted,
  },
  progressDotActive: {
    backgroundColor: Colors.success,
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.foreground,
    ...TextStyles.body,
    marginTop: Spacing.md,
  },
  progressText: {
    color: Colors.mutedForeground,
    ...TextStyles.caption,
    marginTop: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    color: Colors.foreground,
    ...TextStyles.h3,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.mutedForeground,
    ...TextStyles.body,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    ...TextStyles.button,
  },
});