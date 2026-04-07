import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/companies", label: "Companies" },
  { href: "/employees", label: "Employees" },
  { href: "/invoices", label: "Invoices" },
  { href: "/dashboard", label: "Dashboard" },
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
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f4ea_0%,#f1eee3_28%,#fcfbf7_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
        <header className="rounded-[28px] border border-black/5 bg-white/90 px-6 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
                {title}
              </h1>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
