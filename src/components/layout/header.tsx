"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Home, Dumbbell, LayoutTemplate, History, User, BarChart3, PanelLeft, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserNav } from "./user-nav";
import { NotificationBell } from "./notification-bell";
import { ActivityLoggingDialog } from "../activity-logging-dialog";
import { useScrollPosition } from "@/hooks/use-scroll-position";
import { cn } from "@/lib/utils";
import { RollingStatusBadge } from "./rolling-status-badge";
import { WorkoutAwareLink } from "../workout-flow/workout-aware-link"; // Import WorkoutAwareLink
import { usePathname } from "next/navigation"; // Import usePathname to check active link

const mobileNavLinks = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/workout-history", label: "History", icon: History }, // Reduced text
  { href: "/activity-logs", label: "Activities", icon: BarChart3 }, // Reduced text
  { href: "/manage-exercises", label: "Exercises", icon: Dumbbell }, // Reduced text
  { href: "/manage-t-paths", label: "Paths", icon: LayoutTemplate }, // Reduced text
  { href: "/profile", label: "Profile", icon: User }, // Reduced text
];

export function Header() {
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const isScrolled = useScrollPosition();
  const pathname = usePathname(); // Get current pathname

  return (
    <>
      <header className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 sm:static sm:h-auto sm:border-0 sm:px-6",
        "transition-all duration-300 ease-in-out",
        isScrolled ? "bg-background/80 backdrop-blur-md border-b-transparent" : "bg-background border-b"
      )}>
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden">
              <span>
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs">
            <nav className="grid gap-6 text-lg font-medium">
              {mobileNavLinks.map(link => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <WorkoutAwareLink
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-4 px-2.5 py-2 rounded-md transition-colors", // Added py-2, rounded-md
                      isActive ? "bg-action/10 text-action font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted" // Added bg-action/10 for active, hover:bg-muted
                    )}
                  >
                    <Icon className={cn("h-6 w-6", isActive ? "text-action" : "text-muted-foreground")} /> {/* Increased icon size, dynamic color */}
                    {link.label}
                  </WorkoutAwareLink>
                );
              })}
              <hr className="my-2" />
              <WorkoutAwareLink
                href="/workout"
                className={cn(
                  "flex items-center gap-4 px-2.5 py-2 rounded-md transition-colors",
                  pathname === "/workout" ? "bg-action/10 text-action font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Dumbbell className={cn("h-6 w-6", pathname === "/workout" ? "text-action" : "text-muted-foreground")} />
                Workout {/* Reduced text */}
              </WorkoutAwareLink>
              <Button 
                variant="ghost" 
                className="flex items-center gap-4 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted justify-start text-lg font-medium" 
                onClick={() => setIsActivityLogOpen(true)}
              >
                <Plus className="h-6 w-6 text-muted-foreground" /> {/* Increased icon size */}
                Log {/* Reduced text */}
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="relative ml-auto flex flex-1 items-center justify-end gap-2 md:grow-0">
          <RollingStatusBadge />
          <NotificationBell />
          <UserNav />
        </div>
      </header>

      <ActivityLoggingDialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen} />
    </>
  );
}