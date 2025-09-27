import { z } from 'zod';

// Zod Schema for Onboarding Step 1
export const onboardingStep1Schema = z.object({
  fullName: z.string().min(1, "Your name is required."),
  heightCm: z.number().int().positive().min(100, "Height must be at least 100 cm.").max(250, "Height must be at most 250 cm."),
  weight: z.number().int().positive().min(30, "Weight must be at least 30 kg.").max(200, "Weight must be at most 200 kg."),
  bodyFatPct: z.number().int().min(5, "Body fat % must be at least 5%.").max(50, "Body fat % must be at most 50%.").nullable(),
  heightUnit: z.enum(['cm', 'ft']),
  weightUnit: z.enum(['kg', 'lbs'])
});

export type FormData = z.infer<typeof onboardingStep1Schema>;