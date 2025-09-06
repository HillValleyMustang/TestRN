import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileFooterNav } from "@/components/layout/mobile-footer-nav";
import { WorkoutNavigationProvider } from "@/components/workout-flow/workout-aware-link"; // Import the provider
import { useWorkoutFlowManager } from "@/hooks/use-workout-flow-manager"; // Import the hook
import { useRouter } from "next/navigation"; // Import useRouter

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const workoutFlowManager = useWorkoutFlowManager({ router }); // Initialize the manager

  // This function will be passed to the provider
  const handleNavigationAttempt = (path: string): boolean => {
    if (workoutFlowManager.isWorkoutActive) {
      // If a workout is active, we need to prompt the user.
      // The actual dialog logic is handled in workout/page.tsx
      // Here, we just indicate that navigation should be blocked.
      return true; 
    }
    return false; // Allow navigation
  };

  return (
    <WorkoutNavigationProvider handleNavigationAttempt={handleNavigationAttempt}>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <Sidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <Header />
          <main className="flex-1 p-2 sm:px-4 sm:py-0 pb-20 sm:pb-2">{children}</main>
        </div>
        <MobileFooterNav />
      </div>
    </WorkoutNavigationProvider>
  );
}