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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Edit, Trash2, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ExerciseDefinition = Tables<'exercise_definitions'>;

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

export default function ManageExercisesPage() {
  const { session, supabase } = useSession();
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState<ExerciseDefinition | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseDefinition | null>(null);

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
    } else {
      setExercises(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExercises();
  }, [session, supabase]);

  const handleEditClick = (exercise: ExerciseDefinition) => {
    setEditingExercise(exercise);
    form.reset({
      name: exercise.name,
      main_muscle: exercise.main_muscle,
      type: exercise.type as "weight" | "timed" | "cardio",
      category: exercise.category || "",
      description: exercise.description || "",
      pro_tip: exercise.pro_tip || "",
      video_url: exercise.video_url || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingExercise(null);
    form.reset();
  };

  async function onSubmit(values: z.infer<typeof exerciseSchema>) {
    if (!session) {
      toast.error("You must be logged in to manage exercises.");
      return;
    }

    if (editingExercise) {
      const { error } = await supabase
        .from('exercise_definitions')
        .update({ ...values })
        .eq('id', editingExercise.id);

      if (error) {
        toast.error("Failed to update exercise: " + error.message);
      } else {
        toast.success("Exercise updated successfully!");
        handleCancelEdit();
        await fetchExercises();
      }
    } else {
      const { error } = await supabase.from('exercise_definitions').insert([{ ...values, user_id: session.user.id }]);
      if (error) {
        toast.error("Failed to add exercise: " + error.message);
      } else {
        toast.success("Exercise added successfully!");
        form.reset();
        await fetchExercises();
      }
    }
  }

  const handleDeleteClick = (exercise: ExerciseDefinition) => {
    setExerciseToDelete(exercise);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    const { error } = await supabase.from('exercise_definitions').delete().eq('id', exerciseToDelete.id);
    if (error) {
      toast.error("Failed to delete exercise: " + error.message);
    } else {
      toast.success("Exercise deleted successfully!");
      await fetchExercises();
    }
    setIsDeleteDialogOpen(false);
    setExerciseToDelete(null);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="mb-4">
          <h1 className="text-3xl font-bold">Manage Exercises</h1>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{editingExercise ? "Edit Exercise" : "Add New Exercise"}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Exercise Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="main_muscle" render={({ field }) => ( <FormItem> <FormLabel>Main Muscle Group</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="type" render={({ field }) => ( <FormItem> <FormLabel>Exercise Type</FormLabel> <FormControl><Select onValueChange={field.onChange} value={field.value}> <SelectTrigger> <SelectValue placeholder="Select type" /> </SelectTrigger> <SelectContent> <SelectItem value="weight">Weight Training</SelectItem> <SelectItem value="timed">Timed</SelectItem> <SelectItem value="cardio">Cardio</SelectItem> </SelectContent> </Select></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel>Category (Optional)</FormLabel> <FormControl><Input placeholder="e.g., Unilateral" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="pro_tip" render={({ field }) => ( <FormItem> <FormLabel>Pro Tip (Optional)</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="video_url" render={({ field }) => ( <FormItem> <FormLabel>Video URL (Optional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" className="flex-1">
                        {editingExercise ? <><Edit className="h-4 w-4 mr-2" /> Update</> : <><PlusCircle className="h-4 w-4 mr-2" /> Add</>}
                      </Button>
                      {editingExercise && ( <Button type="button" variant="outline" onClick={handleCancelEdit}> <XCircle className="h-4 w-4 mr-2" /> Cancel </Button> )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>My Exercise Library</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? ( <p>Loading...</p> ) : exercises.length === 0 ? ( <p>No exercises defined yet.</p> ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <ul className="space-y-2">
                      {exercises.map((ex) => (
                        <li key={ex.id} className="flex items-center justify-between p-2 border rounded-md">
                          <span>{ex.name} <span className="text-muted-foreground">({ex.main_muscle})</span></span>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(ex)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(ex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exercise "{exerciseToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExerciseToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExercise}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}