"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy } from 'lucide-react';
import { formatTime } from '@data/utils/unit-conversions';
import { usePersonalRecordsData } from '@/hooks/data/usePersonalRecordsData'; // Import the new hook

export const PersonalRecordsCard = () => {
  const { personalRecords, isLoading, error } = usePersonalRecordsData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Personal Bests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Personal Bests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Personal Bests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {personalRecords.length === 0 ? (
          <p className="text-muted-foreground">No personal bests yet. Complete workouts to set new PBs!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personalRecords.map((record, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{record.exerciseName}</TableCell>
                  <TableCell>
                    {record.exerciseType === 'weight' 
                      ? `${record.value.toLocaleString()} kg` 
                      : `${formatTime(record.value)}`}
                  </TableCell>
                  <TableCell>{record.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};