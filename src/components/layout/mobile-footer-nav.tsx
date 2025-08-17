"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, BookOpen, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/start-workout", label: "Workout", icon: Dumbbell },
  { href: "/manage-exercises", label: "Exercises", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileFooterNav() {
  const pathname = usePathname();

  return (
    <footer className="fixed bottom-0 left-0 z-10 w-full border-t bg-background sm:hidden">
      <nav className="grid h-16 grid-cols-5">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 pt-2 text-xs font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}