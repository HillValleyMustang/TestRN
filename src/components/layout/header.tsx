"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Home, Dumbbell, LayoutTemplate, History, User, BarChart3, PanelLeft, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserNav } from "./user-nav";
import { NotificationBell } from "./notification-bell";
import { ActivityLoggingDialog } from "../activity-logging-dialog";
import { StreakPill } from "./streak-pill";

const mobileNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workout-history", label: "Workout History", icon: History },
  { href: "/activity-logs", label: "Activity Logs", icon: BarChart3 },
  { href: "/manage-exercises", label: "Manage Exercises", icon: Dumbbell },
  { href: "/manage-templates", label: "Manage Templates", icon: LayoutTemplate },
  { href: "/profile", label: "My Profile", icon: User },
];

export function Header() {
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs">
            <nav className="grid gap-6 text-lg font-medium">
              {mobileNavLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              ))}
              <hr className="my-2" />
              <Link
                href="/start-workout"
                className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
              >
                <Dumbbell className="h-5 w-5" />
                Start Workout
              </Link>
              <Button variant="ghost" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground justify-start text-lg font-medium" onClick={() => setIsActivityLogOpen(true)}>
                <Plus className="h-5 w-5" />
                Log Activity
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="relative ml-auto flex flex-1 items-center justify-end gap-2 md:grow-0">
          <StreakPill />
          <NotificationBell />
          <UserNav />
        </div>
      </header>

      <ActivityLoggingDialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen} />
    </>
  );
}