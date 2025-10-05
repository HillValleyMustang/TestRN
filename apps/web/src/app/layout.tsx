import type { Metadata } from "next";
import "./globals.css";
import { SessionContextProvider } from "@/components/session-context-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Poppins } from "next/font/google"; // Import Poppins

// Configure Poppins font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans", // Define as CSS variable
});

export const metadata: Metadata = {
  title: "My Workout Tracker",
  description: "Your personalised AI fitness coach.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable}`}><body>
        <SessionContextProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </SessionContextProvider>
      </body></html>
  );
}