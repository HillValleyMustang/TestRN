"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatWeight } from '@/lib/unit-conversions';
import { useWeeklyVolumeData } from '@/hooks/data/useWeeklyVolumeData';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

export const WeeklyVolumeChart = () => {
  const { chartData, isLoading, error } = useWeeklyVolumeData();

  if (error) {
    return (
      <Card className="h-[350px] flex items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-xl">
          {isLoading ? <Skeleton className="h-6 w-48 mx-auto" /> : "Weekly Workout Volume"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[250px] flex flex-col items-center justify-center space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No workout volume data available. Log some workouts to see your progress!
          </div>
        ) : (
          <div className="h-[250px] animate-fade-in-fast"> {/* Apply fast fade-in here */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${Math.round(value / 1000)}k`;
                    }
                    return value.toLocaleString();
                  }}
                  label={{ value: 'Volume (kg)', angle: -90, position: 'left', offset: -10, style: { textAnchor: 'middle', fontSize: 12 } }}
                />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']} />
                <Legend />
                <Bar dataKey="volume" fill="hsl(var(--primary))" name="Volume" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};