"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context-provider";
import { toast } from "sonner";
import { Tables, TablesInsert, ProfileInsert, FetchedExerciseDefinition } from "@/types/supabase";
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4

export const useOnboardingForm = () => {
  const router = useRouter();
  const { session, supabase } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [tPathType, setTPathType] = useState<"ulul" | "ppl" | null>(null);
  const [experience, setExperience] = useState<"beginner" | "intermediate" | null>(null);
  const [goalFocus, setGoalFocus] = useState<string>("");
  const [preferredMuscles, setPreferredMuscles] = useState<string>("");
  const [constraints, setConstraints] = useState<string>("");
  const [sessionLength, setSessionLength] = useState<string>("");
  const [equipmentMethod, setEquipmentMethod] = useState<"photo" | "skip" | null>(null);
  const [identifiedExercises, setIdentifiedExercises] = useState<Partial<FetchedExerciseDefinition>[]>([]);
  const [confirmedExercises, setConfirmedExercises] = useState<Set<string>>(new Set());
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialSetupLoading, setIsInitialSetupLoading] = useState(false);
  const [gymName, setGymName] = useState<string>("");

  const tPathDescriptions = {
    ulul: {
      title: "4-Day Upper/Lower (ULUL)",
      pros: [
        "Higher frequency per muscle group (2x/week)",
        "Good for hypertrophy",
        "Flexible scheduling"
      ],
      cons: [
        "Sessions can be longer",
        "Potential for upper body fatigue",
        "Less focus on single 'big lift' days"
      ],
      research: [
        "Studies show that training muscle groups twice a week can lead to greater muscle growth than once a week.",
        "Allows for more recovery time for individual muscle groups compared to full-body splits.",
        "Provides a balanced approach to training, hitting all major muscle groups effectively."
      ]
    },
    ppl: {
      title: "3-Day Push/Pull/Legs (PPL)",
      pros: [
        "Logical split by movement pattern",
        "Allows for high volume per session",
        "Feels intuitive"
      ],
      cons: [
        "Lower frequency per muscle group (once every 5-7 days)",
        "Missing a day can unbalance the week",
        "Can be demanding for beginners"
      ],
      research: [
        "PPL is effective for building strength and muscle mass by allowing high volume for specific movement patterns.",
        "Grouping exercises by push, pull, and legs can optimize recovery and performance for each session.",
        "This split is popular among intermediate to advanced lifters for its structured approach to progressive overload."
      ]
    }
  };

  const addIdentifiedExercise = useCallback((exercise: Partial<FetchedExerciseDefinition>) => {
    setIdentifiedExercises(prev => {
      if (prev.some(e => e.name === exercise.name)) {
        return prev;
      }
      setConfirmedExercises(prevConfirmed => new Set(prevConfirmed).add(exercise.name!));
      return [...prev, exercise];
    });
  }, []);

  const removeIdentifiedExercise = useCallback((exerciseName: string) => {
    setIdentifiedExercises(prev => prev.filter(e => e.name !== exerciseName));
    setConfirmedExercises(prevConfirmed => {
      const newSet = new Set(prevConfirmed);
      newSet.delete(exerciseName);
      return newSet;
    });
  }, []);

  const toggleConfirmedExercise = useCallback((exerciseName: string) => {
    setConfirmedExercises(prevConfirmed => {
      const newSet = new Set(prevConfirmed);
      if (newSet.has(exerciseName)) {
        newSet.delete(exerciseName);
      } else {
        newSet.add(exerciseName);
      }
      return newSet;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === 4 && equipmentMethod === 'skip') {
      setCurrentStep(6);
      return;
    }
    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, equipmentMethod]);

  const handleBack = useCallback(() => {
    if (currentStep === 6 && equipmentMethod === 'skip') {
      setCurrentStep(4);
      return;
    }
    setCurrentStep(prev => prev - 1);
  }, [currentStep, equipmentMethod]);

  const handleSubmit = useCallback(async (fullName: string, heightCm: number, weightKg: number, bodyFatPct: number | null) => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      let newGymId: string | null = null;
      if (equipmentMethod === 'photo' && gymName) {
        const { data: insertedGym, error: insertGymError } = await supabase
          .from('gyms')
          .insert({ user_id: session.user.id, name: gymName })
          .select('id')
          .single();
        if (insertGymError) throw insertGymError;
        newGymId = insertedGym.id;
      } else if (equipmentMethod === 'skip') {
        const { data: insertedGym, error: insertGymError } = await supabase
          .from('gyms')
          .insert({ user_id: session.user.id, name: "Home Gym" })
          .select('id')
          .single();
        if (insertGymError) throw insertGymError;
        newGymId = insertedGym.id;
      }

      if (!newGymId) {
        throw new Error("Failed to create gym during onboarding.");
      }

      const ululTPathData: TablesInsert<'t_paths'> = {
        user_id: session.user.id,
        template_name: '4-Day Upper/Lower',
        is_bonus: false,
        parent_t_path_id: null,
        settings: { tPathType: 'ulul', experience, goalFocus, preferredMuscles, constraints, equipmentMethod }
      };
      const pplTPathData: TablesInsert<'t_paths'> = {
        user_id: session.user.id,
        template_name: '3-Day Push/Pull/Legs',
        is_bonus: false,
        parent_t_path_id: null,
        settings: { tPathType: 'ppl', experience, goalFocus, preferredMuscles, constraints, equipmentMethod }
      };
      const { data: insertedTPaths, error: insertTPathsError } = await supabase
        .from('t_paths')
        .insert([ululTPathData, pplTPathData])
        .select('id, template_name');
      if (insertTPathsError) throw insertTPathsError;

      const activeTPath = insertedTPaths.find(tp =>
        (tPathType === 'ulul' && tp.template_name === '4-Day Upper/Lower') ||
        (tPathType === 'ppl' && tp.template_name === '3-Day Push/Pull/Legs')
      );
      if (!activeTPath) throw new Error("Could not find the selected T-Path after creation.");

      const nameParts = fullName.split(' ');
      const firstName = nameParts.shift() || '';
      const lastName = nameParts.join(' ');
      const profileData: ProfileInsert = {
        id: session.user.id,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        height_cm: heightCm,
        weight_kg: weightKg,
        body_fat_pct: bodyFatPct,
        preferred_muscles: preferredMuscles,
        primary_goal: goalFocus,
        health_notes: constraints,
        default_rest_time_seconds: 60,
        preferred_session_length: sessionLength,
        active_t_path_id: activeTPath.id,
        active_gym_id: newGymId,
      };
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });
      if (profileError) throw profileError;

      const confirmedExercisesToProcess = identifiedExercises
        .filter(ex => confirmedExercises.has(ex.name!));
      
      const exerciseIdsToLinkToGym: string[] = [];

      if (confirmedExercisesToProcess.length > 0) {
        for (const ex of confirmedExercisesToProcess) {
          if (ex.existing_id) {
            exerciseIdsToLinkToGym.push(ex.existing_id);
          } else {
            const { data: insertedExercise, error: insertExerciseError } = await supabase
              .from('exercise_definitions')
              .insert({
                name: ex.name!,
                main_muscle: ex.main_muscle!,
                type: ex.type!,
                category: ex.category,
                description: ex.description,
                pro_tip: ex.pro_tip,
                video_url: ex.video_url,
                icon_url: ex.icon_url,
                user_id: session.user.id,
                library_id: null,
                is_favorite: false,
                created_at: new Date().toISOString(),
              })
              .select('id')
              .single();
            
            if (insertExerciseError) {
              console.error("Failed to save new AI-identified exercise during onboarding:", insertExerciseError);
              toast.info("Could not save some identified exercises, but your profile is set up!");
            } else if (insertedExercise) {
              exerciseIdsToLinkToGym.push(insertedExercise.id);
            }
          }
        }

        if (exerciseIdsToLinkToGym.length > 0 && newGymId) {
          const gymExerciseLinks = exerciseIdsToLinkToGym.map(exId => ({
            gym_id: newGymId!,
            exercise_id: exId,
          }));
          const { error: insertGymExerciseError } = await supabase
            .from('gym_exercises')
            .insert(gymExerciseLinks);
          if (insertGymExerciseError) throw insertGymExerciseError;
        }
      }

      console.log("All profile and exercise data saved. Now initiating workout generation with confirmed exercises:", exerciseIdsToLinkToGym);

      const generationPromises = insertedTPaths.map(async (tp) => {
        const response = await fetch(`/api/generate-t-path`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ 
            tPathId: tp.id,
            confirmedExerciseIds: exerciseIdsToLinkToGym // Pass the confirmed IDs here
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to initiate T-Path workout generation for ${tp.template_name}: ${errorText}`);
        }
      });
      await Promise.all(generationPromises);

      router.push('/dashboard');
    } catch (error: any) {
      console.error("Onboarding failed:", error.message);
      toast.info("Onboarding failed.");
    } finally {
      setLoading(false);
    }
  }, [session, supabase, router, tPathType, experience, goalFocus, preferredMuscles, constraints, sessionLength, equipmentMethod, identifiedExercises, confirmedExercises, gymName]);

  return {
    currentStep,
    tPathType,
    setTPathType,
    experience,
    setExperience,
    goalFocus,
    setGoalFocus,
    preferredMuscles,
    setPreferredMuscles,
    constraints,
    setConstraints,
    sessionLength,
    setSessionLength,
    equipmentMethod,
    setEquipmentMethod,
    consentGiven,
    setConsentGiven,
    loading,
    isInitialSetupLoading,
    tPathDescriptions,
    handleNext,
    handleBack,
    handleSubmit,
    identifiedExercises,
    addIdentifiedExercise,
    removeIdentifiedExercise,
    confirmedExercises,
    toggleConfirmedExercise,
    gymName,
    setGymName,
  };
};