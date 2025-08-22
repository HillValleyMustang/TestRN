import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { SessionContextProvider } from "@/components/session-context-provider";
import { cn } from "@/lib/utils";

// Configure Poppins font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"], // Include all weights for flexibility
  variable: "--font-sans", // Use --font-sans for Poppins
});

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
      <body
        className={cn(
          poppins.variable, // Use poppins variable
          "font-sans antialiased" // Removed glow-background class
        )}
      >
        <SessionContextProvider>
          {children}
        </SessionContextProvider>
      </body>
    </html>
  );
}