"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, XCircle, ChevronDown, ChevronUp, Info, Sparkles, Dumbbell, Timer } from "lucide-react"; // Removed Check icon
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { AnalyzeGymDialog } from "./analyze-gym-dialog"; 
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

type ExerciseDefinition = Tables<'exercise_definitions'>;

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  main_muscles: z.array(z.string()).min(1, "At least one main muscle group is required."),
  type: z.array(z.enum(["weight", "timed"])).min(1, "At least one exercise type is required."),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  pro_tip: z.string().optional().nullable(),
  video_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')).nullable(),
});

interface ExerciseFormProps {
  editingExercise: ExerciseDefinition | null;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
}

export const ExerciseForm = ({ editingExercise, onCancelEdit, onSaveSuccess }: ExerciseFormProps) => {
  const { session, supabase } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [showAnalyzeGymDialog, setShowAnalyzeGymDialog] = useState(false);

  const mainMuscleGroups = [
    "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", 
    "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", 
    "Abdominals", "Core", "Full Body"
  ];

  const categoryOptions = [
    { 
      value: "Unilateral", 
      label: "Unilateral",
      description: "Movement performed with one arm or leg at a time"
    },
    { 
      value: "Bilateral", 
      label: "Bilateral",
      description: "Both arms or legs move together"
    }
  ];

  const form = useForm<z.infer<typeof exerciseSchema>>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      main_muscles: [],
      type: [],
      category: null,
      description: null,
      pro_tip: null,
      video_url: null,
    },
  });

  useEffect(() => {
    if (editingExercise) {
      const muscleGroups = editingExercise.main_muscle ? editingExercise.main_muscle.split(',').map((m: string) => m.trim()) : [];
      
      form.reset({
        name: editingExercise.name,
        main_muscles: muscleGroups,
        type: editingExercise.type ? [editingExercise.type] as ("weight" | "timed")[] : [],
        category: editingExercise.category || null,
        description: editingExercise.description || null,
        pro_tip: editingExercise.pro_tip || null,
        video_url: editingExercise.video_url || null,
      });
      setSelectedMuscles(muscleGroups);
      setSelectedTypes(editingExercise.type ? [editingExercise.type] as ("weight" | "timed")[] : []);
      setIsExpanded(true);
    } else {
      form.reset();
      setSelectedMuscles([]);
      setSelectedTypes([]);
    }
  }, [editingExercise, form]);

  const handleTypeChange = (type: "weight" | "timed") => {
    // Ensure only one type is selected (radio-like behavior)
    form.setValue("type", [type]);
    setSelectedTypes([type]);
  };

  const handleMuscleToggle = (muscle: string) => {
    const currentMuscles = form.getValues("main_muscles") || [];
    let newMuscles;
    
    if (currentMuscles.includes(muscle)) {
      newMuscles = currentMuscles.filter((m) => m !== muscle);
    } else {
      newMuscles = [...currentMuscles, muscle];
    }
    
    form.setValue("main_muscles", newMuscles);
    setSelectedMuscles(newMuscles);
  };

  const handleExerciseIdentified = (identifiedData: Partial<ExerciseDefinition>) => {
    // Reset form to treat this as a new exercise
    onCancelEdit(); // Clear any existing editing state
    setIsExpanded(true); // Ensure the form is open

    const muscleGroups = identifiedData.main_muscle ? identifiedData.main_muscle.split(',').map((m: string) => m.trim()) : [];
    const exerciseType = identifiedData.type ? [identifiedData.type] as ("weight" | "timed")[] : [];

    form.reset({
      name: identifiedData.name || "",
      main_muscles: muscleGroups,
      type: exerciseType,
      category: identifiedData.category || null,
      description: identifiedData.description || null,
      pro_tip: identifiedData.pro_tip || null,
      video_url: identifiedData.video_url || null,
    });
    setSelectedMuscles(muscleGroups);
    setSelectedTypes(exerciseType);
  };

  async function onSubmit(values: z.infer<typeof exerciseSchema>) {
    if (!session) {
      toast.error("You must be logged in to manage exercises.");
      return;
    }

    // Ensure we have at least one type
    if (!values.type || values.type.length === 0) {
      toast.error("Please select at least one exercise type.");
      return;
    }

    // Ensure we have at least one muscle group
    if (!values.main_muscles || values.main_muscles.length === 0) {
      toast.error("Please select at least one main muscle group.");
      return;
    }

    const exerciseData = {
      name: values.name,
      main_muscle: values.main_muscles.join(', '), // Store as comma-separated string
      type: values.type[0], // For now, we'll use the first type if multiple are selected
      category: values.category,
      description: values.description,
      pro_tip: values.pro_tip,
      video_url: values.video_url,
    };

    if (editingExercise) {
      if (editingExercise.user_id === null) {
        // This is a global exercise (hardcoded or AI-generated).
        // User is "adopting" it by trying to edit it. Create a new user-owned copy.
        const { error } = await supabase.from('exercise_definitions').insert([{ 
          ...exerciseData, 
          user_id: session.user.id,
          library_id: editingExercise.library_id, // Preserve the original library_id
          is_favorite: false, // Default to not favourited on adoption
          created_at: new Date().toISOString(), // Add created_at
        }]).select('id').single(); // Specify columns for select

        if (error) {
          if (error.code === '23505') { // Unique violation code
            toast.error("You already have a copy of this exercise in your library.");
          } else {
            toast.error("Failed to adopt exercise: " + error.message);
          }
        } else {
          toast.success("Exercise adopted and added to your library!");
          onCancelEdit();
          onSaveSuccess();
          setIsExpanded(false);
        }
      } else {
        // This is an existing user-owned exercise, so update it.
        const { error } = await supabase
          .from('exercise_definitions')
          .update(exerciseData)
          .eq('id', editingExercise.id);

        if (error) {
          toast.error("Failed to update exercise: " + error.message);
        } else {
          toast.success("Exercise updated successfully!");
          onCancelEdit();
          onSaveSuccess();
          setIsExpanded(false);
        }
      }
    } else {
      // This is a brand new exercise created by the user.
      const { error } = await supabase.from('exercise_definitions').insert([{ 
        ...exerciseData, 
        user_id: session.user.id,
        library_id: null, // No library_id for user-created exercises
        is_favorite: false, // Default to not favourited
        created_at: new Date().toISOString(), // Add created_at
      }]).select('id').single(); // Specify columns for select
      if (error) {
        toast.error("Failed to add exercise: " + error.message);
      } else {
        toast.success("Exercise added successfully!");
        form.reset();
        setSelectedMuscles([]);
        setSelectedTypes([]);
        onSaveSuccess();
        setIsExpanded(false);
      }
    }
  }

  const toggleExpand = () => {
    if (isExpanded) {
      form.reset();
      setSelectedMuscles([]);
      setSelectedTypes([]);
      if (editingExercise) {
        onCancelEdit();
      }
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className="w-full">
      <CardHeader 
        className="flex items-center justify-between cursor-pointer"
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggleExpand();
          }
        }}
      >
        <CardTitle className="flex-1 text-base">
          {editingExercise ? "Edit Exercise" : "Add New Exercise"}
        </CardTitle>
        <span className="ml-2">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </CardHeader>
      {isExpanded && (
        <CardContent className="px-4 py-6"> {/* Adjusted padding here */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAnalyzeGymDialog(true)}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Analyse My Gym
                </Button>
              </div>

              <FormField 
                control={form.control} 
                name="name" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Exercise Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              {/* Main Muscle Group(s) as a multi-select grid of buttons */}
              <FormField control={form.control} name="main_muscles" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Main Muscle Group(s)</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          {/* Wrap children in a single span */}
                          <span className="flex items-center justify-between w-full">
                            <div className="flex flex-wrap gap-1">
                              {field.value && field.value.length > 0 ? (
                                field.value.map((muscle) => (
                                  <Badge key={muscle} variant="secondary" className="flex items-center gap-1">
                                    {muscle}
                                    <XCircle className="h-3 w-3 cursor-pointer" onClick={(e) => {
                                      e.stopPropagation();
                                      const newSelection = field.value?.filter((m) => m !== muscle);
                                      field.onChange(newSelection);
                                    }} />
                                  </Badge>
                                ))
                              ) : (
                                <span>Select muscles...</span>
                              )}
                            </div>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <div className="grid grid-cols-2 gap-2 p-2"> {/* Grid for muscle buttons */}
                          {mainMuscleGroups.map((muscle) => (
                            <Button
                              key={muscle}
                              type="button"
                              variant={selectedMuscles.includes(muscle) ? "default" : "outline"}
                              onClick={() => handleMuscleToggle(muscle)}
                              className={cn(
                                "flex-1",
                                selectedMuscles.includes(muscle) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                              )}
                            >
                              {muscle}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              {/* Exercise Type as visual cards (single-select) */}
              <div className="space-y-3">
                <FormLabel className="font-bold">Exercise Type</FormLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all",
                      selectedTypes.includes("weight") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
                    )}
                    onClick={() => handleTypeChange("weight")}
                  >
                    <Dumbbell className={cn("h-8 w-8 mb-2", selectedTypes.includes("weight") ? "text-primary-foreground" : "text-muted-foreground")} />
                    <span className={cn("font-medium", selectedTypes.includes("weight") ? "text-primary-foreground" : "text-foreground")}>Weight Training</span>
                  </div>
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all",
                      selectedTypes.includes("timed") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
                    )}
                    onClick={() => handleTypeChange("timed")}
                  >
                    <Timer className={cn("h-8 w-8 mb-2", selectedTypes.includes("timed") ? "text-primary-foreground" : "text-muted-foreground")} />
                    <span className={cn("font-medium", selectedTypes.includes("timed") ? "text-primary-foreground" : "text-foreground")}>Timed (e.g. Plank)</span>
                  </div>
                </div>
                <FormMessage>
                  {form.formState.errors.type?.message}
                </FormMessage>
              </div>
              
              <FormField 
                control={form.control} 
                name="category" 
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-bold">Category</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 max-w-[90vw]">
                          <div className="space-y-2">
                            <p className="font-semibold">Category Information</p>
                            <ul className="text-sm space-y-1">
                              <li><span className="font-medium">Unilateral:</span> Movement performed with one arm or leg at a time</li>
                              <li><span className="font-medium">Bilateral:</span> Both arms or legs move together</li>
                            </ul>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <FormField 
                control={form.control} 
                name="description" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} className="text-sm" /> {/* Added text-sm */}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <FormField 
                control={form.control} 
                name="pro_tip" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Pro Tip (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} className="text-sm" /> {/* Added text-sm */}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <FormField 
                control={form.control} 
                name="video_url" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Video URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  {editingExercise ? (
                    editingExercise.user_id === null ? (
                      <>
                        <PlusCircle className="h-4 w-4 mr-2" /> Adopt & Edit
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" /> Update
                      </>
                    )
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 mr-2" /> Add
                    </>
                  )}
                </Button>
                {editingExercise && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      onCancelEdit();
                      setIsExpanded(false);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                )}
                {!editingExercise && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={toggleExpand}
                  >
                    Close
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      )}
      <AnalyzeGymDialog
        open={showAnalyzeGymDialog}
        onOpenChange={setShowAnalyzeGymDialog}
        onExerciseIdentified={handleExerciseIdentified}
      />
    </Card>
  );
};