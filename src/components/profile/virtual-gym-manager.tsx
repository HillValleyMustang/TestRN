"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, PlusCircle } from 'lucide-react';

interface VirtualGymManagerProps {
  isEditing: boolean;
  activeLocationTag: string | null;
  availableLocationTags: string[];
  onActiveTagChange: (newTag: string | null) => Promise<void>;
}

export const VirtualGymManager = ({
  isEditing,
  activeLocationTag,
  availableLocationTags,
  onActiveTagChange,
}: VirtualGymManagerProps) => {
  const [newGymName, setNewGymName] = useState("");

  const handleAddNewGym = () => {
    if (newGymName.trim()) {
      onActiveTagChange(newGymName.trim());
      setNewGymName(""); // Reset input after submission
    }
  };

  // Ensure the active tag is always in the list for the dropdown
  const displayTags = [...availableLocationTags];
  if (activeLocationTag && !displayTags.includes(activeLocationTag)) {
    displayTags.push(activeLocationTag);
  }

  return (
    <Card className="bg-card">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Active Gyms
        </CardTitle>
        <CardDescription>
          Manage your gym locations. Your active gym determines which exercises are suggested in ad-hoc workouts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label>Active Gym</Label>
          <div className="flex gap-2">
            <Select
              value={activeLocationTag || ''}
              onValueChange={(value) => onActiveTagChange(value === 'none' ? null : value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your active gym" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Show All)</SelectItem>
                {displayTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" disabled={!isEditing}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Add New Active Gym</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter a name for your new gym location. This will become your new active gym.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="e.g., Office Gym"
                    value={newGymName}
                    onChange={(e) => setNewGymName(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setNewGymName("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAddNewGym} disabled={!newGymName.trim()}>
                    Add and Set Active
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};