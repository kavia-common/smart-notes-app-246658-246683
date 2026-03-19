"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

// PUBLIC_INTERFACE
export function Textarea({ className, label, id, ...props }: Props) {
  /** Retro textarea with optional label. */
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <label className="block">
      {label ? <div className="mb-1 text-sm retro-title">{label}</div> : null}
      <textarea
        id={inputId}
        {...props}
        className={cn("retro-input font-mono min-h-[220px] resize-y", className)}
      />
    </label>
  );
}
