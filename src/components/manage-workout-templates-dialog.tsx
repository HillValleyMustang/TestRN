"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "@/components/session-context-provider";
import { Tables, TablesInsert } from "@/types/supabase";
import { toast } from "sonner";
import { PlusCircle, LayoutTemplate } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type WorkoutTemplate = Tables<'workout_templates'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

// Zod schema for adding a new workout template
const workoutTemplateSchema = z.object({
  template_name: z.string().min(1, "Template name is required."),
  exercise_id: z.string().min(1, "At least one exercise is required."), // Assuming one exercise per template for simplicity
});

export const ManageWorkoutTemplatesDialog = () => {
  const { session, supabase } = useSession();
  const [open, setOpen] = useState(false);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingExercises, setLoadingExercises] = useState(true);

  const form = useForm<z.infer<typeof workoutTemplateSchema>>({
    resolver: zodResolver(workoutTemplateSchema),
    defaultValues: {
      template_name: "",
      exercise_id: "",
    },
  });

  const fetchWorkoutTemplates = async () => {
    if (!session) return;
    setLoadingTemplates(true);
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load workout templates: " + error.message);
      console.error("Error fetching workout templates:", error);
    } else {
      setWorkoutTemplates(data || []);
    }
    setLoadingTemplates(false);
  };

  const fetchExercises = async () => {
    if (!session) return;
    setLoadingExercises(true);
    const { data, error } = await supabase
      .from('exercise_definitions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('name', { ascending: true });

    if (error) {
      toast.error("Failed to load exercises: " + error.message);
      console.error("Error fetching exercises:", error);
    } else {
      setExercises(data || []);
    }
    setLoadingExercises(false);
  };

  useEffect(() => {
    if (open) {
      fetchWorkoutTemplates();
      fetchExercises();
    }
  }, [open, session, supabase]);

  async function onSubmit(values: z.infer<typeof workoutTemplateSchema>) {
    if (!session) {
      toast.error("You must be logged in to add workout templates.");
      return;
    }

    const newTemplate: TablesInsert<'workout_templates'> = {
      user_id: session.user.id,
      template_name: values.template_name,
      exercise_id: values.exercise_id,
      is_bonus: false, // Default to false
    };

    const { error } = await supabase.from('workout_templates').insert([newTemplate]);

    if (error) {
      toast.error("Failed to add workout template: " + error.message);
      console.error("Error adding workout template:", error);
    } else {
      toast.success("Workout template added successfully!");
      form.reset();
      fetchWorkoutTemplates(); // Refresh the list
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="justify-start">
          <LayoutTemplate className="h-4 w-4 mr-2" />
          <span>Manage Templates</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Workout Templates</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-2">Create New Template</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="template_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exercise_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Exercise</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an exercise" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingExercises ? (
                          <SelectItem value="" disabled>Loading exercises...</SelectItem>
                        ) : exercises.length === 0 ? (
                          <SelectItem value="" disabled>No exercises found. Add some first!</SelectItem>
                        ) : (
                          exercises.map((exercise) => (
                            <SelectItem key={exercise.id} value={exercise.id}>
                              {exercise.name} ({exercise.main_muscle})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loadingExercises && exercises.length === 0}>
                <PlusCircle className="h-4 w-4 mr-2" /> Create Template
              </Button>
            </form>
          </Form>

          <h3 className="text-lg font-semibold mt-6 mb-2">My Workout Templates</h3>
          {loadingTemplates ? (
            <p className="text-muted-foreground">Loading templates...</p>
          ) : workoutTemplates.length === 0 ? (
            <p className="text-muted-foreground">No workout templates defined yet. Create one above!</p>
          ) : (
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <ul className="space-y-2">
                {workoutTemplates.map((template) => (
                  <li key={template.id} className="flex items-center justify-between text-sm">
                    <span>{template.template_name}</span>
                    {/* Add edit/delete buttons here later if needed */}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};