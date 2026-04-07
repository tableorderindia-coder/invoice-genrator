import type { ReactNode } from "react";

export function GlassPanel({
  title,
  eyebrow,
  children,
  className = "",
  gradient = false,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  gradient?: boolean;
}) {
  return (
    <div className={`glass-panel p-6 ${gradient ? "gradient-border" : ""} ${className}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] gradient-text">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className={`${eyebrow ? "mt-1" : ""} text-xl font-semibold`} style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
      )}
      {(title || eyebrow) ? <div className="mt-5">{children}</div> : children}
    </div>
  );
}
