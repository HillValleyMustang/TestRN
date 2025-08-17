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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Edit, Trash2, XCircle, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

type WorkoutTemplate = Tables<'workout_templates'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

const workoutTemplateSchema = z.object({
  template_name: z.string().min(1, "Template name is required."),
});

function SortableExerciseItem({ exercise, onRemove }: { exercise: ExerciseDefinition; onRemove: (id: string) => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exercise.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li ref={setNodeRef} style={style} className="flex items-center justify-between p-2 border rounded-md bg-card">
      <div className="flex items-center">
        <button {...listeners} {...attributes} className="cursor-grab mr-2 p-1"><GripVertical className="h-4 w-4" /></button>
        <span>{exercise.name}</span>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onRemove(exercise.id)}><XCircle className="h-4 w-4 text-destructive" /></Button>
    </li>
  );
}

export default function ManageTemplatesPage() {
  const { session, supabase } = useSession();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WorkoutTemplate | null>(null);

  const form = useForm<z.infer<typeof workoutTemplateSchema>>({
    resolver: zodResolver(workoutTemplateSchema),
    defaultValues: { template_name: "" },
  });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);
    const { data: tData, error: tError } = await supabase.from('workout_templates').select('*').eq('user_id', session.user.id);
    if (tError) toast.error("Failed to load templates"); else setTemplates(tData || []);
    const { data: eData, error: eError } = await supabase.from('exercise_definitions').select('*').eq('user_id', session.user.id);
    if (eError) toast.error("Failed to load exercises"); else setAllExercises(eData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [session, supabase]);

  const handleEditClick = async (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    form.reset({ template_name: template.template_name });
    const { data, error } = await supabase.from('template_exercises').select('*, exercise_definitions(*)').eq('template_id', template.id).order('order_index');
    if (error) toast.error("Failed to load template exercises");
    else setSelectedExercises(data.map(item => item.exercise_definitions as ExerciseDefinition));
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    form.reset();
    setSelectedExercises([]);
  };

  const handleAddExercise = () => {
    const exercise = allExercises.find(e => e.id === selectedExerciseToAdd);
    if (exercise && !selectedExercises.some(e => e.id === exercise.id)) {
      setSelectedExercises(prev => [...prev, exercise]);
    }
    setSelectedExerciseToAdd("");
  };

  const handleRemoveExercise = (id: string) => setSelectedExercises(prev => prev.filter(e => e.id !== id));

  async function onSubmit(values: z.infer<typeof workoutTemplateSchema>) {
    if (!session || selectedExercises.length === 0) return;
    let templateId: string;
    if (editingTemplate) {
      const { error } = await supabase.from('workout_templates').update({ template_name: values.template_name }).eq('id', editingTemplate.id);
      if (error) { toast.error("Update failed"); return; }
      templateId = editingTemplate.id;
    } else {
      const { data, error } = await supabase.from('workout_templates').insert([{ ...values, user_id: session.user.id }]).select('id').single();
      if (error || !data) { toast.error("Create failed"); return; }
      templateId = data.id;
    }
    await supabase.from('template_exercises').delete().eq('template_id', templateId);
    const newExercises = selectedExercises.map((ex, i) => ({ template_id: templateId, exercise_id: ex.id, order_index: i }));
    const { error: insertError } = await supabase.from('template_exercises').insert(newExercises);
    if (insertError) toast.error("Failed to save exercises");
    else toast.success(`Template ${editingTemplate ? 'updated' : 'created'}!`);
    handleCancelEdit();
    await fetchData();
  }

  const handleDeleteClick = (template: WorkoutTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    const { error } = await supabase.from('workout_templates').delete().eq('id', templateToDelete.id);
    if (error) {
      toast.error("Delete failed: " + error.message);
    } else {
      toast.success("Template deleted");
      await fetchData();
    }
    setIsDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSelectedExercises((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
        return newItems;
      });
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <header className="mb-4"><h1 className="text-3xl font-bold">Manage Templates</h1></header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader><CardTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</CardTitle></CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="template_name" render={({ field }) => ( <FormItem> <FormLabel>Template Name</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormItem>
                      <FormLabel>Exercises</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={setSelectedExerciseToAdd} value={selectedExerciseToAdd}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Add exercise" /></SelectTrigger></FormControl>
                          <SelectContent>{allExercises.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button type="button" onClick={handleAddExercise}>Add</Button>
                      </div>
                    </FormItem>
                    <ScrollArea className="h-64 border rounded-md p-2">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={selectedExercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
                          <ul className="space-y-2">{selectedExercises.map(e => <SortableExerciseItem key={e.id} exercise={e} onRemove={handleRemoveExercise} />)}</ul>
                        </SortableContext>
                      </DndContext>
                    </ScrollArea>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" className="flex-1">{editingTemplate ? "Update" : "Create"}</Button>
                      {editingTemplate && <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>My Templates</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p>Loading...</p> : (
                  <ScrollArea className="h-[600px] pr-4">
                    <ul className="space-y-2">
                      {templates.map(t => (
                        <li key={t.id} className="flex items-center justify-between p-2 border rounded-md">
                          <span>{t.template_name}</span>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(t)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
              This action cannot be undone. This will permanently delete the template "{templateToDelete?.template_name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTemplate}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}