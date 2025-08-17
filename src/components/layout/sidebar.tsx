"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, LayoutTemplate, History, User, BarChart3, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ActivityLoggingDialog } from "@/components/activity-logging-dialog";
import { ManageExercisesDialog } from "@/components/manage-exercises-dialog";
import { ManageWorkoutTemplatesDialog } from "@/components/manage-workout-templates-dialog";
import { cn } from "@/lib/utils";

const mainNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workout-history", label: "Workout History", icon: History },
  { href: "/activity-logs", label: "Activity Logs", icon: BarChart3 },
  { href: "/profile", label: "My Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  const renderNavLink = (link: { href: string; label: string; icon: React.ElementType }, isMobile: boolean) => {
    const isActive = pathname === link.href;
    const Icon = link.icon;
    const linkContent = (
      <Link
        href={link.href}
        className={cn(
          "flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
          isActive && "bg-accent text-primary",
          isMobile ? "text-lg" : "justify-center"
        )}
      >
        <Icon className="h-5 w-5" />
        <span className={cn(!isMobile && "sr-only")}>{link.label}</span>
      </Link>
    );

    if (isMobile) {
      return linkContent;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{link.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          {mainNavLinks.map(link => (
            <div key={link.href}>{renderNavLink(link, false)}</div>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <ActivityLoggingDialog />
          <ManageExercisesDialog />
          <ManageWorkoutTemplatesDialog />
        </nav>
      </aside>
    </TooltipProvider>
  );
}