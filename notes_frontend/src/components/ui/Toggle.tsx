"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
};

// PUBLIC_INTERFACE
export function Toggle({ label, checked, onChange, description }: Props) {
  /** Retro toggle switch with label + optional description. */
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="retro-title text-sm">{label}</div>
        {description ? <div className="mt-1 text-xs retro-muted">{description}</div> : null}
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "h-9 w-16 rounded-full border-2 flex items-center px-1 transition-colors",
          "border-[var(--border)]",
          checked ? "bg-[color-mix(in_srgb,var(--accent-2)_35%,var(--surface))]" : "bg-[var(--surface)]",
        )}
      >
        <span
          className={cn(
            "h-7 w-7 rounded-full border-2 transition-transform",
            "border-[var(--border)] bg-[var(--surface)]",
            checked ? "translate-x-7" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
