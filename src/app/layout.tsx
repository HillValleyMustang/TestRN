import type { Metadata } from "next";
import "./globals.css";
import { SessionContextProvider } from "@/components/session-context-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "My Workout Tracker",
  description: "Your personalised AI fitness coach.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionContextProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </SessionContextProvider>
      </body>
    </html>
  );
}