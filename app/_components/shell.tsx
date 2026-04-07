"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/companies",
    label: "Companies",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
      </svg>
    ),
  },
  {
    href: "/employees",
    label: "Employees",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export function Shell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
        {/* Floating glassmorphic navigation */}
        <header className="glass-nav sticky top-4 z-50 px-5 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Logo + title */}
            <div className="flex items-center gap-4">
              {/* Logo mark */}
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "var(--accent-gradient)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold gradient-text tracking-wide">
                  EassyOnboard
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Billing Console
                </p>
              </div>
            </div>

            {/* Navigation pills */}
            <nav className="flex flex-wrap gap-1.5 text-sm">
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-xl px-3.5 py-2 font-medium transition-all"
                    style={{
                      color: isActive ? "var(--accent-1)" : "var(--text-secondary)",
                      background: isActive ? "rgba(99, 102, 241, 0.1)" : "transparent",
                      borderBottom: isActive ? "2px solid var(--accent-1)" : "2px solid transparent",
                    }}
                  >
                    {link.icon}
                    <span className="hidden sm:inline">{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Page header */}
        <div className="px-1">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] gradient-text">
              {eyebrow}
            </p>
          )}
          <h1
            className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h1>
        </div>

        {/* Page content */}
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
