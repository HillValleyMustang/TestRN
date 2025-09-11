"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase";
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
import { PlusCircle, Edit, XCircle, ChevronDown, ChevronUp, Info, Dumbbell, Timer } from "lucide-react";
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
import { ExerciseNameInput } from "@/components/manage-exercises/exercise-form/exercise-name-input";
import { MainMuscleSelect } from "@/components/manage-exercises/exercise-form/main-muscle-select";
import { ExerciseTypeSelector } from "@/components/manage-exercises/exercise-form/exercise-type-selector";
import { ExerciseCategorySelect } from "@/components/manage-exercises/exercise-form/exercise-category-select";
import { ExerciseDetailsTextareas } from "@/components/manage-exercises/exercise-form/exercise-details-textareas";
import { ExerciseVideoUrlInput } from "@/components/manage-exercises/exercise-form/exercise-video-url-input";
import { ExerciseFormActions } from "@/components/manage-exercises/exercise-form/exercise-form-actions";
import { ExerciseLocationTagSelect } from "@/components/manage-exercises/exercise-form/exercise-location-tag-select"; // Import the new component

type ExerciseDefinition = Tables<'exercise_definitions'>;

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  main_muscles: z.array(z.string()).min(1, "At least one main muscle group is required."),
  type: z.array(z.enum(["weight", "timed"])).min(1, "At least one exercise type is required."),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  pro_tip: z.string().optional().nullable(),
  video_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')).nullable(),
  location_tags: z.array(z.string()).optional().nullable(),
});

interface ExerciseFormProps {
  editingExercise: FetchedExerciseDefinition | null;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
  availableLocationTags: string[];
}

export const ExerciseForm = React.forwardRef<HTMLDivElement, ExerciseFormProps>(({ editingExercise, onCancelEdit, onSaveSuccess, availableLocationTags }, ref) => {
  const { session, supabase } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

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
      location_tags: [],
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
        description: editingExercise.description || null, // Fixed typo here
        pro_tip: editingExercise.pro_tip || null,
        video_url: editingExercise.video_url || null,
        location_tags: editingExercise.location_tags || [],
      });
      setSelectedMuscles(muscleGroups);
      setSelectedTypes(editingExercise.type ? [editingExercise.type] as ("weight" | "timed")[] : []);
      setIsExpanded(true);
    } else {
      form.reset();
      setSelectedMuscles([]);
      setSelectedTypes([]);
      setIsExpanded(false);
    }
  }, [editingExercise, form]);

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
      location_tags: values.location_tags,
    };

    const isEditingUserOwned = editingExercise && editingExercise.user_id === session.user.id && editingExercise.library_id === null && editingExercise.id !== null;

    if (isEditingUserOwned) {
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
    } else {
      const { error } = await supabase.from('exercise_definitions').insert([{ 
        ...exerciseData, 
        user_id: session.user.id,
        library_id: null,
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
    <>
      <Card ref={ref} className="w-full">
        <CardHeader 
          className="flex flex-row items-center justify-between cursor-pointer"
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
        {isExpanded && (
          <CardContent className="px-4 py-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                <ExerciseLocationTagSelect
                  form={form}
                  availableLocationTags={availableLocationTags}
                />
                
                <ExerciseDetailsTextareas form={form} />
                
                <ExerciseVideoUrlInput form={form} />
                
                <ExerciseFormActions
                  editingExercise={editingExercise}
                  onCancelEdit={onCancelEdit}
                  toggleExpand={toggleExpand}
                />
              </form>
            </Form>
          </CardContent>
        )}
      </Card>
    </>
  );
});