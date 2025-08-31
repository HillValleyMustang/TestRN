"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityChart } from "@/components/progress/activity-chart";
import { WeeklyVolumeChart } from "@/components/dashboard/weekly-volume-chart";
import { PersonalRecordsCard } from "@/components/progress/personal-records-card";

export default function ProgressPage() {
  return (
    <div className="flex flex-col gap-4 p-2 sm:p-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-center">Your Progress</h1>
        <p className="text-muted-foreground text-center">
          Charts, records, and summaries to track your fitness journey.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workout Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyVolumeChart />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart />
          </CardContent>
        </Card>
      </div>
      
      <PersonalRecordsCard />
      
      <Card>
        <CardHeader>
          <CardTitle>More Progress Metrics Coming Soon!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            We're working on adding more detailed charts and personal records to help you visualize your achievements.
          </p>
        </CardContent>
      </Card>
      
    </div>
  );
}