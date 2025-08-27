"use client";

import React, { useState } from "react";
import { useSession } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function TestUserPage() {
  const { session, supabase } = useSession();
  const [loading, setLoading] = useState(false);

  const handleTestUserCreation = async () => {
    setLoading(true);
    try {
      // Create a test user
      const { data, error } = await supabase.auth.signUp({
        email: "test@example.com",
        password: "password123",
      });

      if (error) {
        toast.error("Error creating test user: " + error.message);
        return;
      }

      toast.success("Test user created successfully!");
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Admin Test User Creation</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create Test User</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This page is for admin-only testing purposes.</p>
          <Button onClick={handleTestUserCreation} disabled={loading}>
            {loading ? "Creating..." : "Create Test User"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}