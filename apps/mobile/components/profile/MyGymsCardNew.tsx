/**
 * My Gyms Card - Settings Tab (Multi-Step Flow)
 * Manage user gyms with multi-step Add flow matching designs
 * Reference: profile s7, s9, s10, s11 designs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { FontFamily } from '../../constants/Typography';

import { generateUUID } from '../../lib/utils';
import { useSettingsStrings } from '../../localization/useSettingsStrings';
import { AddGymNameDialog } from './AddGymNameDialog';
import { SetupGymOptionsDialog } from './SetupGymOptionsDialog';
import { AnalyseGymPhotoDialog } from './AnalyseGymPhotoDialog';
import { CopyGymSetupDialog } from './CopyGymSetupDialog';
import { DeleteGymDialog } from './DeleteGymDialog';
import { RenameGymDialog } from './RenameGymDialog';
import { ExerciseSelectionDialog } from './ExerciseSelectionDialog';
import { TPathSetupDialog } from './TPathSetupDialog';
import { GymSetupSummaryModal } from './GymSetupSummaryModal';
import { useData } from '../../app/_contexts/data-context';

interface Gym {
  id: string;
  name: string;
  created_at: string;
}

interface MyGymsCardProps {
  userId: string;
  gyms: Gym[];
  activeGymId: string | null;
  onRefresh: () => Promise<void>;
  onManageGym: (gymId: string) => void;
  supabase: any;
  deleteGym?: (gymId: string) => Promise<void>;
}

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
  existing_id?: string | null;
}

type FlowStep = 'name' | 'setup' | 'ai-upload' | 'exercise-selection' | 'profile-setup' | 'generating-plan' | 'summary' | 'copy';

export function MyGymsCardNew({
  userId,
  gyms,
  activeGymId,
  onRefresh,
  onManageGym,
  supabase,
  deleteGym
}: MyGymsCardProps) {
  const strings = useSettingsStrings();
  const router = useRouter();
  const { addTPath, addTPathExercise, loadDashboardSnapshot } = useData();

  const [isEditing, setIsEditing] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep | null>(null);
  const [currentGymId, setCurrentGymId] = useState<string>('');
  const [currentGymName, setCurrentGymName] = useState<string>('');
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string>('');
  const [selectedGymName, setSelectedGymName] = useState<string>('');
  
  // New state for AI workout flow
  const [detectedExercises, setDetectedExercises] = useState<DetectedExercise[]>([]);
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const [confirmedExerciseNames, setConfirmedExerciseNames] = useState<Set<string>>(new Set());
  const [totalEquipmentDetected, setTotalEquipmentDetected] = useState(0);
  const [generatedTPath, setGeneratedTPath] = useState<any>(null);
  const [generatedChildWorkouts, setGeneratedChildWorkouts] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<{
    programmeType?: 'ulul' | 'ppl';
    sessionLength?: string;
  }>({});

  // Helper function to check if a gym is incomplete
  // A gym is incomplete if it has NO exercises, NO equipment, AND NO t_paths
  const isGymIncomplete = async (gymId: string): Promise<boolean> => {
    try {
            
      // Check exercises - gym_exercises table has gym_id, exercise_id (composite key), no id column
      const { data: exercises, error: exercisesError } = await supabase
        .from('gym_exercises')
        .select('exercise_id')
        .eq('gym_id', gymId)
        .limit(1);
      
      // Check equipment
      const { data: equipment, error: equipmentError } = await supabase
        .from('gym_equipment')
        .select('id')
        .eq('gym_id', gymId)
        .limit(1);
      
      // Check t_paths (workout plans)
      const { data: tPaths, error: tPathsError } = await supabase
        .from('t_paths')
        .select('id')
        .eq('gym_id', gymId)
        .limit(1);
      
      // Handle null/undefined data - treat as empty array
      const hasExercises = (exercises && Array.isArray(exercises) && exercises.length > 0) || false;
      const hasEquipment = (equipment && Array.isArray(equipment) && equipment.length > 0) || false;
      const hasTPaths = (tPaths && Array.isArray(tPaths) && tPaths.length > 0) || false;
      
      // Log errors if any (but don't fail the check)
      if (exercisesError) {
        console.warn('[MyGymsCard] Error checking exercises:', exercisesError);
      }
      if (equipmentError) {
        console.warn('[MyGymsCard] Error checking equipment:', equipmentError);
      }
      if (tPathsError) {
        console.warn('[MyGymsCard] Error checking t_paths:', tPathsError);
      }
      
      // Incomplete if ALL three checks fail
      const isIncomplete = !hasExercises && !hasEquipment && !hasTPaths;
      
            
      console.log('[MyGymsCard] Gym completeness check:', {
        gymId,
        hasExercises,
        hasEquipment,
        hasTPaths,
        isIncomplete,
        exercisesData: exercises,
        equipmentData: equipment,
        tPathsData: tPaths,
      });
      
      return isIncomplete;
    } catch (error) {
      console.error('[MyGymsCard] Error checking gym completeness:', error);
      // On error, assume gym is complete to avoid accidental deletion
      return false;
    }
  };

  // Comprehensive cleanup function to delete incomplete gym
  // Handles active gym switching before deletion
  const cleanupIncompleteGym = async (gymId: string | null, forceCleanup = false) => {
    if (!gymId) return;
    
    // Only skip if setup is completed and this is not a forced cleanup
    // (forceCleanup is used when checking old incomplete gyms on mount)
    if (!forceCleanup && setupCompleted) return;

    // Double-check that gym is actually incomplete before deleting
    const isIncomplete = await isGymIncomplete(gymId);
    if (!isIncomplete) {
      console.log('[MyGymsCard] Gym is not incomplete, skipping cleanup:', gymId);
      return;
    }

    console.log('[MyGymsCard] Cleaning up incomplete gym:', gymId);
    
    try {
      // If this is the active gym, switch to another gym first
      if (gymId === activeGymId) {
        console.log('[MyGymsCard] Incomplete gym is active, switching active gym before deletion');
        
        // Find another gym to switch to
        const otherGyms = gyms.filter(g => g.id !== gymId);
        if (otherGyms.length > 0) {
          // Try to find a complete gym first
          let newActiveGym = otherGyms.find(g => {
            // Quick check - prefer gyms that we know exist
            return true; // Will validate properly below
          });
          
          // If no preference, use the first available gym
          if (!newActiveGym) {
            newActiveGym = otherGyms[0];
          }
          
          // Switch active gym
          if (newActiveGym) {
            await supabase
              .from('profiles')
              .update({ active_gym_id: newActiveGym.id })
              .eq('id', userId);
            console.log('[MyGymsCard] Switched active gym to:', newActiveGym.id);
          }
        } else {
          // This is the last gym - don't delete it
          console.log('[MyGymsCard] Cannot delete incomplete gym - it is the last remaining gym');
          return;
        }
      }
      
      // Delete gym_exercises first (foreign key constraint)
      await supabase.from('gym_exercises').delete().eq('gym_id', gymId);
      
      // Delete gym_equipment
      await supabase.from('gym_equipment').delete().eq('gym_id', gymId);
      
      // Delete t_paths associated with this gym (if any)
      await supabase.from('t_paths').delete().eq('gym_id', gymId);
      
      // Delete the gym
      await supabase.from('gyms').delete().eq('id', gymId);
      
      console.log('[MyGymsCard] Incomplete gym deleted successfully:', gymId);
      await onRefresh();
    } catch (error) {
      console.error('[MyGymsCard] Error cleaning up incomplete gym:', error);
    }
  };

  // Reusable function to clean up incomplete gyms (used on mount and before adding new gym)
  const cleanupIncompleteGyms = async (): Promise<number> => {
    try {
            console.log('[MyGymsCard] Starting cleanup of incomplete gyms');
      
      // Find all gyms for this user
      const { data: allGyms } = await supabase
        .from('gyms')
        .select('id, created_at, name')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!allGyms || allGyms.length === 0) {
        console.log('[MyGymsCard] No gyms found, skipping cleanup');
        return 0;
      }

            console.log('[MyGymsCard] Found', allGyms.length, 'gym(s) to check');

      // Track which gyms are incomplete
      const incompleteGyms: Array<{ id: string; created_at: string }> = [];
      const completeGyms: Array<{ id: string; created_at: string }> = [];

      // Check each gym for completeness
      for (const gym of allGyms) {
        const isIncomplete = await isGymIncomplete(gym.id);
        if (isIncomplete) {
          incompleteGyms.push(gym);
        } else {
          completeGyms.push(gym);
        }
      }

      // If no incomplete gyms, nothing to do
      if (incompleteGyms.length === 0) {
        console.log('[MyGymsCard] No incomplete gyms found');
        return 0;
      }

      // Always preserve at least one gym - never delete if it's the last one
      if (allGyms.length === 1 && incompleteGyms.length === 1) {
        console.log('[MyGymsCard] Only one gym exists and it is incomplete - preserving it');
        return 0;
      }

      // If active gym is incomplete, switch to another gym first
      if (activeGymId && incompleteGyms.some(g => g.id === activeGymId)) {
        console.log('[MyGymsCard] Active gym is incomplete, switching active gym before cleanup');
        
        // Prefer switching to a complete gym
        let newActiveGym = completeGyms.length > 0 
          ? completeGyms[0] 
          : incompleteGyms.find(g => g.id !== activeGymId);
        
        // If all gyms are incomplete, keep the oldest (first in sorted list)
        if (!newActiveGym && incompleteGyms.length > 1) {
          newActiveGym = incompleteGyms[0]; // Oldest incomplete gym
        }
        
        if (newActiveGym) {
          await supabase
            .from('profiles')
            .update({ active_gym_id: newActiveGym.id })
            .eq('id', userId);
          console.log('[MyGymsCard] Switched active gym from', activeGymId, 'to', newActiveGym.id);
        }
      }

      // Determine which incomplete gyms to delete
      let gymsToDelete: string[] = [];
      
            
      if (incompleteGyms.length === allGyms.length) {
        // All gyms are incomplete - preserve oldest, delete the rest
        const oldestGym = incompleteGyms[0];
        gymsToDelete = incompleteGyms
          .filter(g => g.id !== oldestGym.id)
          .map(g => g.id);
        console.log('[MyGymsCard] All gyms incomplete - preserving oldest:', oldestGym.id);
      } else {
        // Some gyms are complete - delete all incomplete gyms
        // BUT: Don't delete:
        // 1. The gym currently being set up (currentGymId)
        // 2. The active gym (activeGymId) - preserve user's current gym
        // 3. Always preserve at least TWO gyms if one is being set up (to prevent toggle from disappearing)
        // 4. Always preserve at least one gym total
        const gymsToFilter = incompleteGyms.filter(g => 
          g.id !== currentGymId && // Never delete the gym being set up
          g.id !== activeGymId     // Never delete the active gym
        );
        
        // Calculate how many gyms would remain after deletion
        const gymsRemainingAfterDelete = completeGyms.length + incompleteGyms.length - gymsToFilter.length;
        
        // If we're setting up a new gym (currentGymId exists), preserve at least 2 gyms total
        // This prevents the gym toggle from disappearing during setup
        const minGymsToPreserve = currentGymId ? 2 : 1;
        
        if (gymsRemainingAfterDelete < minGymsToPreserve && incompleteGyms.length > 0) {
          // Don't delete any if it would leave fewer than minimum gyms
          gymsToDelete = [];
          console.log(`[MyGymsCard] Cannot delete incomplete gyms - would leave ${gymsRemainingAfterDelete} gym(s), need at least ${minGymsToPreserve}. Preserving incomplete gym(s).`);
        } else {
          gymsToDelete = gymsToFilter.map(g => g.id);
        }
        
              }

      // Delete incomplete gyms
      if (gymsToDelete.length > 0) {
                for (const gymId of gymsToDelete) {
          console.log('[MyGymsCard] Deleting incomplete gym:', gymId);
          await cleanupIncompleteGym(gymId, true); // forceCleanup = true
        }
                console.log('[MyGymsCard] Cleanup completed - deleted', gymsToDelete.length, 'incomplete gym(s)');
        return gymsToDelete.length;
      }

      return 0;
    } catch (error) {
      console.error('[MyGymsCard] Error cleaning up incomplete gyms:', error);
      return 0;
    }
  };

  // Clean up incomplete gyms on mount (in case user closed app mid-flow)
  // Clean up ALL incomplete gyms regardless of age, but always preserve at least one
  // A gym is incomplete if it has NO exercises, NO equipment, AND NO t_paths
  useEffect(() => {
    console.log('[MyGymsCard] Mount cleanup - checking for incomplete gyms');
    cleanupIncompleteGyms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only run on mount and when userId changes

  // Clean up on unmount if setup not completed
  useEffect(() => {
    return () => {
      if (currentGymId && !setupCompleted) {
        // Note: Async cleanup in useEffect return is not supported,
        // but this ensures we track the state. Actual cleanup happens
        // in the onClose handlers below.
        console.log('[MyGymsCard] Component unmounting with incomplete gym:', currentGymId);
      }
    };
  }, [currentGymId, setupCompleted]);

  const handleStartAddGym = () => {
    // Set flow step immediately to show dialog - don't wait for any async operations
    // This ensures the dialog appears immediately when user clicks "Add New Gym"
    console.log('[MyGymsCard] Starting add gym flow');
    setFlowStep('name');
    
    // Clean up incomplete gyms in background (non-blocking, fire-and-forget)
    // This handles old incomplete gyms that weren't cleaned on mount
    // and ensures we have space for new gym if user is at 3-gym limit
    // Don't await this - let it run in background
    console.log('[MyGymsCard] Starting background cleanup of incomplete gyms');
    cleanupIncompleteGyms()
      .then((deletedCount) => {
        if (deletedCount > 0) {
          console.log('[MyGymsCard] Cleaned up', deletedCount, 'incomplete gym(s), refreshing list');
          // Only refresh if we actually deleted something
          onRefresh().catch((error) => {
            console.error('[MyGymsCard] Error refreshing after cleanup:', error);
          });
        } else {
          console.log('[MyGymsCard] No incomplete gyms to clean up');
        }
      })
      .catch((error) => {
        console.error('[MyGymsCard] Error during background cleanup:', error);
        // Don't block user flow even if cleanup fails
      });
  };

  // Create gym when entering setup step
  const handleNameComplete = async (gymName: string) => {
    try {
      // Create gym only when entering setup step
      const { data: newGym, error } = await supabase
        .from('gyms')
        .insert({
          name: gymName,
          user_id: userId,
        })
        .select('*')
        .single();

      if (error) throw error;

      setCurrentGymId(newGym.id);
      setCurrentGymName(newGym.name);
      setSetupCompleted(false);
      
      // Transition to next step immediately for better UX
      setFlowStep('setup');

      // Refresh gyms in background so the gyms prop is updated
      // We don't await this here to prevent the flow from closing if refresh fails
      // or takes too long. The 'setup' dialog is already showing.
      onRefresh().catch(refreshError => {
        console.warn('[MyGymsCard] background refresh failed:', refreshError);
      });
    } catch (error) {
      console.error('[MyGymsCard] Error creating gym:', error);
      Alert.alert('Error', 'Failed to create gym. Please try again.');
      setFlowStep(null);
    }
  };

  const handleSetupOption = async (option: 'ai' | 'copy' | 'defaults' | 'empty') => {
    switch (option) {
      case 'ai':
        setFlowStep('ai-upload');
        break;
      case 'copy':
        setFlowStep('copy');
        break;
      case 'defaults':
        await setupWithDefaults();
        break;
      case 'empty':
        await finishSetup();
        break;
    }
  };

  const setupWithDefaults = async () => {
    try {
      // Seed default equipment
      const defaultEquipment = [
        { gym_id: currentGymId, equipment_type: 'Dumbbells', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Barbells', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Flat Bench', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Squat Rack', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Pull-up Bar', quantity: 1 },
        { gym_id: currentGymId, equipment_type: 'Cable Machine', quantity: 1 },
      ];

      await supabase.from('gym_equipment').insert(defaultEquipment);

      // Get common exercises
      const { data: commonExercises } = await supabase
        .from('exercises')
        .select('id')
        .eq('is_common', true)
        .limit(50);

      if (commonExercises) {
        const gymExercises = commonExercises.map((ex: { id: string }) => ({
          gym_id: currentGymId,
          exercise_id: ex.id,
        }));
        await supabase.from('gym_exercises').insert(gymExercises);
      }

      await finishSetup();
    } catch (error) {
      console.error('[MyGymsCard] Error setting up defaults:', error);
      Alert.alert('Error', 'Failed to set up default equipment');
      // Clean up incomplete gym on error
      await cleanupIncompleteGym(currentGymId);
      setFlowStep(null);
      setCurrentGymId('');
      setCurrentGymName('');
      setSetupCompleted(false);
    }
  };

  const finishSetup = async () => {
    setSetupCompleted(true);
    setFlowStep(null);
    
    // Clear AI flow state
    const clearedGymId = currentGymId;
    const clearedGymName = currentGymName;
    
    setCurrentGymId('');
    setCurrentGymName('');
    setDetectedExercises([]);
    setBase64Images([]);
    setConfirmedExerciseNames(new Set());
    setTotalEquipmentDetected(0);
    setGeneratedTPath(null);
    setGeneratedChildWorkouts([]);
    setProfileData({});
    
    await onRefresh();
  };

  // Handler when exercises are generated from equipment
  const handleExercisesGenerated = (exercises: DetectedExercise[], images: string[]) => {
    console.log('[MyGymsCard] Exercises generated:', exercises.length);
    setDetectedExercises(exercises);
    setBase64Images(images);
    
    // Count equipment from exercises (estimate based on exercise count)
    setTotalEquipmentDetected(Math.ceil(exercises.length / 2));
    
    // Move to exercise selection step
    setFlowStep('exercise-selection');
  };

  // Handler when exercises are confirmed
  const handleExercisesConfirmed = async (confirmed: DetectedExercise[], confirmedNames: Set<string>) => {
    console.log('[MyGymsCard] Exercises confirmed:', confirmed.length);
    setConfirmedExerciseNames(confirmedNames);

    // Show loading state
    setFlowStep('generating-plan');

    try {
      // Step 1: Link exercises to gym
      await linkExercisesToGym(confirmed);

      // Step 2: Check profile data and prompt if missing
      const missingFields = await checkProfileData();
      
      if (Object.keys(missingFields).length > 0) {
        // Show profile setup dialog
        setFlowStep('profile-setup');
      } else {
        // Profile data complete, generate t-path
        await generateTPathForGym();
      }
    } catch (error) {
      console.error('[MyGymsCard] Error in exercise confirmation flow:', error);
      Alert.alert('Error', 'Failed to set up your gym. Please try again.');
      // Clean up incomplete gym on error
      await cleanupIncompleteGym(currentGymId);
      setFlowStep(null);
      setCurrentGymId('');
      setCurrentGymName('');
      setSetupCompleted(false);
    }
  };

  // Link confirmed exercises to gym
  const linkExercisesToGym = async (confirmedExercises: DetectedExercise[]) => {
    console.log('[MyGymsCard] Linking exercises to gym:', currentGymId);
    
    // Filter only new exercises (not duplicates)
    const newExercises = confirmedExercises.filter(ex => ex.duplicate_status === 'none');
    
    // Insert new exercises into exercise_definitions
    for (const exercise of newExercises) {
      const exerciseId = generateUUID(); // Generate React Native-compatible UUID
      
      try {
        const { error: insertError } = await supabase
          .from('exercise_definitions')
          .insert({
            id: exerciseId,
            name: exercise.name,
            main_muscle: exercise.main_muscle,
            type: exercise.type,
            category: exercise.category,
            movement_type: exercise.movement_type,
            movement_pattern: exercise.movement_pattern,
            description: exercise.description,
            pro_tip: exercise.pro_tip,
            video_url: exercise.video_url || null,
            user_id: userId,
            library_id: null,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[MyGymsCard] Error inserting exercise:', insertError);
          continue;
        }

        // Link exercise to gym
        const { error: linkError } = await supabase
          .from('gym_exercises')
          .insert({
            gym_id: currentGymId,
            exercise_id: exerciseId,
            created_at: new Date().toISOString(),
          });

        if (linkError) {
          console.error('[MyGymsCard] Error linking exercise to gym:', linkError);
        }
      } catch (error) {
        console.error('[MyGymsCard] Error processing exercise:', error);
      }
    }

    // Link existing exercises (duplicates) to gym
    const existingExercises = confirmedExercises.filter(ex => ex.duplicate_status !== 'none' && ex.existing_id);
    
    for (const exercise of existingExercises) {
      if (!exercise.existing_id) continue;
      
      try {
        const { error: linkError } = await supabase
          .from('gym_exercises')
          .insert({
            gym_id: currentGymId,
            exercise_id: exercise.existing_id,
            created_at: new Date().toISOString(),
          });

        if (linkError) {
          // Ignore duplicate link errors
          if (!linkError.message?.includes('duplicate') && linkError.code !== '23505') {
            console.error('[MyGymsCard] Error linking existing exercise to gym:', linkError);
          }
        }
      } catch (error) {
        console.error('[MyGymsCard] Error processing existing exercise:', error);
      }
    }

    console.log('[MyGymsCard] Exercise linking complete');
  };

  // Check if profile has required data for t-path generation
  const checkProfileData = async (): Promise<{ programmeType?: boolean; sessionLength?: boolean }> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('programme_type, preferred_session_length')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const missingFields: { programmeType?: boolean; sessionLength?: boolean } = {};
      
      if (!profile?.programme_type) {
        missingFields.programmeType = true;
      }
      
      if (!profile?.preferred_session_length) {
        missingFields.sessionLength = true;
      }

      // Store existing profile data
      if (profile?.programme_type) {
        setProfileData(prev => ({ ...prev, programmeType: profile.programme_type as 'ulul' | 'ppl' }));
      }
      if (profile?.preferred_session_length) {
        setProfileData(prev => ({ ...prev, sessionLength: profile.preferred_session_length as string }));
      }

      return missingFields;
    } catch (error) {
      console.error('[MyGymsCard] Error checking profile data:', error);
      // Assume missing if error
      return { programmeType: true, sessionLength: true };
    }
  };

  // Handler when profile setup is complete
  const handleProfileSetupComplete = async (data: { programmeType?: 'ulul' | 'ppl'; sessionLength?: string }) => {
    console.log('[MyGymsCard] Profile setup complete:', data);
    
    // Update profile data state
    setProfileData(prev => ({ ...prev, ...data }));

    // Update profile in database
    const updates: any = {};
    if (data.programmeType) updates.programme_type = data.programmeType;
    if (data.sessionLength) updates.preferred_session_length = data.sessionLength;

    if (Object.keys(updates).length > 0) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (error) {
          console.error('[MyGymsCard] Error updating profile:', error);
          throw error;
        }
      } catch (error) {
        console.error('[MyGymsCard] Failed to update profile:', error);
        Alert.alert('Error', 'Failed to save your preferences. Please try again.');
        // Clean up incomplete gym on error
        await cleanupIncompleteGym(currentGymId);
        setFlowStep(null);
        setCurrentGymId('');
        setCurrentGymName('');
        setSetupCompleted(false);
        return;
      }
    }

    // Generate t-path
    await generateTPathForGym();
  };

  // Generate t-path for the gym
  const generateTPathForGym = async () => {
    console.log('[MyGymsCard] Generating t-path for gym:', currentGymId);
    setFlowStep('generating-plan');

    try {
      // Fetch profile data directly to ensure we have the latest values
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('programme_type, preferred_session_length')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile?.programme_type) {
        throw new Error('Programme type is required. Please set your programme type in your profile.');
      }

      const programmeType = profile.programme_type as 'ulul' | 'ppl';
      const sessionLength = profile.preferred_session_length || profileData.sessionLength || '45-60';

      console.log('[MyGymsCard] Calling setup-gym-with-ai with:', {
        gymId: currentGymId,
        programmeType,
        sessionLength,
      });

      // Call setup-gym-with-ai edge function
      // This will get/create the single main T-path and generate gym-specific child workouts
      const response = await fetch(
        `https://mgbfevrzrbjjiajkqpti.supabase.co/functions/v1/setup-gym-with-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            gymId: currentGymId,
            programmeType,
            sessionLength,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate workout plan');
      }

      const result = await response.json();
      const mainTPathId = result.mainTPath?.id;

      if (!mainTPathId) {
        throw new Error('Failed to retrieve main T-path ID from response');
      }

      console.log('[MyGymsCard] Setup complete, main T-path ID:', mainTPathId);

      // Fetch the generated t-path and child workouts
      const { data: mainTPath } = await supabase
        .from('t_paths')
        .select('*')
        .eq('id', mainTPathId)
        .single();

      const { data: childWorkouts } = await supabase
        .from('t_paths')
        .select('*, exercises:t_path_exercises(exercise_id, is_bonus_exercise, exercise:exercise_definitions(*))')
        .eq('parent_t_path_id', mainTPathId)
        .eq('gym_id', currentGymId);

      // Transform child workouts to match expected format
      const transformedChildWorkouts = (childWorkouts || []).map((workout: any) => ({
        id: workout.id,
        template_name: workout.template_name,
        exercises: (workout.exercises || []).map((ex: any) => ({
          ...ex.exercise,
          is_bonus_exercise: ex.is_bonus_exercise,
        })),
      }));

      setGeneratedTPath(mainTPath);
      setGeneratedChildWorkouts(transformedChildWorkouts);

      // CRITICAL: Sync T-paths and exercises to local database so Workout screen can find them
      console.log('[MyGymsCard] Syncing T-paths to local database...');
      try {
        // Sync main T-path
        if (mainTPath) {
          const mainTPathRecord = {
            id: mainTPath.id,
            user_id: userId,
            template_name: mainTPath.template_name,
            description: mainTPath.description || null,
            is_main_program: !mainTPath.parent_t_path_id,
            parent_t_path_id: mainTPath.parent_t_path_id || null,
            order_index: mainTPath.order_index || null,
            is_ai_generated: mainTPath.is_ai_generated || false,
            ai_generation_params: mainTPath.ai_generation_params ? JSON.stringify(mainTPath.ai_generation_params) : null,
            is_bonus: mainTPath.is_bonus || false,
            created_at: mainTPath.created_at,
            updated_at: mainTPath.updated_at || mainTPath.created_at,
            gym_id: mainTPath.gym_id || null, // Main T-paths should have gym_id = null
            settings: mainTPath.settings ? JSON.stringify(mainTPath.settings) : null,
            progression_settings: mainTPath.progression_settings ? JSON.stringify(mainTPath.progression_settings) : null,
            version: mainTPath.version || 1,
          };
          await addTPath(mainTPathRecord as any);
          console.log('[MyGymsCard] Synced main T-path to local database:', mainTPath.id);
        }

        // Sync child workouts and their exercises
        if (childWorkouts && childWorkouts.length > 0) {
          for (const child of childWorkouts) {
            const childRecord = {
              id: child.id,
              user_id: userId,
              template_name: child.template_name,
              description: child.description || null,
              is_main_program: false,
              parent_t_path_id: child.parent_t_path_id || mainTPathId,
              order_index: child.order_index || null,
              is_ai_generated: child.is_ai_generated || false,
              ai_generation_params: child.ai_generation_params ? JSON.stringify(child.ai_generation_params) : null,
              is_bonus: child.is_bonus || false,
              created_at: child.created_at,
              updated_at: child.updated_at || child.created_at,
              gym_id: child.gym_id || currentGymId,
              settings: child.settings ? JSON.stringify(child.settings) : null,
              progression_settings: child.progression_settings ? JSON.stringify(child.progression_settings) : null,
              version: child.version || 1,
            };
            await addTPath(childRecord as any);
            console.log('[MyGymsCard] Synced child workout to local database:', child.id, child.template_name);

            // Fetch and sync exercises for this workout from Supabase
            const { data: workoutExercises, error: exercisesError } = await supabase
              .from('t_path_exercises')
              .select('id, template_id, exercise_id, order_index, is_bonus_exercise, created_at')
              .eq('template_id', child.id)
              .order('order_index', { ascending: true });

            if (!exercisesError && workoutExercises && workoutExercises.length > 0) {
              for (const ex of workoutExercises) {
                const tPathExercise = {
                  id: ex.id || `${child.id}-${ex.exercise_id}-${ex.order_index}`,
                  template_id: ex.template_id || child.id,
                  t_path_id: ex.template_id || child.id,
                  exercise_id: ex.exercise_id,
                  order_index: ex.order_index !== undefined ? ex.order_index : 0,
                  is_bonus_exercise: ex.is_bonus_exercise || false,
                  created_at: ex.created_at || new Date().toISOString(),
                };
                try {
                  await addTPathExercise(tPathExercise as any);
                  console.log('[MyGymsCard] Synced exercise to local database:', ex.exercise_id, 'for workout', child.template_name);
                } catch (exError: any) {
                  // Ignore duplicate errors
                  if (!exError?.message?.includes('UNIQUE constraint') && !exError?.message?.includes('duplicate')) {
                    console.warn('[MyGymsCard] Error syncing exercise:', exError);
                  }
                }
              }
            }
          }
        }

        console.log('[MyGymsCard] T-path sync to local database completed');
      } catch (syncError) {
        console.error('[MyGymsCard] Error syncing T-paths to local database:', syncError);
        // Don't fail the flow if sync fails - try to force dashboard refresh instead
        try {
          await loadDashboardSnapshot();
        } catch (refreshError) {
          console.error('[MyGymsCard] Error forcing dashboard refresh:', refreshError);
        }
      }

      // Show summary modal
      setFlowStep('summary');
    } catch (error) {
      console.error('[MyGymsCard] Error generating t-path:', error);
      Alert.alert(
        'Error',
        'Failed to generate your workout plan. You can set it up later in T-Path Management.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: async () => {
              // Clean up incomplete gym if user cancels after error
              await cleanupIncompleteGym(currentGymId);
              setFlowStep(null);
              setCurrentGymId('');
              setCurrentGymName('');
              setSetupCompleted(false);
            }
          },
          { 
            text: 'OK', 
            onPress: () => finishSetup() 
          }
        ]
      );
    }
  };

  const handleDeleteGym = async () => {
    if (!selectedGymId) return;
    
    // If deleting active gym, switch to another gym first
    if (selectedGymId === activeGymId && gyms.length > 1) {
      const newActiveGym = gyms.find(g => g.id !== selectedGymId);
      if (newActiveGym) {
        await supabase
          .from('profiles')
          .update({ active_gym_id: newActiveGym.id })
          .eq('id', userId);
      }
    }
    
    // Delete from local database if deleteGym function is provided
    if (deleteGym) {
      try {
        await deleteGym(selectedGymId);
        console.log('[MyGymsCardNew] Deleted gym from local database:', selectedGymId);
      } catch (error) {
        console.error('[MyGymsCardNew] Error deleting gym from local database:', error);
        // Continue even if local deletion fails - Supabase deletion already succeeded
      }
    }
    
    await onRefresh();
    setSelectedGymId('');
    setSelectedGymName('');
  };

  const handleRenameGym = async () => {
    await onRefresh();
    setSelectedGymId('');
    setSelectedGymName('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${strings.my_gyms.added_meta_prefix}${formattedDate}`;
  };

  return (
    <>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="business" size={20} color={Colors.foreground} />
            <Text style={styles.title}>{strings.my_gyms.title}</Text>
          </View>
          {isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Ionicons name="create-outline" size={18} color={Colors.foreground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Gym List */}
        {gyms.map((gym) => (
          <View key={gym.id} style={styles.gymRow}>
            <View style={styles.gymInfo}>
              <Text style={styles.gymName}>{gym.name}</Text>
              <Text style={styles.gymMeta}>{formatDate(gym.created_at)}</Text>
            </View>
            {isEditing ? (
              <View style={styles.gymActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedGymId(gym.id);
                    setSelectedGymName(gym.name);
                    setShowRenameDialog(true);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color={Colors.gray600} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedGymId(gym.id);
                    setSelectedGymName(gym.name);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.red500} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.manageButton}
                onPress={() => onManageGym(gym.id)}
              >
                <Ionicons name="chevron-forward" size={20} color={Colors.gray600} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add Gym Button */}
        {isEditing && gyms.length < 3 && (
          <TouchableOpacity style={styles.addButton} onPress={handleStartAddGym}>
            <Ionicons name="add-circle" size={20} color={Colors.gray900} />
            <Text style={styles.addButtonText}>Add New Gym</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Multi-Step Dialogs */}
      <AddGymNameDialog
        visible={flowStep === 'name'}
        onClose={() => setFlowStep(null)}
        onContinue={handleNameComplete}
        existingGymCount={gyms.length}
      />

      <SetupGymOptionsDialog
        visible={flowStep === 'setup'}
        gymName={currentGymName}
        onClose={async () => {
          // Clean up incomplete gym when setup dialog is closed
          await cleanupIncompleteGym(currentGymId);
          setFlowStep(null);
          setCurrentGymId('');
          setCurrentGymName('');
          setSetupCompleted(false);
        }}
        onSelectOption={handleSetupOption}
      />

      <AnalyseGymPhotoDialog
        visible={flowStep === 'ai-upload'}
        gymId={currentGymId}
        gymName={currentGymName}
        onBack={() => setFlowStep('setup')}
        onFinish={finishSetup}
        onExercisesGenerated={handleExercisesGenerated}
      />

      <ExerciseSelectionDialog
        visible={flowStep === 'exercise-selection'}
        gymName={currentGymName}
        exercises={detectedExercises}
        onConfirm={handleExercisesConfirmed}
        // No onBack - prevent navigation back during critical flow
      />

      <TPathSetupDialog
        visible={flowStep === 'profile-setup'}
        gymName={currentGymName}
        missingFields={{
          programmeType: !profileData.programmeType,
          sessionLength: !profileData.sessionLength,
        }}
        onBack={() => {}} // Prevent back navigation during critical flow
        onComplete={handleProfileSetupComplete}
      />

      {/* Generating Plan Loading State */}
      {flowStep === 'generating-plan' && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.success} />
              <Text style={styles.loadingText}>Generating your workout plan...</Text>
              <Text style={styles.loadingSubtext}>This may take a moment</Text>
            </View>
          </View>
        </Modal>
      )}

      {generatedTPath && (
        <GymSetupSummaryModal
          visible={flowStep === 'summary'}
          onClose={() => {
            finishSetup();
            // Navigate to dashboard
            router.push('/(tabs)/dashboard');
          }}
          gymName={currentGymName}
          mainTPath={generatedTPath}
          childWorkouts={generatedChildWorkouts}
          confirmedExerciseNames={confirmedExerciseNames}
          totalEquipmentDetected={totalEquipmentDetected}
        />
      )}

      <CopyGymSetupDialog
        visible={flowStep === 'copy'}
        gymId={currentGymId}
        gymName={currentGymName}
        sourceGyms={gyms.filter(g => g.id !== currentGymId)}
        onBack={() => setFlowStep('setup')}
        onFinish={finishSetup}
      />

      <DeleteGymDialog
        visible={showDeleteDialog}
        gymId={selectedGymId}
        gymName={selectedGymName}
        isActiveGym={selectedGymId === activeGymId}
        isLastGym={gyms.length === 1}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedGymId('');
          setSelectedGymName('');
        }}
        onDelete={handleDeleteGym}
        supabase={supabase}
      />

      <RenameGymDialog
        visible={showRenameDialog}
        gymId={selectedGymId}
        currentName={selectedGymName}
        onClose={() => {
          setShowRenameDialog(false);
          setSelectedGymId('');
          setSelectedGymName('');
        }}
        onRename={handleRenameGym}
        supabase={supabase}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.gray900,
    fontFamily: 'Poppins_600SemiBold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
  },
  doneButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.blue600,
  },
  gymRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
  },
  gymMeta: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  gymActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  manageButton: {
    padding: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
    fontFamily: 'Poppins_600SemiBold',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: Colors.card,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    minWidth: 250,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
    marginTop: Spacing.md,
  },
  loadingSubtext: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
