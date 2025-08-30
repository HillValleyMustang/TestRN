"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Home, Dumbbell, LayoutTemplate, History, User, BarChart3, PanelLeft, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserNav } from "./user-nav";
import { NotificationBell } from "./notification-bell";
import { ActivityLoggingDialog } from "../activity-logging-dialog";
import { useScrollPosition } from "@/hooks/use-scroll-position"; // Import the new hook
import { cn } from "@/lib/utils"; // Ensure cn is imported
import { RollingStatusBadge } from "./rolling-status-badge"; // Import the new RollingStatusBadge

const mobileNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workout-history", label: "Workout History", icon: History },
  { href: "/activity-logs", label: "Activity Logs", icon: BarChart3 },
  { href: "/manage-exercises", label: "Manage Exercises", icon: Dumbbell },
  { href: "/manage-t-paths", label: "Manage T-Paths", icon: LayoutTemplate },
  { href: "/profile", label: "My Profile", icon: User },
];

export function Header() {
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const isScrolled = useScrollPosition(); // Use the new hook

  return (
    <>
      <header className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 sm:static sm:h-auto sm:border-0 sm:px-6",
        "transition-all duration-300 ease-in-out", // Smooth transition
        isScrolled ? "bg-background/80 backdrop-blur-md border-b-transparent" : "bg-background border-b" // Apply glassmorphism on scroll
      )}>
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden">
              {/* Wrap children in a single span */}
              <span>
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </span>
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
              {/* Updated path */}
              <Link
                href="/workout"
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
          <RollingStatusBadge /> {/* Replaced StreakPill with RollingStatusBadge */}
          <NotificationBell />
          <UserNav />
        </div>
      </header>

      <ActivityLoggingDialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen} />
    </>
  );
}