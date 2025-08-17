"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProgressPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Your Progress</h1>
        <p className="text-muted-foreground">
          Charts, records, and summaries to track your fitness journey.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page is under construction. Check back soon for detailed progress tracking!
          </p>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
}