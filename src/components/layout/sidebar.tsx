"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // Import useRouter
import { Home, History, User, BarChart3, Dumbbell, LayoutTemplate } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  const router = useRouter(); // Initialize useRouter

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        {mainNavLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Tooltip key={link.href}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => router.push(link.href)} // Use router.push for navigation
                >
                  {/* Re-added span wrapper for content */}
                  <span>
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{link.label}</span>
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{link.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}