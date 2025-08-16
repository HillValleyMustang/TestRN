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
import { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";
import { toast } from "sonner";
import { PlusCircle, LayoutTemplate, Edit, Trash2, XCircle } from "lucide-react";
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
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);

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

  const handleEditClick = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    form.reset({
      template_name: template.template_name,
      exercise_id: template.exercise_id || "", // Ensure it's a string for the select
    });
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    form.reset();
  };

  async function onSubmit(values: z.infer<typeof workoutTemplateSchema>) {
    if (!session) {
      toast.error("You must be logged in to manage workout templates.");
      return;
    }

    if (editingTemplate) {
      // Update existing template
      const updatedTemplate: TablesUpdate<'workout_templates'> = {
        template_name: values.template_name,
        exercise_id: values.exercise_id,
      };

      const { error } = await supabase
        .from('workout_templates')
        .update(updatedTemplate)
        .eq('id', editingTemplate.id);

      if (error) {
        toast.error("Failed to update workout template: " + error.message);
        console.error("Error updating workout template:", error);
      } else {
        toast.success("Workout template updated successfully!");
        setEditingTemplate(null);
        form.reset();
        fetchWorkoutTemplates(); // Refresh the list
      }
    } else {
      // Add new template
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
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this workout template? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      toast.error("Failed to delete workout template: " + error.message);
      console.error("Error deleting workout template:", error);
    } else {
      toast.success("Workout template deleted successfully!");
      fetchWorkoutTemplates(); // Refresh the list
    }
  };

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
          <h3 className="text-lg font-semibold mb-2">{editingTemplate ? "Edit Workout Template" : "Create New Template"}</h3>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an exercise" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingExercises ? (
                          <div className="p-2 text-muted-foreground">Loading exercises...</div>
                        ) : exercises.length === 0 ? (
                          <div className="p-2 text-muted-foreground">No exercises found. Add some first!</div>
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
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loadingExercises && exercises.length === 0}>
                  {editingTemplate ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" /> Update Template
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 mr-2" /> Create Template
                    </>
                  )}
                </Button>
                {editingTemplate && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    <XCircle className="h-4 w-4 mr-2" /> Cancel Edit
                  </Button>
                )}
              </div>
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
                  <li key={template.id} className="flex items-center justify-between text-sm py-1">
                    <span>{template.template_name}</span>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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