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
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = useCallback(async () => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      // Define both T-Path types to be inserted
      const ululTPathData: TablesInsert<'t_paths'> = {
        user_id: session.user.id,
        template_name: '4-Day Upper/Lower',
        is_bonus: false,
        parent_t_path_id: null,
        settings: {
          tPathType: 'ulul', // Store the type in settings for later retrieval
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
          tPathType: 'ppl', // Store the type in settings for later retrieval
          experience,
          goalFocus,
          preferredMuscles,
          constraints,
          equipmentMethod
        }
      };

      // Insert both T-Paths
      const { data: insertedTPaths, error: insertTPathsError } = await supabase
        .from('t_paths')
        .insert([ululTPathData, pplTPathData])
        .select('id, template_name'); // Select ID and template_name to find the active one

      if (insertTPathsError) throw insertTPathsError;

      // Determine the active T-Path ID based on user's selection
      const activeTPath = insertedTPaths.find(tp =>
        (tPathType === 'ulul' && tp.template_name === '4-Day Upper/Lower') ||
        (tPathType === 'ppl' && tp.template_name === '3-Day Push/Pull/Legs')
      );

      if (!activeTPath) {
        throw new Error("Could not find the selected T-Path after creation.");
      }

      // Save user profile data, including preferred_session_length and active_t_path_id
      const profileData: ProfileInsert = { // Use ProfileInsert type
        id: session.user.id,
        first_name: session.user.user_metadata?.first_name || '',
        last_name: session.user.user_metadata?.last_name || '',
        preferred_muscles: preferredMuscles,
        primary_goal: goalFocus,
        health_notes: constraints,
        default_rest_time_seconds: 60, // Default to 60s as per requirements
        body_fat_pct: null, // Will be updated when user adds this data
        preferred_session_length: sessionLength, // Store session length in profile
        active_t_path_id: activeTPath.id, // Set the initially selected T-Path as active
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) throw profileError;

      // Generate workouts for ALL newly created main T-Paths
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

      // Updated success message to reflect asynchronous generation
      toast.success("Onboarding completed! Your workout plan is being generated in the background.");
      router.push('/dashboard');
    } catch (error: any) {
      toast.error("Failed to complete onboarding: " + error.message);
      console.error("Onboarding error:", error);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, tPathType, experience, goalFocus, preferredMuscles, constraints, sessionLength, equipmentMethod, consentGiven, router]);

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
    tPathDescriptions,
    handleNext,
    handleBack,
    handleSubmit,
  };
};