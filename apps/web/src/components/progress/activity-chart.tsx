"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDistance, formatTime } from '@/lib/unit-conversions';
import { useActivityChartData } from '@/hooks/data/useActivityChartData'; // Import the new hook

export const ActivityChart = () => {
  const { chartData, isLoading, error, preferredDistanceUnit } = useActivityChartData();

  if (isLoading) {
    return (
      <Card className="h-[350px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading activity data...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[350px] flex items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </Card>
    );
  }

  const hasData = chartData.some(d => d.cyclingDistance > 0 || d.swimmingLengths > 0 || d.tennisDuration > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Activity Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No activity data available. Log some activities to see your progress!
          </div>
        ) : (
          <div className="h-[250px]">
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
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'Cycling Distance') return [`${formatDistance(value, preferredDistanceUnit as 'km' | 'miles')}`, name];
                    if (name === 'Swimming Lengths') return [`${value} lengths`, name];
                    if (name === 'Tennis Duration') return [`${formatTime(value * 60)}`, name]; // Convert minutes back to formatted time
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="cyclingDistance" fill="hsl(var(--chart-1))" name={`Cycling Distance (${preferredDistanceUnit})`} />
                <Bar dataKey="swimmingLengths" fill="hsl(var(--chart-2))" name="Swimming Lengths" />
                <Bar dataKey="tennisDuration" fill="hsl(var(--chart-3))" name="Tennis Duration (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};