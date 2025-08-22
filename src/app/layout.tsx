import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SessionContextProvider } from "@/components/session-context-provider";
import { cn } from "@/lib/utils";

// Configure Inter font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Configure Satoshi local font
// IMPORTANT: Ensure you have 'Satoshi-Variable.woff2' in your public/fonts directory.
// You can download Satoshi from its official source or similar font providers.
const satoshi = localFont({
  src: "../../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  display: "swap",
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
          inter.variable,
          satoshi.variable,
          "font-sans antialiased glow-background"
        )}
      >
        <SessionContextProvider>
          {children}
        </SessionContextProvider>
      </body>
    </html>
  );
}