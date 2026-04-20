"use client";

import { useState } from "react";

import type { AppPage } from "@/lib/auth/authorization";

type PermissionState = Record<
  AppPage,
  {
    canView: boolean;
    canEdit: boolean;
  }
>;

type AccessMatrixPage = {
  id: AppPage;
  label: string;
  path: string;
};

function buildInitialState(
  pages: readonly AccessMatrixPage[],
  defaults?: Partial<Record<AppPage, { canView: boolean; canEdit: boolean }>>,
) {
  return pages.reduce<PermissionState>((accumulator, page) => {
    const current = defaults?.[page.id];
    accumulator[page.id] = {
      canView: current?.canView ?? false,
      canEdit: current?.canEdit ?? false,
    };
    return accumulator;
  }, {} as PermissionState);
}

export function AccessMatrix({
  pages,
  defaults,
}: {
  pages: readonly AccessMatrixPage[];
  defaults?: Partial<Record<AppPage, { canView: boolean; canEdit: boolean }>>;
}) {
  const [permissions, setPermissions] = useState(() => buildInitialState(pages, defaults));

  const setAll = (nextValue: { canView: boolean; canEdit: boolean }) => {
    setPermissions((current) => {
      const nextState = { ...current };

      for (const page of pages) {
        nextState[page.id] = nextValue;
      }

      return nextState;
    });
  };

  const updatePermission = (
    page: AppPage,
    field: "canView" | "canEdit",
    checked: boolean,
  ) => {
    setPermissions((current) => {
      const existing = current[page] ?? { canView: false, canEdit: false };

      if (field === "canEdit") {
        return {
          ...current,
          [page]: {
            canView: checked ? true : existing.canView,
            canEdit: checked,
          },
        };
      }

      return {
        ...current,
        [page]: {
          canView: checked,
          canEdit: checked ? existing.canEdit : false,
        },
      };
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-outline text-xs"
          onClick={() => setAll({ canView: true, canEdit: true })}
        >
          Select all
        </button>
        <button
          type="button"
          className="btn-outline text-xs"
          onClick={() => setAll({ canView: true, canEdit: false })}
        >
          View all
        </button>
        <button
          type="button"
          className="btn-outline text-xs"
          onClick={() => setAll({ canView: false, canEdit: false })}
        >
          Clear all
        </button>
      </div>

      <div className="space-y-3">
        {pages.map((page) => {
          const permission = permissions[page.id] ?? { canView: false, canEdit: false };

          return (
            <div
              key={page.id}
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {page.label}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {page.path}
                </p>
              </div>

              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`perm:${page.id}:view`}
                    checked={permission.canView}
                    onChange={(event) =>
                      updatePermission(page.id, "canView", event.currentTarget.checked)
                    }
                  />
                  View
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`perm:${page.id}:edit`}
                    checked={permission.canEdit}
                    onChange={(event) =>
                      updatePermission(page.id, "canEdit", event.currentTarget.checked)
                    }
                  />
                  Edit
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
