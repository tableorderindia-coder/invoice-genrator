import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="glass-card rounded-3xl p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] gradient-text">
            Access Denied
          </p>
          <h1
            className="mt-3 text-3xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            You do not have permission for this page
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Ask an admin to grant the page permission you need.
          </p>

          <div className="mt-6 flex gap-3">
            <Link href="/" className="gradient-btn">
              Back to app
            </Link>
            <Link href="/logout" className="btn-outline">
              Sign out
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
