import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { PomodoroProvider } from "@/lib/pomodoro/context";
import { ThemeProvider } from "@/components/theme-provider";

export const dynamic = "force-dynamic";

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
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <PomodoroProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <MobileNav />
                <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
              </div>
            </div>
            <Toaster richColors position="top-right" />
            <KeyboardShortcuts />
          </PomodoroProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
