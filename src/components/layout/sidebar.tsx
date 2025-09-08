"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, History, User, BarChart3, Dumbbell, LayoutTemplate, Plus } from "lucide-react"; // Added Plus icon
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WorkoutAwareLink } from "../workout-flow/workout-aware-link"; // Import WorkoutAwareLink
import { ActivityLoggingDialog } from "../activity-logging-dialog"; // Import ActivityLoggingDialog
import { useState } from "react"; // Import useState

const mainNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/workout-history", label: "Workout History", icon: History },
  { href: "/activity-logs", label: "Activity Logs", icon: BarChart3 },
  { href: "/manage-exercises", label: "Manage Exercises", icon: Dumbbell },
  { href: "/manage-t-paths", label: "Manage T-Paths", icon: LayoutTemplate },
  { href: "/profile", label: "My Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false); // State for Activity Log modal

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-2 px-2 sm:py-5"> {/* Reduced gap from 4 to 2 */}
          {mainNavLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Tooltip key={link.href}>
                <TooltipTrigger asChild>
                  <WorkoutAwareLink
                    href={link.href}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors", // Reduced h/w from 9 to 8
                      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>
                      <Icon className="h-4 w-4" /> {/* Reduced h/w from 5 to 4 */}
                      <span className="sr-only">{link.label}</span>
                    </span>
                  </WorkoutAwareLink>
                </TooltipTrigger>
                <TooltipContent side="right">{link.label}</TooltipContent>
              </Tooltip>
            );
          })}
          {/* New "Log Activity" button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                onClick={() => setIsActivityLogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Log Activity</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Log Activity</TooltipContent>
          </Tooltip>
        </nav>
      </aside>
      <ActivityLoggingDialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen} />
    </>
  );
}