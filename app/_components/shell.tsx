"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  FilePlus2,
  FileText,
  Gauge,
  Landmark,
  LogOut,
  ReceiptText,
  ScrollText,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import {
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  useState,
  useTransition,
} from "react";

type CompanyOption = {
  id: string;
  name: string;
};

type ShellLink = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const links: ShellLink[] = [
  { href: "/", label: "Overview", Icon: Gauge },
  { href: "/companies", label: "Companies", Icon: Building2 },
  { href: "/employees", label: "Employees", Icon: Users },
  { href: "/salary", label: "Salary", Icon: WalletCards },
  { href: "/invoices/create", label: "Create Invoice", Icon: FilePlus2 },
  { href: "/invoices", label: "Invoices", Icon: FileText },
  { href: "/cashout", label: "Cashout", Icon: CircleDollarSign },
  { href: "/employee-cash-flow", label: "Employee Cash Flow", Icon: TrendingUp },
  { href: "/employee-statements", label: "Employee Statements", Icon: ScrollText },
  { href: "/expenses", label: "Expenses", Icon: ReceiptText },
  { href: "/dashboard", label: "Dashboard", Icon: BarChart3 },
  { href: "/founders-balance", label: "Founders Balance", Icon: Landmark },
  { href: "/admin/users", label: "Admin", Icon: Shield },
];

function isLinkActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/invoices") {
    return pathname === "/invoices" || pathname.startsWith("/invoices/drafts");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({
  title,
  eyebrow,
  children,
  companyOptions = [],
  activeCompanyId,
  activeCompanyIds,
  companySelectorLabel = "Active company",
  showCompanySelector = true,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  companyOptions?: CompanyOption[];
  activeCompanyId?: string;
  activeCompanyIds?: string[];
  companySelectorLabel?: string;
  showCompanySelector?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const navigateTo = (href: string) => {
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.button !== 0) {
      return;
    }

    if (pathname === href) {
      return;
    }

    event.preventDefault();
    navigateTo(href);
  };

  const persistentSearchFields = [...searchParams.entries()].filter(
    ([name]) => name !== "companyId" && name !== "companyIds",
  );
  const selectedCompanyIds = activeCompanyIds?.length
    ? activeCompanyIds
    : activeCompanyId
      ? [activeCompanyId]
      : companyOptions.map((company) => company.id);
  const selectedCompanyIdSet = new Set(selectedCompanyIds);
  const allCompaniesSelected =
    companyOptions.length > 0 &&
    selectedCompanyIds.length >= companyOptions.length &&
    companyOptions.every((company) => selectedCompanyIdSet.has(company.id));

  const navigateWithCompanyScope = (companyIds: string[]) => {
    const nextParams = new URLSearchParams();
    for (const [name, value] of persistentSearchFields) {
      nextParams.append(name, value);
    }
    const selectedIdSet = new Set(companyIds);
    const nextAllSelected =
      companyOptions.length > 0 &&
      companyIds.length >= companyOptions.length &&
      companyOptions.every((company) => selectedIdSet.has(company.id));
    if (!nextAllSelected) {
      for (const companyId of companyIds) {
        nextParams.append("companyIds", companyId);
      }
    }
    const queryString = nextParams.toString();
    navigateTo(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleAllCompaniesChange = () => {
    navigateWithCompanyScope(companyOptions.map((company) => company.id));
  };

  const handleCompanyScopeChange = (companyId: string, checked: boolean) => {
    const currentIds = allCompaniesSelected
      ? companyOptions.map((company) => company.id)
      : selectedCompanyIds;
    const nextIds = checked
      ? [...new Set([...currentIds, companyId])]
      : currentIds.filter((currentCompanyId) => currentCompanyId !== companyId);
    navigateWithCompanyScope(nextIds.length > 0 ? nextIds : companyOptions.map((company) => company.id));
  };

  const scopedHref = (href: string) => {
    if (!showCompanySelector || href === "/logout") {
      return href;
    }
    const nextParams = new URLSearchParams();
    if (!allCompaniesSelected) {
      for (const companyId of selectedCompanyIds) {
        nextParams.append("companyIds", companyId);
      }
    }
    const queryString = nextParams.toString();
    if (!queryString) {
      return href;
    }
    return `${href}?${nextParams.toString()}`;
  };

  const renderCompanySelector = () =>
    showCompanySelector && companyOptions.length > 0 ? (
      <div className="flex flex-col gap-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        <span>{companySelectorLabel}</span>
        <div
          className="rounded-xl border p-2"
          style={{
            borderColor: "var(--glass-border)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5">
            <input
              type="checkbox"
              checked={allCompaniesSelected}
              onChange={handleAllCompaniesChange}
            />
            <span>All companies</span>
          </label>
          <div className="mt-1 max-h-32 space-y-1 overflow-y-auto pr-1">
            {companyOptions.map((company) => (
              <label key={company.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={allCompaniesSelected || selectedCompanyIdSet.has(company.id)}
                  onChange={(event) => handleCompanyScopeChange(company.id, event.currentTarget.checked)}
                />
                <span className="min-w-0 truncate">{company.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-screen" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="glass-nav sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 flex-col gap-5 p-4 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-gradient)" }}
            >
              <Sparkles className="h-5 w-5 text-white" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-sm font-bold gradient-text tracking-wide">EassyOnboard</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Billing Console
              </p>
            </div>
          </div>

          {renderCompanySelector()}

          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1 text-sm">
            {links.map((link) => {
              const active = isLinkActive(pathname, link.href);
              const href = scopedHref(link.href);
              const isNavigatingToThis = isPending && pendingHref === href;
              const Icon = link.Icon;

              return (
                <Link
                  key={link.href}
                  href={href}
                  onClick={(event) => handleNavClick(event, href)}
                  className="flex h-10 items-center gap-3 rounded-xl px-3 font-medium transition-all"
                  style={{
                    color: active ? "var(--accent-1)" : "var(--text-secondary)",
                    background: active ? "rgba(99, 102, 241, 0.12)" : "transparent",
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                  <span className="min-w-0 flex-1 truncate">{link.label}</span>
                  {isNavigatingToThis ? (
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent-1)" }} />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <a
            href="/logout"
            className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all"
            style={{ color: "var(--text-secondary)" }}
          >
            <LogOut className="h-4 w-4" strokeWidth={2.2} />
            <span>Sign out</span>
          </a>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="glass-nav sticky top-3 z-40 mb-6 flex flex-col gap-4 px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  <Sparkles className="h-5 w-5 text-white" strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-sm font-bold gradient-text tracking-wide">EassyOnboard</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Billing Console
                  </p>
                </div>
              </div>
              <a href="/logout" aria-label="Sign out" style={{ color: "var(--text-secondary)" }}>
                <LogOut className="h-5 w-5" strokeWidth={2.2} />
              </a>
            </div>

            {renderCompanySelector()}

            <nav className="flex gap-2 overflow-x-auto pb-1 text-sm">
              {links.map((link) => {
                const active = isLinkActive(pathname, link.href);
                const href = scopedHref(link.href);
                const Icon = link.Icon;

                return (
                  <Link
                    key={link.href}
                    href={href}
                    onClick={(event) => handleNavClick(event, href)}
                    className="flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 font-medium transition-all"
                    style={{
                      color: active ? "var(--accent-1)" : "var(--text-secondary)",
                      background: active ? "rgba(99, 102, 241, 0.12)" : "transparent",
                    }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </header>

          <div className="flex flex-col gap-6 pb-10">
            <div className="px-1">
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.24em] gradient-text">
                  {eyebrow}
                </p>
              ) : null}
              <h1
                className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h1>
            </div>

            <div className="flex flex-col gap-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
