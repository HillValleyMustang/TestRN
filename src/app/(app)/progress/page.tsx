"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityChart } from "@/components/progress/activity-chart"; // Import the new component

export default function ProgressPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Your Progress</h1>
        <p className="text-muted-foreground">
          Charts, records, and summaries to track your fitness journey.
        </p>
      </header>
      <ActivityChart /> {/* Render the new chart component */}
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
      <MadeWithDyad />
    </div>
  );
}