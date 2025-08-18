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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ExerciseDefinition = Tables<'exercise_definitions'>;

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  main_muscles: z.array(z.string()).min(1, "At least one main muscle group is required."),
  type: z.array(z.enum(["weight", "timed"])).min(1, "At least one exercise type is required."),
  category: z.string().optional(),
  description: z.string().optional(),
  pro_tip: z.string().optional(),
  video_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
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
    "Abdominals", "Core"
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
      category: "",
      description: "",
      pro_tip: "",
      video_url: "",
    },
  });

  useEffect(() => {
    if (editingExercise) {
      const muscleGroups = editingExercise.main_muscle ? editingExercise.main_muscle.split(',').map(m => m.trim()) : [];
      
      form.reset({
        name: editingExercise.name,
        main_muscles: muscleGroups,
        type: editingExercise.type ? [editingExercise.type] as ("weight" | "timed")[] : [],
        category: editingExercise.category || "",
        description: editingExercise.description || "",
        pro_tip: editingExercise.pro_tip || "",
        video_url: editingExercise.video_url || "",
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
      ...values,
      main_muscle: values.main_muscles.join(', '), // Store as comma-separated string
      type: values.type[0] // For now, we'll use the first type if multiple are selected
    };

    if (editingExercise) {
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
        user_id: session.user.id 
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField 
                control={form.control} 
                name="name" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exercise Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <div className="space-y-2">
                <FormLabel>Main Muscle Group(s)</FormLabel>
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
              
              <div className="space-y-2">
                <FormLabel>Exercise Type</FormLabel>
                <div className="flex flex-col space-y-3 pt-1">
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
                      <FormLabel>Category</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>Unilateral: Movement performed with one arm or leg at a time</p>
                            <p className="mt-1">Bilateral: Both arms or legs move together</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
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
                    <FormLabel>Pro Tip (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
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
                    <FormLabel>Video URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  {editingExercise ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" /> Update
                    </>
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