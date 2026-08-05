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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ScrollText,
  Shield,
  Sparkles,
  SunMedium,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  type ComponentType,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  parseFinancialYear,
  type FinancialYearSelection,
} from "@/src/features/billing/filter-selection";
import {
  buildPortalUiModeCookie,
  normalizePortalUiMode,
  oppositePortalUiMode,
  type PortalUiMode,
} from "@/src/features/ui/portal-ui-mode";
import { useSidebarPreference } from "./sidebar-preference-provider";
import { UnsavedChangesGuard } from "./unsaved-changes-guard";

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

export function buildCompanyScopeHref({
  pathname,
  persistentSearchFields,
  companyOptions,
  companyIds,
}: {
  pathname: string;
  persistentSearchFields: Array<[string, string]>;
  companyOptions: CompanyOption[];
  companyIds: string[];
}) {
  const nextParams = new URLSearchParams();
  for (const [name, value] of persistentSearchFields) {
    if (name !== "companyId" && name !== "companyIds") {
      nextParams.append(name, value);
    }
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
  return queryString ? `${pathname}?${queryString}` : pathname;
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
  financialYearOptions = [],
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  companyOptions?: CompanyOption[];
  activeCompanyId?: string;
  activeCompanyIds?: string[];
  companySelectorLabel?: string;
  showCompanySelector?: boolean;
  financialYearOptions?: Array<Pick<FinancialYearSelection, "value" | "label">>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const mobileSidebarTriggerRef = useRef<HTMLButtonElement>(null);
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const companyPopoverRef = useRef<HTMLDivElement>(null);
  const companyPopoverTriggerRef = useRef<HTMLButtonElement>(null);
  const [sidebarTooltip, setSidebarTooltip] = useState<{
    label: string;
    left: number;
    top: number;
  } | null>(null);
  const { collapsed: sidebarCollapsed, toggleCollapsed } = useSidebarPreference();
  const [uiMode, setUiMode] = useState<PortalUiMode>(() =>
    typeof document === "undefined"
      ? "saas"
      : normalizePortalUiMode(document.documentElement.dataset.uiMode),
  );
  const selectedFinancialYear = parseFinancialYear(
    searchParams.get("financialYear") ?? undefined,
    financialYearOptions,
  );

  const toggleUiMode = () => {
    const beforeSwitch = new CustomEvent("eassyonboard:before-ui-switch", {
      cancelable: true,
    });
    if (!window.dispatchEvent(beforeSwitch)) return;
    const nextMode = oppositePortalUiMode(uiMode);
    setMobileSidebarOpen(false);
    setCompanyPopoverOpen(false);
    setCompanyDropdownOpen(false);
    document.cookie = buildPortalUiModeCookie(nextMode);
    document.documentElement.dataset.uiMode = nextMode;
    setUiMode(nextMode);
    window.location.reload();
  };

  const renderUiModeButton = (compact = false) => (
    <button
      type="button"
      className={compact ? "ui-mode-toggle ui-mode-toggle-compact" : "ui-mode-toggle"}
      onClick={toggleUiMode}
      aria-label={`Switch to ${uiMode === "saas" ? "Legacy" : "New"} UI`}
      title={`Switch to ${uiMode === "saas" ? "Legacy" : "New"} UI`}
    >
      <SunMedium className="h-4 w-4 shrink-0" strokeWidth={2.2} />
      {compact ? null : <span>{uiMode === "saas" ? "Legacy UI" : "New UI"}</span>}
    </button>
  );

  const canLeaveCurrentView = () =>
    window.dispatchEvent(
      new CustomEvent("eassyonboard:before-navigation", { cancelable: true }),
    );

  useEffect(() => {
    if (!companyPopoverOpen) return;
    const close = (restoreFocus = false) => {
      setCompanyPopoverOpen(false);
      if (restoreFocus) companyPopoverTriggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !companyPopoverRef.current?.contains(target) &&
        !companyPopoverTriggerRef.current?.contains(target)
      ) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [companyPopoverOpen]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector =
      'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirstControl = window.setTimeout(() => {
      mobileSidebarRef.current
        ?.querySelector<HTMLElement>(focusableSelector)
        ?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileSidebarOpen(false);
        mobileSidebarTriggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...(mobileSidebarRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusFirstControl);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileSidebarOpen]);

  const navigateTo = (href: string) => {
    if (!canLeaveCurrentView()) return;
    setMobileSidebarOpen(false);
    setCompanyPopoverOpen(false);
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
    if (!canLeaveCurrentView()) return;
    const href = buildCompanyScopeHref({
      pathname,
      persistentSearchFields,
      companyOptions,
      companyIds,
    });
    setMobileSidebarOpen(false);
    setCompanyPopoverOpen(false);
    setCompanyDropdownOpen(false);
    setPendingHref(href);
    window.location.assign(href);
  };

  const navigateWithFinancialYear = (financialYear: string) => {
    if (!canLeaveCurrentView()) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("financialYear", financialYear);
    setMobileSidebarOpen(false);
    setCompanyPopoverOpen(false);
    setCompanyDropdownOpen(false);
    window.location.assign(`${pathname}?${params.toString()}`);
  };

  const handleCompanyScopeToggle = (companyId: string) => {
    const current = new Set(selectedCompanyIds);
    if (current.has(companyId)) {
      current.delete(companyId);
    } else {
      current.add(companyId);
    }
    const next = companyOptions
      .map((company) => company.id)
      .filter((id) => current.has(id));
    navigateWithCompanyScope(next.length > 0 ? next : companyOptions.map((company) => company.id));
  };

  const selectedCompanyLabel = allCompaniesSelected
    ? "All companies"
    : selectedCompanyIds.length === 1
      ? companyOptions.find((company) => company.id === selectedCompanyIds[0])?.name ?? "1 company"
      : `${selectedCompanyIds.length} companies`;

  const scopedHref = (href: string) => {
    if (!showCompanySelector || href === "/logout") {
      return href;
    }
    const nextParams = new URLSearchParams();
    const financialYearParam = searchParams.get("financialYear");
    if (financialYearParam) {
      nextParams.set("financialYear", financialYearParam);
    }
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
      <div className="flex flex-col gap-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        {financialYearOptions.length > 0 ? (
          <label className="flex flex-col gap-2">
            Financial year
            <select
              value={selectedFinancialYear.value}
              onChange={(event) => navigateWithFinancialYear(event.currentTarget.value)}
              className="h-10 w-full rounded-xl border px-3 text-sm font-medium outline-none transition"
              style={{
                borderColor: "var(--glass-border)",
                background: "var(--surface-subtle)",
                color: "var(--text-primary)",
              }}
            >
              {financialYearOptions.map((financialYear) => (
                <option key={financialYear.value} value={financialYear.value}>
                  {financialYear.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex flex-col gap-2">
          <span>{companySelectorLabel}</span>
          <button
            type="button"
            aria-label={selectedCompanyLabel}
            aria-expanded={companyDropdownOpen}
            onClick={() => setCompanyDropdownOpen((current) => !current)}
            className="h-10 w-full rounded-xl border px-3 text-left text-sm font-medium outline-none transition"
            style={{
              borderColor: "var(--glass-border)",
              background: "var(--surface-subtle)",
              color: "var(--text-primary)",
            }}
          >
            <span>{selectedCompanyLabel}</span>
          </button>
          {companyDropdownOpen ? (
            <div
              role="group"
              aria-label={companySelectorLabel}
              className="flex flex-col gap-2 rounded-xl border p-2"
              style={{
                borderColor: "var(--glass-border)",
                background: "var(--surface-subtle)",
              }}
            >
              <label className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={allCompaniesSelected}
                  onChange={() => navigateWithCompanyScope(companyOptions.map((company) => company.id))}
                />
                <span>All companies</span>
              </label>
              {companyOptions.map((company) => (
                <label key={company.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={selectedCompanyIdSet.has(company.id)}
                    onChange={() => handleCompanyScopeToggle(company.id)}
                  />
                  <span className="min-w-0 truncate">{company.name}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    ) : null;

  const showSidebarTooltip = (element: HTMLElement, label: string) => {
    const bounds = element.getBoundingClientRect();
    setSidebarTooltip({
      label,
      left: bounds.right + 10,
      top: bounds.top + bounds.height / 2,
    });
  };

  const tooltipEvents = (label: string, enabled: boolean) => ({
    onMouseEnter: (event: MouseEvent<HTMLElement>) => {
      if (enabled) showSidebarTooltip(event.currentTarget, label);
    },
    onMouseLeave: () => setSidebarTooltip(null),
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (enabled) showSidebarTooltip(event.currentTarget, label);
    },
    onBlur: () => setSidebarTooltip(null),
  });

  const overviewHref = scopedHref("/");

  const renderSaasBrand = (compact: boolean) => (
    <Link
      href={overviewHref}
      prefetch={false}
      aria-label="EassyOnboard Overview"
      data-navigation-guarded
      className="sidebar-brand sidebar-icon-target"
      onClick={(event) => handleNavClick(event, overviewHref)}
      {...tooltipEvents("EassyOnboard Overview", compact)}
    >
      <span className="sidebar-brand-mark">
        <ReceiptText className="size-5 text-white" strokeWidth={2.2} />
      </span>
      <span className="sidebar-label sidebar-brand-copy">
        <strong>EassyOnboard</strong>
        <small>Billing Console</small>
      </span>
    </Link>
  );

  const renderSaasNavigation = (compact: boolean) => (
    <nav className="sidebar-navigation" aria-label="Portal navigation links">
      {links.map((link) => {
        const active = isLinkActive(pathname, link.href);
        const href = scopedHref(link.href);
        const isNavigatingToThis = isPending && pendingHref === href;
        const Icon = link.Icon;
        return (
          <Link
            key={link.href}
            href={href}
            prefetch={false}
            aria-label={link.label}
            aria-current={active ? "page" : undefined}
            data-navigation-guarded
            onClick={(event) => handleNavClick(event, href)}
            className={`sidebar-nav-link sidebar-icon-target ${active ? "is-active" : ""}`}
            {...tooltipEvents(link.label, compact)}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2.2} />
            <span className="sidebar-label">{link.label}</span>
            {isNavigatingToThis ? <span className="sidebar-pending-dot" /> : null}
          </Link>
        );
      })}
    </nav>
  );

  const renderSaasSidebarContents = ({ drawer = false }: { drawer?: boolean } = {}) => {
    const compact = !drawer && sidebarCollapsed;
    const switchLabel = `Switch to ${uiMode === "saas" ? "Legacy" : "New"} UI`;
    return (
      <>
        <div className="sidebar-brand-row">
          {renderSaasBrand(compact)}
          {drawer ? (
            <button
              type="button"
              className="sidebar-close-button"
              aria-label="Close navigation sidebar"
              onClick={() => {
                setMobileSidebarOpen(false);
                mobileSidebarTriggerRef.current?.focus();
              }}
            >
              <X className="size-5" strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              className="sidebar-collapse-button"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Minimize sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Minimize sidebar"}
              onClick={() => {
                setCompanyPopoverOpen(false);
                setSidebarTooltip(null);
                toggleCollapsed();
              }}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4" strokeWidth={2.2} />
              ) : (
                <PanelLeftClose className="size-4" strokeWidth={2.2} />
              )}
            </button>
          )}
        </div>

        {showCompanySelector && companyOptions.length > 0 ? (
          compact ? (
            <div className="sidebar-company-rail-control">
              <button
                ref={companyPopoverTriggerRef}
                type="button"
                className="sidebar-nav-link sidebar-icon-target"
                aria-label="Change active company"
                aria-expanded={companyPopoverOpen}
                onClick={() => {
                  setSidebarTooltip(null);
                  setCompanyPopoverOpen((current) => !current);
                }}
                {...tooltipEvents("Change active company", compact)}
              >
                <Building2 className="size-4" strokeWidth={2.2} />
              </button>
              {companyPopoverOpen ? (
                <div
                  ref={companyPopoverRef}
                  role="dialog"
                  aria-label="Choose active company"
                  className="sidebar-company-popover"
                >
                  {renderCompanySelector()}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="sidebar-company-expanded">{renderCompanySelector()}</div>
          )
        ) : null}

        {renderSaasNavigation(compact)}

        <div className="sidebar-footer-actions">
          <button
            type="button"
            className="sidebar-footer-action sidebar-icon-target"
            aria-label={switchLabel}
            onClick={toggleUiMode}
            {...tooltipEvents(switchLabel, compact)}
          >
            <SunMedium className="size-4 shrink-0" strokeWidth={2.2} />
            <span className="sidebar-label">Legacy UI</span>
          </button>
          <a
            href="/logout"
            aria-label="Sign out"
            className="sidebar-footer-action sidebar-icon-target"
            {...tooltipEvents("Sign out", compact)}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={2.2} />
            <span className="sidebar-label">Sign out</span>
          </a>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--text-primary)" }}>
      <UnsavedChangesGuard />
      <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        {uiMode === "saas" ? (
          <aside
            data-testid="desktop-sidebar"
            className={`glass-nav saas-portal-sidebar sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col lg:flex ${sidebarCollapsed ? "is-collapsed" : ""}`}
          >
            {renderSaasSidebarContents()}
          </aside>
        ) : (
          <aside className="glass-nav sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 flex-col gap-5 p-4 lg:flex">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--accent-gradient)" }}>
                <Sparkles className="h-5 w-5 text-white" strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-sm font-bold gradient-text tracking-wide">EassyOnboard</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Billing Console</p>
              </div>
            </div>
            {renderCompanySelector()}
            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1 text-sm">
              {links.map((link) => {
                const active = isLinkActive(pathname, link.href);
                const href = scopedHref(link.href);
                const Icon = link.Icon;
                return (
                  <Link key={link.href} href={href} prefetch={false} data-navigation-guarded onClick={(event) => handleNavClick(event, href)} className="flex h-10 items-center gap-3 rounded-xl px-3 font-medium transition-all" style={{ color: active ? "var(--accent-1)" : "var(--text-secondary)", background: active ? "rgba(99, 102, 241, 0.12)" : "transparent" }}>
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                    <span className="min-w-0 flex-1 truncate">{link.label}</span>
                  </Link>
                );
              })}
            </nav>
            {renderUiModeButton()}
            <a href="/logout" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all" style={{ color: "var(--text-secondary)" }}>
              <LogOut className="h-4 w-4" strokeWidth={2.2} /><span>Sign out</span>
            </a>
          </aside>
        )}

        <main className="min-w-0 flex-1">
          {uiMode === "saas" ? (
            <header className="glass-nav saas-mobile-header mb-6 flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
              {renderSaasBrand(false)}
              <button
                ref={mobileSidebarTriggerRef}
                type="button"
                className="btn-outline flex size-9 items-center justify-center p-0"
                aria-label="Open navigation sidebar"
                aria-expanded={mobileSidebarOpen}
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="size-5" strokeWidth={2.2} />
              </button>
            </header>
          ) : (
            <header className="glass-nav relative mb-6 flex flex-col gap-4 px-4 py-3 lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-gradient)" }}>
                    <Sparkles className="h-5 w-5 text-white" strokeWidth={2.4} />
                  </div>
                  <div>
                    <p className="text-sm font-bold gradient-text tracking-wide">EassyOnboard</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Billing Console</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {renderUiModeButton(true)}
                  <a href="/logout" aria-label="Sign out" style={{ color: "var(--text-secondary)" }}><LogOut className="h-5 w-5" strokeWidth={2.2} /></a>
                </div>
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
                    prefetch={false}
                    data-navigation-guarded
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
          )}

          {uiMode === "saas" && mobileSidebarOpen ? (
            <div className="mobile-sidebar-layer lg:hidden">
              <button
                type="button"
                className="mobile-sidebar-backdrop"
                aria-label="Close navigation sidebar"
                onClick={() => {
                  setMobileSidebarOpen(false);
                  mobileSidebarTriggerRef.current?.focus();
                }}
              />
              <aside
                ref={mobileSidebarRef}
                role="dialog"
                aria-modal="true"
                aria-label="Portal navigation"
                className="glass-nav mobile-sidebar-drawer"
              >
                {renderSaasSidebarContents({ drawer: true })}
              </aside>
            </div>
          ) : null}

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
      {sidebarTooltip ? (
        <div
          role="tooltip"
          className="sidebar-floating-tooltip"
          style={{ left: sidebarTooltip.left, top: sidebarTooltip.top }}
        >
          {sidebarTooltip.label}
        </div>
      ) : null}
    </div>
  );
}
