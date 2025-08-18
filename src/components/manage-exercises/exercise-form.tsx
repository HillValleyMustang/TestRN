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
import { PlusCircle, Edit, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type ExerciseDefinition = Tables<'exercise_definitions'>;

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  main_muscle: z.string().min(1, "Main muscle group is required."),
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

  const mainMuscleGroups = [
    "Chest", "Back", "Shoulders", "Arms", "Core", 
    "Legs", "Glutes", "Calves", "Full Body", "Cardio"
  ];

  const form = useForm<z.infer<typeof exerciseSchema>>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      main_muscle: "",
      type: [],
      category: "",
      description: "",
      pro_tip: "",
      video_url: "",
    },
  });

  useEffect(() => {
    if (editingExercise) {
      form.reset({
        name: editingExercise.name,
        main_muscle: editingExercise.main_muscle,
        type: editingExercise.type ? [editingExercise.type] : [],
        category: editingExercise.category || "",
        description: editingExercise.description || "",
        pro_tip: editingExercise.pro_tip || "",
        video_url: editingExercise.video_url || "",
      });
      setSelectedTypes(editingExercise.type ? [editingExercise.type] : []);
      setIsExpanded(true);
    } else {
      form.reset();
      setSelectedTypes([]);
    }
  }, [editingExercise, form]);

  const handleTypeChange = (type: string, checked: boolean) => {
    const currentTypes = form.getValues("type") || [];
    let newTypes;
    
    if (checked) {
      newTypes = [...currentTypes, type];
    } else {
      newTypes = currentTypes.filter((t) => t !== type);
    }
    
    form.setValue("type", newTypes);
    setSelectedTypes(newTypes);
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

    const exerciseData = {
      ...values,
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
        setSelectedTypes([]);
        onSaveSuccess();
        setIsExpanded(false);
      }
    }
  }

  const toggleExpand = () => {
    if (isExpanded) {
      form.reset();
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
              <FormField 
                control={form.control} 
                name="main_muscle" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Muscle Group(s)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select muscle group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mainMuscleGroups.map((muscle) => (
                          <SelectItem key={muscle} value={muscle}>
                            {muscle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <div className="space-y-2">
                <FormLabel>Exercise Type</FormLabel>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
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
                  <div className="flex items-center space-x-2">
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
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Unilateral">
                          Unilateral (hint - movement performed one Arm or Leg at a time)
                        </SelectItem>
                        <SelectItem value="Bilateral">
                          Bilateral (hint - both your Arms or Legs move together)
                        </SelectItem>
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