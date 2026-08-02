"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { buildSidebarCollapsedCookie } from "@/src/features/ui/sidebar-preference";

type SidebarPreferenceContextValue = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
};

const SidebarPreferenceContext = createContext<SidebarPreferenceContextValue>({
  collapsed: false,
  setCollapsed: () => undefined,
  toggleCollapsed: () => undefined,
});

export function SidebarPreferenceProvider({
  initialCollapsed,
  children,
}: {
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsedState] = useState(initialCollapsed);

  const setCollapsed = useCallback((nextCollapsed: boolean) => {
    document.cookie = buildSidebarCollapsedCookie(nextCollapsed);
    document.documentElement.dataset.sidebarCollapsed = String(nextCollapsed);
    setCollapsedState(nextCollapsed);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((current) => {
      const nextCollapsed = !current;
      document.cookie = buildSidebarCollapsedCookie(nextCollapsed);
      document.documentElement.dataset.sidebarCollapsed = String(nextCollapsed);
      return nextCollapsed;
    });
  }, []);

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggleCollapsed }),
    [collapsed, setCollapsed, toggleCollapsed],
  );

  return (
    <SidebarPreferenceContext.Provider value={value}>
      {children}
    </SidebarPreferenceContext.Provider>
  );
}

export function useSidebarPreference() {
  return useContext(SidebarPreferenceContext);
}
