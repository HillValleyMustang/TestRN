"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context-provider";
import { toast } from "sonner";
import { TablesInsert, ProfileInsert } from "@/types/supabase";

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
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false); // For final submit button
  const [isInitialSetupLoading, setIsInitialSetupLoading] = useState(false); // For transition from step 5 to 6

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
      ]
    }
  };

  const handleNext = useCallback(() => {
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    setCurrentStep(prev => prev - 1);
  }, []);

  const handleAdvanceToFinalStep = useCallback(async () => {
    if (!session) return;
    
    setIsInitialSetupLoading(true);
    
    try {
      // 1. Create both main T-Paths
      const ululTPathData: TablesInsert<'t_paths'> = {
        user_id: session.user.id,
        template_name: '4-Day Upper/Lower',
        is_bonus: false,
        parent_t_path_id: null,
        settings: {
          tPathType: 'ulul',
          experience,
          goalFocus,
          preferredMuscles,
          constraints,
          equipmentMethod
        }
      };

      const pplTPathData: TablesInsert<'t_paths'> = {
        user_id: session.user.id,
        template_name: '3-Day Push/Pull/Legs',
        is_bonus: false,
        parent_t_path_id: null,
        settings: {
          tPathType: 'ppl',
          experience,
          goalFocus,
          preferredMuscles,
          constraints,
          equipmentMethod
        }
      };

      const { data: insertedTPaths, error: insertTPathsError } = await supabase
        .from('t_paths')
        .insert([ululTPathData, pplTPathData])
        .select('id, template_name');

      if (insertTPathsError) throw insertTPathsError;

      // Determine the active T-Path ID based on user's selection
      const activeTPath = insertedTPaths.find(tp =>
        (tPathType === 'ulul' && tp.template_name === '4-Day Upper/Lower') ||
        (tPathType === 'ppl' && tp.template_name === '3-Day Push/Pull/Legs')
      );

      if (!activeTPath) {
        throw new Error("Could not find the selected T-Path after creation.");
      }

      // 2. UPSERT user profile with initial preferences (excluding name, height, weight, body_fat_pct for now)
      const profileData: ProfileInsert = {
        id: session.user.id,
        first_name: session.user.user_metadata?.first_name || '', // Use existing if available
        last_name: session.user.user_metadata?.last_name || '', // Use existing if available
        preferred_muscles: preferredMuscles,
        primary_goal: goalFocus,
        health_notes: constraints,
        default_rest_time_seconds: 60,
        preferred_session_length: sessionLength,
        active_t_path_id: activeTPath.id,
        // Other fields like full_name, height_cm, weight_kg, body_fat_pct will be updated in handleSubmit
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) throw profileError;

      // 3. Generate workouts for ALL newly created main T-Paths asynchronously
      const generationPromises = insertedTPaths.map(async (tp) => {
        const response = await fetch(`/api/generate-t-path`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ tPathId: tp.id })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to initiate T-Path workout generation for ${tp.template_name}: ${errorText}`);
        }
      });

      await Promise.all(generationPromises);

      toast.success("Initial setup complete! Please provide your personal details.");

    } catch (error: any) {
      toast.error("Failed to complete initial setup: " + error.message);
      console.error("Initial setup error:", error);
      // Re-throw to ensure loading state is handled correctly in page.tsx
      throw error; 
    } finally {
      setIsInitialSetupLoading(false);
    }
  }, [session, supabase, tPathType, experience, goalFocus, preferredMuscles, constraints, sessionLength, equipmentMethod]);

  const handleSubmit = useCallback(async (fullName: string, heightCm: number | null, weightKg: number | null, bodyFatPct: number | null) => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      const nameParts = fullName.split(' ');
      const firstName = nameParts.shift() || '';
      const lastName = nameParts.join(' ');

      // Only update the personal details here
      const updateData: ProfileInsert = {
        id: session.user.id,
        first_name: firstName,
        last_name: lastName,
        height_cm: heightCm,
        weight_kg: weightKg,
        body_fat_pct: bodyFatPct,
        updated_at: new Date().toISOString(),
      };

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id);

      if (profileUpdateError) throw profileUpdateError;

      toast.success("Onboarding completed! Welcome to your fitness journey.");
      router.push('/dashboard');
    } catch (error: any) {
      toast.error("Failed to save personal details: " + error.message);
      console.error("Personal details save error:", error);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, router]);

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
    isInitialSetupLoading, // Expose new loading state
    tPathDescriptions,
    handleNext,
    handleBack,
    handleAdvanceToFinalStep, // Expose new function
    handleSubmit,
  };
};