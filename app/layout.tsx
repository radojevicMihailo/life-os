import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { PomodoroProvider } from "@/lib/pomodoro/context";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life OS",
  description: "Personal life tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <PomodoroProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 p-6 md:p-8">{children}</main>
            </div>
            <Toaster richColors position="top-right" />
            <KeyboardShortcuts />
          </PomodoroProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
