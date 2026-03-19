"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

// PUBLIC_INTERFACE
export function Input({ className, label, id, ...props }: Props) {
  /** Retro input with optional label. */
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <label className="block">
      {label ? <div className="mb-1 text-sm retro-title">{label}</div> : null}
      <input id={inputId} {...props} className={cn("retro-input", className)} />
    </label>
  );
}
