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
import { PlusCircle, LayoutTemplate, Edit, Trash2, XCircle, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type WorkoutTemplate = Tables<'workout_templates'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type TemplateExercise = Tables<'template_exercises'>;

// Extend ExerciseDefinition to include a temporary 'selected' state for the form
type SelectableExercise = ExerciseDefinition & { isSelected?: boolean };

// Zod schema for adding a new workout template
const workoutTemplateSchema = z.object({
  template_name: z.string().min(1, "Template name is required."),
  // We will manage exercises separately, not directly in the form schema for now
  // exercise_id: z.string().min(1, "At least one exercise is required."),
});

// Component for sortable exercise items
interface SortableExerciseItemProps {
  exercise: ExerciseDefinition;
  onRemove: (exerciseId: string) => void;
}

function SortableExerciseItem({ exercise, onRemove }: SortableExerciseItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 border rounded-md bg-card"
    >
      <div className="flex items-center">
        <button {...listeners} {...attributes} className="cursor-grab mr-2 p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span>{exercise.name} ({exercise.main_muscle})</span>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRemove(exercise.id)}>
        <XCircle className="h-4 w-4 text-destructive" />
      </Button>
    </li>
  );
}

export const ManageWorkoutTemplatesDialog = () => {
  const { session, supabase } = useSession();
  const [open, setOpen] = useState(false);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<ExerciseDefinition[]>([]); // Exercises for the current template being edited/created
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>(""); // For the select input

  const form = useForm<z.infer<typeof workoutTemplateSchema>>({
    resolver: zodResolver(workoutTemplateSchema),
    defaultValues: {
      template_name: "",
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const fetchAllExercises = async () => {
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
      setAllExercises(data || []);
    }
    setLoadingExercises(false);
  };

  const fetchTemplateExercises = async (templateId: string) => {
    const { data, error } = await supabase
      .from('template_exercises')
      .select('*, exercise_definitions(*)')
      .eq('template_id', templateId)
      .order('order_index', { ascending: true });

    if (error) {
      toast.error("Failed to load template exercises: " + error.message);
      console.error("Error fetching template exercises:", error);
      return [];
    }
    // Ensure exercise_definitions is not null and cast to ExerciseDefinition[]
    return data.map(item => item.exercise_definitions as ExerciseDefinition);
  };

  useEffect(() => {
    if (open) {
      fetchWorkoutTemplates();
      fetchAllExercises();
    }
  }, [open, session, supabase]);

  const handleEditClick = async (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    form.reset({
      template_name: template.template_name,
    });
    const exercises = await fetchTemplateExercises(template.id);
    setSelectedExercises(exercises);
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    form.reset();
    setSelectedExercises([]);
    setSelectedExerciseToAdd("");
  };

  const handleAddExerciseToTemplate = () => {
    if (selectedExerciseToAdd && !selectedExercises.some(ex => ex.id === selectedExerciseToAdd)) {
      const exerciseToAdd = allExercises.find(ex => ex.id === selectedExerciseToAdd);
      if (exerciseToAdd) {
        setSelectedExercises(prev => [...prev, exerciseToAdd]);
        setSelectedExerciseToAdd(""); // Reset select
      }
    }
  };

  const handleRemoveExerciseFromTemplate = (exerciseId: string) => {
    setSelectedExercises(prev => prev.filter(ex => ex.id !== exerciseId));
  };

  async function onSubmit(values: z.infer<typeof workoutTemplateSchema>) {
    if (!session) {
      toast.error("You must be logged in to manage workout templates.");
      return;
    }

    if (selectedExercises.length === 0) {
      toast.error("Please add at least one exercise to the template.");
      return;
    }

    let templateIdToUse: string;

    if (editingTemplate) {
      // Update existing template
      const updatedTemplate: TablesUpdate<'workout_templates'> = {
        template_name: values.template_name,
      };

      const { error } = await supabase
        .from('workout_templates')
        .update(updatedTemplate)
        .eq('id', editingTemplate.id);

      if (error) {
        toast.error("Failed to update workout template: " + error.message);
        console.error("Error updating workout template:", error);
        return;
      }
      templateIdToUse = editingTemplate.id;
      toast.success("Workout template updated successfully!");
    } else {
      // Add new template
      const newTemplate: TablesInsert<'workout_templates'> = {
        user_id: session.user.id,
        template_name: values.template_name,
        is_bonus: false, // Default to false
      };

      const { data, error } = await supabase.from('workout_templates').insert([newTemplate]).select('id').single();

      if (error || !data) {
        toast.error("Failed to add workout template: " + error.message);
        console.error("Error adding workout template:", error);
        return;
      }
      templateIdToUse = data.id;
      toast.success("Workout template created successfully!");
    }

    // Manage template_exercises
    // First, delete all existing template_exercises for this template
    const { error: deleteError } = await supabase
      .from('template_exercises')
      .delete()
      .eq('template_id', templateIdToUse);

    if (deleteError) {
      toast.error("Failed to clear old exercises: " + deleteError.message);
      console.error("Error clearing old exercises:", deleteError);
      return;
    }

    // Then, insert the new set of selected exercises with their order
    const newTemplateExercises: TablesInsert<'template_exercises'>[] = selectedExercises.map((ex, index) => ({
      template_id: templateIdToUse,
      exercise_id: ex.id,
      order_index: index,
    }));

    const { error: insertExercisesError } = await supabase
      .from('template_exercises')
      .insert(newTemplateExercises);

    if (insertExercisesError) {
      toast.error("Failed to save template exercises: " + insertExercisesError.message);
      console.error("Error saving template exercises:", insertExercisesError);
      return;
    }

    handleCancelEdit(); // Reset form and close dialog
    fetchWorkoutTemplates(); // Refresh the list
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this workout template? This will also delete all associated exercises and cannot be undone.")) {
      return;
    }

    // Deleting the template will cascade delete template_exercises due to ON DELETE CASCADE
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

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSelectedExercises((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
        return newItems;
      });
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

              <div className="space-y-2">
                <FormLabel>Exercises in Template</FormLabel>
                <div className="flex gap-2">
                  <Select onValueChange={setSelectedExerciseToAdd} value={selectedExerciseToAdd}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an exercise to add" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingExercises ? (
                        <div className="p-2 text-muted-foreground">Loading exercises...</div>
                      ) : allExercises.length === 0 ? (
                        <div className="p-2 text-muted-foreground">No exercises found. Add some first!</div>
                      ) : (
                        allExercises
                          .filter(ex => !selectedExercises.some(selectedEx => selectedEx.id === ex.id)) // Filter out already selected
                          .map((exercise) => (
                            <SelectItem key={exercise.id} value={exercise.id}>
                              {exercise.name} ({exercise.main_muscle})
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleAddExerciseToTemplate} disabled={!selectedExerciseToAdd}>
                    Add
                  </Button>
                </div>
                {selectedExercises.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No exercises added to this template yet.</p>
                ) : (
                  <ScrollArea className="h-48 w-full rounded-md border p-4">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedExercises.map(ex => ex.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <ul className="space-y-2">
                          {selectedExercises.map((exercise) => (
                            <SortableExerciseItem
                              key={exercise.id}
                              exercise={exercise}
                              onRemove={handleRemoveExerciseFromTemplate}
                            />
                          ))}
                        </ul>
                      </SortableContext>
                    </DndContext>
                  </ScrollArea>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loadingExercises && allExercises.length === 0}>
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