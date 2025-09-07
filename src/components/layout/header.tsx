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
  { href: "/dashboard", label: "Dashboard", icon: Home }, // Reverted to Dashboard
  { href: "/workout-history", label: "History", icon: History },
  { href: "/activity-logs", label: "Activities", icon: BarChart3 },
  { href: "/manage-exercises", label: "Exercises", icon: Dumbbell },
  { href: "/manage-t-paths", label: "Paths", icon: LayoutTemplate },
  { href: "/profile", label: "Profile", icon: User },
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
            <nav className="grid gap-3 text-lg font-medium overflow-y-auto h-full py-4"> {/* Added overflow-y-auto, h-full, py-4, reduced gap */}
              {mobileNavLinks.map(link => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <WorkoutAwareLink
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors", // Adjusted px, py
                      isActive 
                        ? "bg-action text-action-foreground font-semibold shadow-md" // Solid action color, shadow
                        : "text-foreground hover:bg-muted" // Default text, hover effect
                    )}
                  >
                    <Icon className={cn("h-6 w-6", isActive ? "text-action-foreground" : "text-primary")} /> {/* Dynamic icon color */}
                    {link.label}
                  </WorkoutAwareLink>
                );
              })}
              <hr className="my-2" />
              <WorkoutAwareLink
                href="/workout"
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors",
                  pathname === "/workout" 
                    ? "bg-action text-action-foreground font-semibold shadow-md" 
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Dumbbell className={cn("h-6 w-6", pathname === "/workout" ? "text-action-foreground" : "text-primary")} />
                Workout
              </WorkoutAwareLink>
              <Button 
                variant="default" // Changed to default variant
                className="flex items-center gap-4 px-4 py-3 rounded-lg justify-start text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90" // Styled as a primary button
                onClick={() => setIsActivityLogOpen(true)}
              >
                <Plus className="h-6 w-6 text-primary-foreground" />
                Log Activity {/* Full text for clarity on button */}
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