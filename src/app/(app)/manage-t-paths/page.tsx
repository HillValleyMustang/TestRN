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

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

const tPathSchema = z.object({
  template_name: z.string().min(1, "T-Path name is required."),
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

export default function ManageTPathsPage() {
  const { session, supabase } = useSession();
  const [tPaths, setTPaths] = useState<TPath[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTPath, setEditingTPath] = useState<TPath | null>(null);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tPathToDelete, setTPathToDelete] = useState<TPath | null>(null);

  const form = useForm<z.infer<typeof tPathSchema>>({
    resolver: zodResolver(tPathSchema),
    defaultValues: { template_name: "" },
  });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);
    const { data: tData, error: tError } = await supabase.from('t_paths').select('*').eq('user_id', session.user.id);
    if (tError) toast.error("Failed to load T-Paths"); else setTPaths(tData || []);
    const { data: eData, error: eError } = await supabase.from('exercise_definitions').select('*').eq('user_id', session.user.id);
    if (eError) toast.error("Failed to load exercises"); else setAllExercises(eData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [session, supabase]);

  const handleEditClick = async (tPath: TPath) => {
    setEditingTPath(tPath);
    form.reset({ template_name: tPath.template_name });
    const { data, error } = await supabase.from('t_path_exercises').select('*, exercise_definitions(*)').eq('template_id', tPath.id).order('order_index');
    if (error) toast.error("Failed to load T-Path exercises");
    else setSelectedExercises(data.map(item => item.exercise_definitions as ExerciseDefinition));
  };

  const handleCancelEdit = () => {
    setEditingTPath(null);
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

  async function onSubmit(values: z.infer<typeof tPathSchema>) {
    if (!session || selectedExercises.length === 0) {
      toast.error("Please add at least one exercise to the T-Path.");
      return;
    }
    let tPathId: string;
    if (editingTPath) {
      const { error } = await supabase.from('t_paths').update({ template_name: values.template_name }).eq('id', editingTPath.id);
      if (error) { toast.error("Update failed"); return; }
      tPathId = editingTPath.id;
    } else {
      const { data, error } = await supabase.from('t_paths').insert([{ ...values, user_id: session.user.id }]).select('id').single();
      if (error || !data) { toast.error("Create failed"); return; }
      tPathId = data.id;
    }
    await supabase.from('t_path_exercises').delete().eq('template_id', tPathId);
    const newExercises = selectedExercises.map((ex, i) => ({ template_id: tPathId, exercise_id: ex.id, order_index: i }));
    const { error: insertError } = await supabase.from('t_path_exercises').insert(newExercises);
    if (insertError) toast.error("Failed to save exercises");
    else toast.success(`T-Path ${editingTPath ? 'updated' : 'created'}!`);
    handleCancelEdit();
    await fetchData();
  }

  const handleDeleteClick = (tPath: TPath) => {
    setTPathToDelete(tPath);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTPath = async () => {
    if (!tPathToDelete) return;
    const { error } = await supabase.from('t_paths').delete().eq('id', tPathToDelete.id);
    if (error) {
      toast.error("Delete failed: " + error.message);
    } else {
      toast.success("T-Path deleted");
      await fetchData();
    }
    setIsDeleteDialogOpen(false);
    setTPathToDelete(null);
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
        <header className="mb-4"><h1 className="text-3xl font-bold">Manage Transformation Paths</h1></header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader><CardTitle>{editingTPath ? "Edit Transformation Path" : "Create New Transformation Path"}</CardTitle></CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="template_name" render={({ field }) => ( <FormItem> <FormLabel>T-Path Name</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormItem>
                      <FormLabel>Exercises</FormLabel>
                      <div className="flex gap-2">
                        {/* Removed FormControl here as this Select is not part of the react-hook-form schema */}
                        <Select onValueChange={setSelectedExerciseToAdd} value={selectedExerciseToAdd}>
                          <SelectTrigger><SelectValue placeholder="Add exercise" /></SelectTrigger>
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
                      <Button type="submit" className="flex-1">{editingTPath ? "Update" : "Create"}</Button>
                      {editingTPath && <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>My Transformation Paths</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p>Loading...</p> : (
                  <ScrollArea className="h-[600px] pr-4">
                    <ul className="space-y-2">
                      {tPaths.map(t => (
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
              This action cannot be undone. This will permanently delete the T-Path "{tPathToDelete?.template_name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTPathToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTPath}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}