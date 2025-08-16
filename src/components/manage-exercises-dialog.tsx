"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "@/components/session-context-provider";
import { Tables, TablesInsert } from "@/types/supabase";
import { toast } from "sonner";
import { Dumbbell, PlusCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type ExerciseDefinition = Tables<'exercise_definitions'>;

// Zod schema for adding a new exercise definition
const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  main_muscle: z.string().min(1, "Main muscle group is required."),
  type: z.enum(["weight", "timed", "cardio"], {
    required_error: "Exercise type is required.",
  }),
  category: z.string().optional(),
  description: z.string().optional(),
  pro_tip: z.string().optional(),
  video_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
});

export const ManageExercisesDialog = () => {
  const { session, supabase } = useSession();
  const [open, setOpen] = useState(false);
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof exerciseSchema>>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      main_muscle: "",
      type: "weight",
      category: "",
      description: "",
      pro_tip: "",
      video_url: "",
    },
  });

  const fetchExercises = async () => {
    if (!session) return;
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchExercises();
    }
  }, [open, session, supabase]);

  async function onSubmit(values: z.infer<typeof exerciseSchema>) {
    if (!session) {
      toast.error("You must be logged in to add exercises.");
      return;
    }

    const newExercise: TablesInsert<'exercise_definitions'> = {
      user_id: session.user.id,
      name: values.name,
      main_muscle: values.main_muscle,
      type: values.type,
      category: values.category || null,
      description: values.description || null,
      pro_tip: values.pro_tip || null,
      video_url: values.video_url || null,
    };

    const { error } = await supabase.from('exercise_definitions').insert([newExercise]);

    if (error) {
      toast.error("Failed to add exercise: " + error.message);
      console.error("Error adding exercise:", error);
    } else {
      toast.success("Exercise added successfully!");
      form.reset();
      fetchExercises(); // Refresh the list
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="justify-start">
          <Dumbbell className="h-4 w-4 mr-2" />
          <span>Manage Exercises</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Exercises</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-2">Add New Exercise</h3>
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
                    <FormLabel>Main Muscle Group</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exercise Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exercise type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weight">Weight Training</SelectItem>
                        <SelectItem value="timed">Timed Exercise</SelectItem>
                        <SelectItem value="cardio">Cardio</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Compound, Isolation, Unilateral" {...field} />
                    </FormControl>
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
                      <Textarea placeholder="Brief description of the exercise" {...field} />
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
                      <Textarea placeholder="Any pro tips for this exercise" {...field} />
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
                      <Input placeholder="Link to a demonstration video" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" /> Add Exercise
              </Button>
            </form>
          </Form>

          <h3 className="text-lg font-semibold mt-6 mb-2">My Exercises</h3>
          {loading ? (
            <p className="text-muted-foreground">Loading exercises...</p>
          ) : exercises.length === 0 ? (
            <p className="text-muted-foreground">No exercises defined yet. Add one above!</p>
          ) : (
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <ul className="space-y-2">
                {exercises.map((exercise) => (
                  <li key={exercise.id} className="flex items-center justify-between text-sm">
                    <span>{exercise.name} ({exercise.main_muscle})</span>
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