import type { Metadata } from "next";
import localFont from "next/font/local";
import NextTopLoader from "nextjs-toploader";
import { cookies } from "next/headers";
import {
  normalizePortalUiMode,
  PORTAL_UI_MODE_COOKIE,
} from "@/src/features/ui/portal-ui-mode";
import {
  normalizeSidebarCollapsed,
  SIDEBAR_COLLAPSED_COOKIE,
} from "@/src/features/ui/sidebar-preference";
import { SidebarPreferenceProvider } from "./_components/sidebar-preference-provider";
import "./globals.css";

const inter = localFont({
  src: "../assets/fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "EassyOnboard Billing Console",
  description:
    "Monthly staffing invoice generation, cash-out tracking, and realized profit dashboard.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const uiMode = normalizePortalUiMode(cookieStore.get(PORTAL_UI_MODE_COOKIE)?.value);
  const sidebarCollapsed = normalizeSidebarCollapsed(
    cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value,
  );

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      data-ui-mode={uiMode}
      data-sidebar-collapsed={sidebarCollapsed}
    >
      <body className="min-h-full flex flex-col relative overflow-x-hidden">
        {/* Animated background orbs */}
        <div aria-hidden="true">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </div>

        {/* 3D floating shapes */}
        <div className="floating-shapes" aria-hidden="true">
          <div className="floating-shape shape-cube" />
          <div className="floating-shape shape-diamond" />
          <div className="floating-shape shape-ring" />
          <div className="floating-shape shape-dot" style={{ top: '20%', left: '15%', animationDelay: '-3s' }} />
          <div className="floating-shape shape-dot" style={{ top: '70%', right: '20%', animationDelay: '-9s' }} />
          <div className="floating-shape shape-dot" style={{ top: '45%', left: '60%', animationDelay: '-12s' }} />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col">
          <NextTopLoader
             color="var(--accent-1)"
             shadow="0 0 10px var(--accent-1),0 0 5px var(--accent-1)"
             showSpinner={false}
             speed={200}
             height={3}
             crawl={true}
             showAtBottom={false}
          />
          <SidebarPreferenceProvider initialCollapsed={sidebarCollapsed}>
            {children}
          </SidebarPreferenceProvider>
        </div>
      </body>
    </html>
  );
}
