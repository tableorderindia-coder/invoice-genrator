export default function AppLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <div
        className="glass-card flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-solid border-white/20 border-t-indigo-400"
          aria-hidden="true"
        />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Loading...
        </p>
      </div>
    </main>
  );
}
