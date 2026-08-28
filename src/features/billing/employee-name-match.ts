// A pure string-normalization helper with no DB/server dependency of its
// own, split out of employee-cash-flow-store.ts on purpose: that file (and
// store.ts) import lib/db/pool.ts (the `pg` client), which cannot be bundled
// for the browser. This function is also used by files that are imported
// from Client Components (e.g. app/employee-statements/_components/
// employee-statement-editor.tsx via employee-statements.ts), so it has to
// live somewhere with zero server-only imports in its module graph.
export function normalizeEmployeeNameForMatch(name: string | null | undefined) {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
