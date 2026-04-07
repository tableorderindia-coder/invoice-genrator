import type { Metadata } from "next";
import localFont from "next/font/local";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
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
          {children}
        </div>
      </body>
    </html>
  );
}
