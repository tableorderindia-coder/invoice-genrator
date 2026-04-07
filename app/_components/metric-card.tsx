"use client";

import { useRef, type MouseEvent } from "react";

export function MetricCard({
  label,
  value,
  helper,
  accentColor,
}: {
  label: string;
  value: string;
  helper?: string;
  accentColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 8;
    const rotateX = ((centerY - y) / centerY) * 8;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform =
      "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="glass-card card-3d gradient-border p-5 cursor-pointer"
      style={
        accentColor
          ? ({ "--accent-1": accentColor } as React.CSSProperties)
          : undefined
      }
    >
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p
        className="mt-3 text-3xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-jetbrains-mono), monospace", color: "var(--text-primary)" }}
      >
        {value}
      </p>
      {helper && (
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {helper}
        </p>
      )}
    </div>
  );
}
