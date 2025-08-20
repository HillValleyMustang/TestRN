"use client";

import React from "react";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2 } from "lucide-react";
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

interface TPathListProps {
  tPaths: TPath[];
  loading: boolean;
  onEdit: (tPath: TPath) => void;
  onDelete: (tPath: TPath) => void;
  isDeleteDialogOpen: boolean;
  tPathToDelete: TPath | null;
  setIsDeleteDialogOpen: (open: boolean) => void;
  confirmDeleteTPath: () => void;
}

export const TPathList = ({
  tPaths,
  loading,
  onEdit,
  onDelete,
  isDeleteDialogOpen,
  tPathToDelete,
  setIsDeleteDialogOpen,
  confirmDeleteTPath,
}: TPathListProps) => {
  return (
    <Card>
      <CardHeader><CardTitle>My Transformation Paths</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p>Loading...</p> : (
          <ScrollArea className="pr-4">
            <ul className="space-y-2">
              {tPaths.map(t => (
                <li key={t.id} className="flex items-center justify-between p-2 border rounded-md">
                  <span>{t.template_name}</span>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(t)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the T-Path "{tPathToDelete?.template_name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTPath}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};