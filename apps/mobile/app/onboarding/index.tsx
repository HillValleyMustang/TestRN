import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../_contexts/auth-context";
import { supabase } from "../_lib/supabase";
import Step1PersonalInfo from "./step1-personal-info";
import Step2TrainingSetup from "./step2-training-setup";
import Step3GoalsPreferences from "./step3-goals-preferences";
import Step4GymConsent from "./step4-gym-consent";
import Step5PhotoUpload from "./step5-photo-upload";

interface Step1Data {
  fullName: string;
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weight: number | null;
  bodyFatPct: number | null;
  heightUnit: "cm" | "ft";
  weightUnit: "kg" | "lbs";
}

interface Step2Data {
  tPathType: "ppl" | "ulul" | null;
  experience: "beginner" | "intermediate" | null;
}

interface Step3Data {
  goalFocus: string;
  preferredMuscles: string;
  constraints: string;
  sessionLength: string;
}

interface Step4Data {
  gymName: string;
  equipmentMethod: "photo" | "skip" | null;
  consentGiven: boolean;
}

export default function OnboardingScreen() {
  const { session, userId } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [step1Data, setStep1Data] = useState<Step1Data>({
    fullName: "",
    heightCm: null,
    heightFt: null,
    heightIn: null,
    weight: null,
    bodyFatPct: null,
    heightUnit: "ft",
    weightUnit: "kg",
  });

  const [step2Data, setStep2Data] = useState<Step2Data>({
    tPathType: null,
    experience: null,
  });

  const [step3Data, setStep3Data] = useState<Step3Data>({
    goalFocus: "",
    preferredMuscles: "",
    constraints: "",
    sessionLength: "",
  });

  const [step4Data, setStep4Data] = useState<Step4Data>({
    gymName: "",
    equipmentMethod: null,
    consentGiven: false,
  });

  const [identifiedExercises, setIdentifiedExercises] = useState<any[]>([]);
  const [confirmedExerciseNames, setConfirmedExerciseNames] = useState<
    Set<string>
  >(new Set());

  const submitOnboarding = async () => {
    if (!session?.access_token) {
      Alert.alert("Error", "You must be logged in to complete onboarding.");
      return;
    }

    const finalHeightCm = step1Data.heightCm;
    const finalWeightKg = step1Data.weight;

    if (
      !step1Data.fullName ||
      !finalHeightCm ||
      !finalWeightKg ||
      !step2Data.tPathType ||
      !step2Data.experience ||
      !step3Data.sessionLength
    ) {
      Alert.alert(
        "Error",
        "Please complete all required fields before submitting.",
      );
      return;
    }

    setLoading(true);
    try {
      const SUPABASE_PROJECT_ID = "mgbfevrzrbjjiajkqpti";
      const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/complete-onboarding`;

      const confirmedExercises =
        step4Data.equipmentMethod === "photo"
          ? identifiedExercises.filter((ex) =>
              confirmedExerciseNames.has(ex.name),
            )
          : [];

      const payload = {
        fullName: step1Data.fullName,
        heightCm: finalHeightCm,
        weightKg: finalWeightKg,
        bodyFatPct: step1Data.bodyFatPct,
        tPathType: step2Data.tPathType,
        experience: step2Data.experience,
        goalFocus: step3Data.goalFocus,
        preferredMuscles: step3Data.preferredMuscles,
        constraints: step3Data.constraints,
        sessionLength: step3Data.sessionLength,
        gymName: step4Data.gymName,
        equipmentMethod: step4Data.equipmentMethod,
        confirmedExercises,
      };

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete onboarding");
      }

      Alert.alert("Welcome! 🎉", "Your profile has been set up successfully!", [
        {
          text: "Get Started",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error: any) {
      console.error("Onboarding error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to complete onboarding. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStep5Complete = (exercises: any[], confirmed: Set<string>) => {
    setIdentifiedExercises(exercises);
    setConfirmedExerciseNames(confirmed);
    submitOnboarding();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Setting up your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        {[1, 2, 3, 4, 5].map((step) => (
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
          onDataChange={setStep1Data}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <Step2TrainingSetup
          data={step2Data}
          onDataChange={setStep2Data}
          onNext={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {currentStep === 3 && (
        <Step3GoalsPreferences
          data={step3Data}
          onDataChange={setStep3Data}
          onNext={() => setCurrentStep(4)}
          onBack={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 4 && (
        <Step4GymConsent
          data={step4Data}
          onDataChange={setStep4Data}
          onNext={() => setCurrentStep(5)}
          onBack={() => setCurrentStep(3)}
          onSkipPhoto={submitOnboarding}
        />
      )}

      {currentStep === 5 && (
        <Step5PhotoUpload
          onNext={handleStep5Complete}
          onBack={() => setCurrentStep(4)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  progressBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#333",
  },
  progressDotActive: {
    backgroundColor: "#10B981",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
  },
});
