"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, User, BarChart3, Dumbbell, LayoutTemplate } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const mainNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/workout-history", label: "Workout History", icon: History },
  { href: "/activity-logs", label: "Activity Logs", icon: BarChart3 },
  { href: "/manage-exercises", label: "Manage Exercises", icon: Dumbbell },
  { href: "/manage-templates", label: "Manage Templates", icon: LayoutTemplate },
  { href: "/profile", label: "My Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  const renderNavLink = (link: { href: string; label: string; icon: React.ElementType }) => {
    const isActive = pathname === link.href;
    const Icon = link.icon;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={link.href}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
              isActive && "bg-accent text-accent-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{link.label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{link.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          {mainNavLinks.map(link => (
            <div key={link.href}>{renderNavLink(link)}</div>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}