import { FinancePrivacyProvider } from "@/modules/finance/ui/components/finance-privacy";
import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { PomodoroProvider } from "@/lib/pomodoro/context";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { AppearanceProvider } from "@/components/appearance-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Life OS",
  description: "Personal life tracker",
  appleWebApp: { capable: true, title: "Life OS", statusBarStyle: "default" },
  applicationName: "Life OS",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sr-Latn"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <PomodoroProvider>
            <FinancePrivacyProvider>
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  <MobileNav />
                  <main id="main-content" className="mx-auto w-full max-w-[1660px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28 md:pb-6 lg:p-8">{children}</main>
                </div>
              </div>
              <Toaster richColors position="top-right" />
              <KeyboardShortcuts />
              <CommandPalette />
              <MobileBottomNav />
              <AppearanceProvider />
            </FinancePrivacyProvider>
          </PomodoroProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
