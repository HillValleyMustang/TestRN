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
import { PlusCircle, Edit, XCircle, ChevronDown, ChevronUp, Info, Sparkles, Dumbbell, Timer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

// Import new modular components with corrected paths
// Removed: import { AnalyzeGymButton } from "@/components/manage-exercises/exercise-form/analyze-gym-button";
import { ExerciseNameInput } from "@/components/manage-exercises/exercise-form/exercise-name-input";
import { MainMuscleSelect } from "@/components/manage-exercises/exercise-form/main-muscle-select";
import { ExerciseTypeSelector } from "@/components/manage-exercises/exercise-form/exercise-type-selector";
import { ExerciseCategorySelect } from "@/components/manage-exercises/exercise-form/exercise-category-select";
import { ExerciseDetailsTextareas } from "@/components/manage-exercises/exercise-form/exercise-details-textareas";
import { ExerciseVideoUrlInput } from "@/components/manage-exercises/exercise-form/exercise-video-url-input";
import { ExerciseFormActions } from "@/components/manage-exercises/exercise-form/exercise-form-actions";

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
  isExpandedInDialog?: boolean; // New prop to indicate if it's in a dialog
}

export const ExerciseForm = React.forwardRef<HTMLDivElement, ExerciseFormProps>(({ editingExercise, onCancelEdit, onSaveSuccess, isExpandedInDialog = false }, ref) => {
  const { session, supabase } = useSession();
  // isExpanded state is now controlled by isExpandedInDialog or defaults to false for standalone use
  const [isExpanded, setIsExpanded] = useState(isExpandedInDialog || false); 
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  // Removed: const [showAnalyzeGymDialog, setShowAnalyzeGymDialog] = useState(false);

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
      if (!isExpandedInDialog) setIsExpanded(true); // Only expand if not in dialog
    } else {
      form.reset();
      setSelectedMuscles([]);
      setSelectedTypes([]);
      if (!isExpandedInDialog) setIsExpanded(false); // Only collapse if not in dialog
    }
  }, [editingExercise, form, isExpandedInDialog]);

  const handleTypeChange = (type: "weight" | "timed") => {
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

  // Removed: handleExerciseIdentified function

  async function onSubmit(values: z.infer<typeof exerciseSchema>) {
    if (!session) {
      toast.error("You must be logged in to manage exercises.");
      return;
    }

    if (!values.type || values.type.length === 0) {
      toast.error("Please select at least one exercise type.");
      return;
    }

    if (!values.main_muscles || values.main_muscles.length === 0) {
      toast.error("Please select at least one main muscle group.");
      return;
    }

    const exerciseData = {
      name: values.name,
      main_muscle: values.main_muscles.join(', '),
      type: values.type[0],
      category: values.category,
      description: values.description,
      pro_tip: values.pro_tip,
      video_url: values.video_url,
    };

    // Determine if we are editing an existing user-owned exercise or creating a new one
    const isEditingUserOwned = editingExercise && editingExercise.user_id === session.user.id && editingExercise.library_id === null;

    if (isEditingUserOwned) {
      // This is an actual edit of a user-owned exercise
      const { error } = await supabase
        .from('exercise_definitions')
        .update(exerciseData)
        .eq('id', editingExercise.id);

      if (error) {
        toast.error("Failed to update exercise: " + error.message);
      } else {
        toast.success("Exercise updated successfully!");
        onCancelEdit(); // This will now close the dialog
        onSaveSuccess();
        if (!isExpandedInDialog) setIsExpanded(false); // Only collapse if not in dialog
      }
    } else {
      // This is always creating a new user-owned exercise,
      // whether from scratch or based on a global template.
      const { error } = await supabase.from('exercise_definitions').insert([{ 
        ...exerciseData, 
        user_id: session.user.id,
        library_id: null, // Always null for user-created/customized exercises
        is_favorite: false,
        created_at: new Date().toISOString(),
      }]).select('id').single();
      if (error) {
        toast.error("Failed to add exercise: " + error.message);
      } else {
        toast.success("Exercise added successfully!");
        form.reset();
        setSelectedMuscles([]);
        setSelectedTypes([]);
        onSaveSuccess();
        if (!isExpandedInDialog) setIsExpanded(false); // Only collapse if not in dialog
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
    <Card ref={ref} className="w-full">
      {!isExpandedInDialog && ( // Only show header if not in dialog
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
            {editingExercise && editingExercise.user_id === session?.user.id && editingExercise.library_id === null ? "Edit Exercise" : "Add New Exercise"}
          </CardTitle>
          <span className="ml-2">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </CardHeader>
      )}
      {(isExpanded || isExpandedInDialog) && ( // Render content if expanded or in dialog
        <CardContent className="px-4 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Removed: AnalyzeGymButton */}

              <ExerciseNameInput form={form} />
              
              <MainMuscleSelect
                form={form}
                mainMuscleGroups={mainMuscleGroups}
                selectedMuscles={selectedMuscles}
                handleMuscleToggle={handleMuscleToggle}
              />
              
              <ExerciseTypeSelector
                form={form}
                selectedTypes={selectedTypes}
                handleTypeChange={handleTypeChange}
              />
              
              <ExerciseCategorySelect
                form={form}
                categoryOptions={categoryOptions}
              />
              
              <ExerciseDetailsTextareas form={form} />
              
              <ExerciseVideoUrlInput form={form} />
              
              <ExerciseFormActions
                editingExercise={editingExercise}
                onCancelEdit={onCancelEdit}
                toggleExpand={toggleExpand} // This will now close the dialog if not in dialog mode
              />
            </form>
          </Form>
        </CardContent>
      )}
    </Card>
  );
});