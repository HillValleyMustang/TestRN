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
import { PlusCircle, Edit, XCircle } from "lucide-react";

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

interface ExerciseFormProps {
  editingExercise: ExerciseDefinition | null;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
}

export const ExerciseForm = ({ editingExercise, onCancelEdit, onSaveSuccess }: ExerciseFormProps) => {
  const { session, supabase } = useSession();

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

  useEffect(() => {
    if (editingExercise) {
      form.reset({
        name: editingExercise.name,
        main_muscle: editingExercise.main_muscle,
        type: editingExercise.type as "weight" | "timed" | "cardio",
        category: editingExercise.category || "",
        description: editingExercise.description || "",
        pro_tip: editingExercise.pro_tip || "",
        video_url: editingExercise.video_url || "",
      });
    } else {
      form.reset();
    }
  }, [editingExercise, form]);

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
        onCancelEdit();
        onSaveSuccess();
      }
    } else {
      const { error } = await supabase.from('exercise_definitions').insert([{ ...values, user_id: session.user.id }]);
      if (error) {
        toast.error("Failed to add exercise: " + error.message);
      } else {
        toast.success("Exercise added successfully!");
        form.reset();
        onSaveSuccess();
      }
    }
  }

  return (
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
              {editingExercise && ( <Button type="button" variant="outline" onClick={onCancelEdit}> <XCircle className="h-4 w-4 mr-2" /> Cancel </Button> )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};