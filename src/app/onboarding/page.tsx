"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { TablesInsert } from "@/types/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const { session, supabase } = useSession();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [tPathType, setTPathType] = useState<"ulul" | "ppl" | null>(null);
  const [experience, setExperience] = useState<"beginner" | "intermediate" | null>(null);
  const [goalFocus, setGoalFocus] = useState<string>("");
  const [preferredMuscles, setPreferredMuscles] = useState<string>("");
  const [constraints, setConstraints] = useState<string>("");
  const [sessionLength, setSessionLength] = useState<string>("");
  const [equipmentMethod, setEquipmentMethod] = useState<"photo" | "skip" | null>(null); // Removed 'manual' from type
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

  const handleTPathSelect = (type: "ulul" | "ppl") => {
    setTPathType(type);
    setCurrentStep(2);
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
      setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      // Save user profile data
      const profileData: TablesInsert<'profiles'> = {
        id: session.user.id,
        first_name: session.user.user_metadata?.first_name || '',
        last_name: session.user.user_metadata?.last_name || '',
        preferred_muscles: preferredMuscles,
        primary_goal: goalFocus,
        health_notes: constraints,
        default_rest_time_seconds: 60, // Default to 60s as per requirements
        body_fat_pct: null // Will be updated when user adds this data
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) throw profileError;

      // Create initial T-Path
      const tPathData: TablesInsert<'t_paths'> = {
        user_id: session.user.id,
        template_name: tPathType === 'ulul' 
          ? '4-Day Upper/Lower' 
          : '3-Day Push/Pull/Legs',
        is_bonus: false,
        parent_t_path_id: null, // Main T-Path has no parent
        settings: {
          tPathType,
          experience,
          goalFocus,
          preferredMuscles,
          constraints,
          sessionLength,
          equipmentMethod
        }
      };

      const { data: tPath, error: tPathError } = await supabase
        .from('t_paths')
        .insert([tPathData])
        .select()
        .single();

      if (tPathError) throw tPathError;

      // Generate the actual workouts for this T-Path
      const response = await fetch(`/api/generate-t-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tPathId: tPath.id })
      });

      if (!response.ok) {
        throw new Error('Failed to generate T-Path workouts');
      }

      toast.success("Onboarding completed successfully!");
      router.push('/dashboard');
    } catch (error: any) {
      toast.error("Failed to complete onboarding: " + error.message);
      console.error("Onboarding error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome to Your Fitness Journey</h1>
          <p className="text-muted-foreground mt-2">
            Let's set up your personalized Transformation Path
          </p>
        </header>

        <div className="mb-6">
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div key={step} className="flex-1 text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                  currentStep >= step 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step}
                </div>
                {step < 6 && (
                  <div className={`h-1 w-full mt-2 ${
                    currentStep > step 
                      ? "bg-primary" 
                      : "bg-muted"
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Choose Your Transformation Path"}
              {currentStep === 2 && "Your Experience Level"}
              {currentStep === 3 && "Goal Focus"}
              {currentStep === 4 && "Session Preferences"}
              {currentStep === 5 && "Equipment Setup"}
              {currentStep === 6 && "Consent"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Select the workout structure that best fits your goals"}
              {currentStep === 2 && "Help us tailor your program to your experience level"}
              {currentStep === 3 && "What are you primarily trying to achieve?"}
              {currentStep === 4 && "How long do you prefer your workout sessions to be?"}
              {currentStep === 5 && "Let's set up your gym equipment"}
              {currentStep === 6 && "We need your permission to store your data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${
                      tPathType === 'ulul' 
                        ? 'border-primary ring-2 ring-primary' 
                        : 'hover:border-primary'
                    }`}
                    onClick={() => setTPathType('ulul')}
                  >
                    <CardHeader>
                      <CardTitle>4-Day Upper/Lower (ULUL)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-green-600">Pros:</h4>
                        <ul className="text-sm space-y-1">
                          {tPathDescriptions.ulul.pros.map((pro, i) => (
                            <li key={i} className="flex items-start">
                              <span className="text-green-500 mr-2">✓</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                        <h4 className="font-semibold text-red-600 mt-3">Cons:</h4>
                        <ul className="text-sm space-y-1">
                          {tPathDescriptions.ulul.cons.map((con, i) => (
                            <li key={i} className="flex items-start">
                              <span className="text-red-500 mr-2">✗</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${
                      tPathType === 'ppl' 
                        ? 'border-primary ring-2 ring-primary' 
                        : 'hover:border-primary'
                    }`}
                    onClick={() => setTPathType('ppl')}
                  >
                    <CardHeader>
                      <CardTitle>3-Day Push/Pull/Legs (PPL)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-green-600">Pros:</h4>
                        <ul className="text-sm space-y-1">
                          {tPathDescriptions.ppl.pros.map((pro, i) => (
                            <li key={i} className="flex items-start">
                              <span className="text-green-500 mr-2">✓</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                        <h4 className="font-semibold text-red-600 mt-3">Cons:</h4>
                        <ul className="text-sm space-y-1">
                          {tPathDescriptions.ppl.cons.map((con, i) => (
                            <li key={i} className="flex items-start">
                              <span className="text-red-500 mr-2">✗</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-between">
                  <div></div>
                  <Button 
                    onClick={handleNext} 
                    disabled={!tPathType}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <RadioGroup 
                  value={experience || undefined} 
                  onValueChange={(value: "beginner" | "intermediate") => setExperience(value)}
                >
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="beginner" id="beginner" />
                      <Label htmlFor="beginner">Beginner</Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      New to structured training or returning after a long break
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="intermediate" id="intermediate" />
                      <Label htmlFor="intermediate">Intermediate</Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Some experience with structured training programs
                    </p>
                  </div>
                </RadioGroup>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    disabled={!experience}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <RadioGroup 
                  value={goalFocus} 
                  onValueChange={setGoalFocus}
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="muscle_gain" id="muscle_gain" />
                      <Label htmlFor="muscle_gain">Build Muscle & Tone</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="general_fitness" id="general_fitness" />
                      <Label htmlFor="general_fitness">Improve General Fitness</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="strength" id="strength" />
                      <Label htmlFor="strength">Build Strength</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mobility" id="mobility" />
                      <Label htmlFor="mobility">Increase Mobility</Label>
                    </div>
                  </div>
                </RadioGroup>
                
                <div>
                  <Label htmlFor="preferredMuscles">Preferred Muscles to Train (Optional)</Label>
                  <Input 
                    id="preferredMuscles" 
                    placeholder="e.g., Chest, Back, Legs..." 
                    value={preferredMuscles}
                    onChange={(e) => setPreferredMuscles(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Let us know if there are specific muscle groups you want to focus on
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="constraints">Constraints (Optional)</Label>
                  <Textarea 
                    id="constraints" 
                    placeholder="Any injuries, health conditions, or limitations..." 
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    disabled={!goalFocus}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <RadioGroup 
                  value={sessionLength} 
                  onValueChange={setSessionLength}
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="15-30" id="15-30" />
                      <Label htmlFor="15-30">15-30 minutes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="30-45" id="30-45" />
                      <Label htmlFor="30-45">30-45 minutes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="45-60" id="45-60" />
                      <Label htmlFor="45-60">45-60 minutes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="60-90" id="60-90" />
                      <Label htmlFor="60-90">60-90 minutes</Label>
                    </div>
                  </div>
                </RadioGroup>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    disabled={!sessionLength}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <RadioGroup 
                  value={equipmentMethod || undefined} 
                  onValueChange={(value: "photo" | "skip") => setEquipmentMethod(value)} 
                >
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="photo" id="photo" />
                      <Label htmlFor="photo">Upload Gym Photo</Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Take a photo of your gym to help us identify available equipment
                    </p>
                    
                    {/* REMOVED: Manual Equipment Selection */}
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="skip" id="skip" />
                      <Label htmlFor="skip">Skip for Now</Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Use default "Common Gym" equipment set
                    </p>
                  </div>
                </RadioGroup>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    disabled={!equipmentMethod}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="consent" 
                      checked={consentGiven}
                      onCheckedChange={(checked) => setConsentGiven(!!checked)}
                    />
                    <Label htmlFor="consent" className="text-sm">
                      I consent to storing my workout data and profile information to provide 
                      personalized training recommendations. I understand I can delete my data 
                      at any time through my profile settings.
                    </Label>
                  </div>
                  
                  <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Data Privacy Information:</h4>
                    <ul className="space-y-1">
                      <li>• Photos are processed for equipment detection only</li>
                      <li>• Not used for identity or shared publicly</li>
                      <li>• Stored until you delete or replace them</li>
                      <li>• You can export or delete your data anytime</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!consentGiven || loading}
                  >
                    {loading ? "Completing Setup..." : "Complete Onboarding"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}