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
import { PlusCircle, Edit, XCircle, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ExerciseDefinition = Tables<'exercise_definitions'>;

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  main_muscles: z.array(z.string()).min(1, "At least one main muscle group is required."),
  type: z.array(z.enum(["weight", "timed"])).min(1, "At least one exercise type is required."),
  category: z.string().optional().nullable(), // Allow null for category
  description: z.string().optional().nullable(), // Allow null for description
  pro_tip: z.string().optional().nullable(), // Allow null for pro_tip
  video_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')).nullable(), // Allow null for video_url
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

  const mainMuscleGroups = [
    "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", 
    "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", 
    "Abdominals", "Core", "Full Body" // Added Full Body
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
      const muscleGroups = editingExercise.main_muscle ? editingExercise.main_muscle.split(',').map(m => m.trim()) : [];
      
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

  const handleTypeChange = (type: "weight" | "timed", checked: boolean) => {
    const currentTypes = form.getValues("type") || [];
    let newTypes: ("weight" | "timed")[];
    
    if (checked) {
      newTypes = [...currentTypes, type];
    } else {
      newTypes = currentTypes.filter((t) => t !== type);
    }
    
    form.setValue("type", newTypes);
    setSelectedTypes(newTypes);
  };

  const handleMuscleChange = (muscle: string, checked: boolean) => {
    const currentMuscles = form.getValues("main_muscles") || [];
    let newMuscles;
    
    if (checked) {
      newMuscles = [...currentMuscles, muscle];
    } else {
      newMuscles = currentMuscles.filter((m) => m !== muscle);
    }
    
    form.setValue("main_muscles", newMuscles);
    setSelectedMuscles(newMuscles);
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
          library_id: editingExercise.library_id // Preserve the original library_id
        }]);

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
        library_id: null // No library_id for user-created exercises
      }]);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {editingExercise ? "Edit Exercise" : "Add New Exercise"}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleExpand}
            className="ml-2"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              
              <div className="space-y-3">
                <FormLabel className="font-bold">Main Muscle Group(s)</FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mainMuscleGroups.map((muscle) => (
                    <div key={muscle} className="flex items-center space-x-2">
                      <Checkbox
                        id={`muscle-${muscle}`}
                        checked={selectedMuscles.includes(muscle)}
                        onCheckedChange={(checked) => handleMuscleChange(muscle, !!checked)}
                      />
                      <label
                        htmlFor={`muscle-${muscle}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {muscle}
                      </label>
                    </div>
                  ))}
                </div>
                <FormMessage>
                  {form.formState.errors.main_muscles?.message}
                </FormMessage>
              </div>
              
              <div className="space-y-3">
                <FormLabel className="font-bold">Exercise Type</FormLabel>
                <div className="flex flex-col space-y-4 pt-1">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="weight"
                      checked={selectedTypes.includes("weight")}
                      onCheckedChange={(checked) => handleTypeChange("weight", !!checked)}
                    />
                    <label
                      htmlFor="weight"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Weight Training
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="timed"
                      checked={selectedTypes.includes("timed")}
                      onCheckedChange={(checked) => handleTypeChange("timed", !!checked)}
                    />
                    <label
                      htmlFor="timed"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Timed (e.g. Plank)
                    </label>
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
                      <Textarea {...field} value={field.value ?? ''} />
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
                      <Textarea {...field} value={field.value ?? ''} />
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
    </Card>
  );
};